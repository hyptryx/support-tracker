// ===============================
// GITHUB KONFIGURATION
// ===============================
const GITHUB_USER = "hyptryx";                 // <-- Dein GitHub Benutzername
const GITHUB_REPO = "support-tracker";         // <-- Dein Repository
const GITHUB_FILE = "data.json";               // <-- Datei mit den Daten
const GITHUB_TOKEN = "";

// ===============================
// Globale Variablen
// ===============================
let streamers = [];
let support = {};
let githubSha = ""; // notwendig für Updates

// ===============================
// GitHub Datei laden
// ===============================
async function loadFromGitHub() {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

    const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${GITHUB_TOKEN}` }
    });

    const data = await response.json();

    githubSha = data.sha;

    const content = JSON.parse(atob(data.content));

    streamers = content.streamers || [];
    support = content.support || {};

    ensureStructure();
    renderAll();
}

// ===============================
// GitHub Datei speichern
// ===============================
async function saveToGitHub() {
    ensureStructure();

    const newContent = {
        streamers,
        support
    };

    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "HRX Support Tracker Update",
            content: btoa(JSON.stringify(newContent, null, 2)),
            sha: githubSha
        })
    });

    const result = await response.json();
    githubSha = result.content.sha;

    alert("Gespeichert! Alle HRX‑Leute sehen jetzt deinen Stand.");
}

// ===============================
// Restlicher Code bleibt gleich
// ===============================

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
    renderAll();
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
