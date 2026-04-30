firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const docRef = db.collection("tracker").doc("data");

let streamers = [];
let support = {};
let notes = {};

async function loadFromGitHub() {
    const snap = await docRef.get();

    if (!snap.exists) {
        streamers = [];
        support = {};
        notes = {};
        await docRef.set({ streamers, support, notes });
    } else {
        const data = snap.data();
        streamers = data.streamers || [];
        support = data.support || {};
        notes = data.notes || {};
    }

    ensureStructure();
    renderAll();
}

async function saveToGitHub() {
    ensureStructure();
    await docRef.set({ streamers, support, notes }, { merge: true });
    alert("Gespeichert! Alle HRX‑Leute sehen jetzt deinen Stand.");
}

function ensureStructure() {
    streamers.forEach(from => {
        support[from] = support[from] || {};
        notes[from] = notes[from] || "";
        streamers.forEach(to => {
            if (from !== to) {
                if (support[from][to] == null) support[from][to] = 0;
            }
        });
    });
}

function addStreamer() {
    const input = document.getElementById("newStreamer");
    const name = input.value.trim();
    if (!name || streamers.includes(name)) return;

    streamers.push(name);
    ensureStructure();
    renderAll();
    input.value = "";
}

function increment(from, to) {
    support[from][to]++;
    renderAll();
}

function renderTable() {
    const table = document.getElementById("supportTable");
    table.innerHTML = "";

    if (streamers.length === 0) {
        table.innerHTML = "<tr><td>Keine Streamer eingetragen.</td></tr>";
        return;
    }

    // Kopfzeile mit THEAD
    let header = "<thead><tr><th>Von \\ Zu</th>";
    streamers.forEach(s => header += `<th>${s}</th>`);
    header += "<th>Notiz</th></tr></thead>";

    // Tabellenkörper sammeln
    let body = "<tbody>";

    streamers.forEach(from => {
        let row = `<tr><th>${from}</th>`;
        streamers.forEach(to => {
            if (from === to) {
                row += `<td style="opacity:0.2;">—</td>`;
            } else {
                const val = support[from][to] || 0;
                row += `
                    <td>
                        <button onclick="increment('${from}','${to}')">+</button>
                        <div>${val}</div>
                    </td>`;
            }
        });

        row += `
            <td>
                <textarea 
                    oninput="updateNote('${from}', this.value)"
                    placeholder="Notiz…"
                    style="width:120px; height:60px;"
                >${notes[from] || ""}</textarea>
            </td>
        </tr>`;

        body += row;
    });

    body += "</tbody>";

    table.innerHTML = header + body;
}

function renderQuickInput() {
    const fromSel = document.getElementById("fromSelect");
    const toSel = document.getElementById("toSelect");

    fromSel.innerHTML = "";
    toSel.innerHTML = "";

    streamers.forEach(name => {
        const opt1 = document.createElement("option");
        opt1.value = name;
        opt1.textContent = name;
        fromSel.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = name;
        opt2.textContent = name;
        toSel.appendChild(opt2);
    });
}

function getTotals() {
    const totals = {};
    streamers.forEach(s => totals[s] = 0);
    streamers.forEach(from => {
        streamers.forEach(to => {
            if (from !== to) {
                totals[from] += support[from][to] || 0;
            }
        });
    });
    return totals;
}

function renderRanking() {
    const container = document.getElementById("rankingList");
    const chart = document.getElementById("chart");
    container.innerHTML = "";
    chart.innerHTML = "";

    const totals = getTotals();
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    sorted.forEach(([name, score], index) => {
        const div = document.createElement("div");
        div.className = "ranking-item";
        div.innerHTML = `
            <div class="ranking-name">#${index + 1} ${name}</div>
            <div class="ranking-score">${score} Supports</div>
        `;
        container.appendChild(div);
    });

    const max = Math.max(...sorted.map(([_, v]) => v), 1);
    sorted.forEach(([name, score]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar";

        const label = document.createElement("div");
        label.className = "chart-label";
        label.textContent = name;

        const track = document.createElement("div");
        track.className = "chart-track";

        const fill = document.createElement("div");
        fill.className = "chart-fill";
        fill.style.width = (score / max * 100) + "%";

        const value = document.createElement("div");
        value.className = "chart-value";
        value.textContent = score;

        track.appendChild(fill);
        bar.appendChild(label);
        bar.appendChild(track);
        bar.appendChild(value);
        chart.appendChild(bar);
    });
}

function renderAll() {
    renderTable();
    renderRanking();
    renderQuickInput();
}

function setupTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const tabs = document.querySelectorAll(".tab");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;
            buttons.forEach(b => b.classList.remove("active"));
            tabs.forEach(t => t.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(target).classList.add("active");
        });
    });
}

setupTabs();
loadFromGitHub();

function downloadBackup() {
    docRef.get().then(doc => {
        if (!doc.exists) {
            alert("Keine Daten gefunden.");
            return;
        }

        const data = doc.data();
        const json = JSON.stringify(data, null, 2);

        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "support-tracker-backup.json";
        a.click();

        URL.revokeObjectURL(url);
    }).catch(err => {
        console.error("Backup-Fehler:", err);
        alert("Fehler beim Backup. Details in der Konsole.");
    });
}

function downloadCSV() {
    docRef.get().then(doc => {
        if (!doc.exists) {
            alert("Keine Daten gefunden.");
            return;
        }

        const data = doc.data();
        const streamers = data.streamers || [];
        const support = data.support || {};

        // Kopfzeile
        let csv = "Supporter," + streamers.join(",") + "\n";

        // Für jeden Supporter eine Zeile
        streamers.forEach(supporter => {
            const rowData = [];
            const rowSupport = support[supporter] || {};

            streamers.forEach(target => {
                const value = rowSupport[target] != null ? rowSupport[target] : 0;
                rowData.push(value);
            });

            csv += supporter + "," + rowData.join(",") + "\n";
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "support-tracker-export.csv";
        a.click();

        URL.revokeObjectURL(url);
    }).catch(err => {
        console.error("CSV-Export-Fehler:", err);
        alert("Fehler beim CSV-Export. Details in der Konsole.");
    });
}

function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = () => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);

                const ok = confirm(
                    "Willst du wirklich importieren?\n\n" +
                    "Die aktuellen Firebase-Daten werden überschrieben.\n" +
                    "Bitte stelle sicher, dass du vorher ein Backup gemacht hast."
                );

                if (!ok) return;

                docRef.set(imported).then(() => {
                    alert("Import erfolgreich! Seite lädt neu.");
                    location.reload();
                });

            } catch (err) {
                alert("Fehler: Datei ist keine gültige JSON.");
                console.error(err);
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function updateNote(name, text) {
    notes[name] = text;
}

function quickAdd() {
    const from = document.getElementById("fromSelect").value;
    const to = document.getElementById("toSelect").value;

    if (from === to) {
        alert("Ein Streamer kann nicht sich selbst supporten.");
        return;
    }

    support[from][to]++;
    renderAll();
}
