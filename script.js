let streamers = [
    "RoninMartoku",
    "Letz_Zock",
    "Kernölmediziner",
    "Nikki-Lilith",
    "Nana",
    "RaphXlive",
    "Ramona",
    "Nudlaug",
    "Linkderstinkt"
];
let support = {};

function save() {
    localStorage.setItem("streamers", JSON.stringify(streamers));
    localStorage.setItem("support", JSON.stringify(support));
}

function ensureStructure() {
    streamers.forEach(from => {
        support[from] = support[from] || {};
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
    save();
    input.value = "";
    renderAll();
}

function renderTable() {
    ensureStructure();
    const table = document.getElementById("supportTable");
    table.innerHTML = "";

    if (streamers.length === 0) {
        table.innerHTML = "<tr><td>Keine Streamer eingetragen.</td></tr>";
        return;
    }

    let header = "<tr><th>Von \\ Zu</th>";
    streamers.forEach(s => header += `<th>${s}</th>`);
    header += "</tr>";
    table.innerHTML += header;

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
        row += "</tr>";
        table.innerHTML += row;
    });
}

function increment(from, to) {
    support[from][to] = (support[from][to] || 0) + 1;
    save();
    renderAll();
}

function resetMonth() {
    if (!confirm("Monat wirklich komplett zurücksetzen?")) return;

    streamers.forEach(f => {
        streamers.forEach(t => {
            if (f !== t) support[f][t] = 0;
        });
    });

    save();
    renderAll();
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

    if (streamers.length === 0) {
        container.innerHTML = "<p>Noch keine Daten.</p>";
        return;
    }

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

function exportCSV() {
    let csv = "Von,Zu,Anzahl\n";

    streamers.forEach(f => {
        streamers.forEach(t => {
            if (f !== t) {
                csv += `${f},${t},${support[f][t] || 0}\n`;
            }
        });
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "hrx_support.csv";
    a.click();
}

function downloadBackup() {
    const data = { streamers, support };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "hrx_support_backup.json";
    a.click();
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.streamers) || typeof data.support !== "object") {
                alert("Ungültiges Backup.");
                return;
            }
            streamers = data.streamers;
            support = data.support;
            save();
            renderAll();
            alert("Backup importiert.");
        } catch {
            alert("Fehler beim Lesen des Backups.");
        }
    };
    reader.readAsText(file);
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

function renderAll() {
    ensureStructure();
    renderTable();
    renderRanking();
}

setupTabs();
renderAll();
