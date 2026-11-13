/* Verifica che il codice comune sia identico in tutti i tool e che non siano tornate finestre native del browser.
   Uso (dalla radice del repository):  node tools/check-common.js   → esce con errore se trova differenze. */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = path.join(__dirname, ".."), TOOLS = ["characters", "npcs", "encounters", "world", "journal", "puzzles", "maps"];
const src = Object.fromEntries(TOOLS.map(t => [t, fs.readFileSync(path.join(root, t, "index.html"), "utf8")]));
/* [nome, inizio, fine, tool che non hanno il blocco, tool con una variante voluta] */
const BLOCKS = [
  ["storage e migrazioni", "/* ================= STORAGE DELLA SUITE", "dbMigrate();"],
  ["sanitizzazione degli import", "const PZ_ALLOW=", "function jsa(s){", [], ["puzzles"]],   // negli Enigmi PZ_ALLOW=true: l'HTML degli enigmi è ammesso (e ripulito)
  ["helper jsa", "function jsa(s){", "function newId(t){"],
  ["ID, visibilità e proprietà", "function newId(t){", "function forPlayers("],
  ["invio al Diario", "const DIARY_KEEP=", "function toDiary(", ["characters"]],
  ["libreria immagini", "/* ================= LIBRERIA IMMAGINI", "/* chiavi reali di tutti i dati"],
  ["backup e ripristino", "async function backupSuite(){", "/* ================= FINESTRE DELLA SUITE"],
  ["finestre della suite", "/* ================= FINESTRE DELLA SUITE", "/* ================= MENU ⋯"],
  ["menu e promemoria del backup", "/* ================= MENU ⋯", "/* ================= SEZIONI COMPRIMIBILI"],
  ["sezioni comprimibili, preferenze e accessibilità", "/* ================= SEZIONI COMPRIMIBILI", "/* su schermi stretti la barra"],
  ["stile: base UX", "/* ==== BASE UX COMUNE", "/* ==== INTESTAZIONE COMPATTA", [], ["encounters"]],
  ["stile: intestazione e menu", "/* ==== INTESTAZIONE COMPATTA", "/* ==== FINESTRE DELLA SUITE"],
  ["stile: finestre e Annulla", "/* ==== FINESTRE DELLA SUITE", "/* ==== SEZIONI COMPRIMIBILI"],
];
let bad = 0; const fail = m => { bad++; console.error("✗ " + m); };
for (const [name, a, b, absent = [], variant = []] of BLOCKS) {
  const groups = {};
  for (const t of TOOLS) {
    const i = src[t].indexOf(a), j = i < 0 ? -1 : src[t].indexOf(b, i + 1);
    if (i < 0 || j < 0) { if (!absent.includes(t)) fail(`${name}: blocco non trovato in ${t}`); continue; }
    if (absent.includes(t)) fail(`${name}: ${t} ora contiene il blocco, aggiorna tools/check-common.js`);
    if (variant.includes(t)) continue;
    const h = crypto.createHash("md5").update(src[t].slice(i, j)).digest("hex"); (groups[h] = groups[h] || []).push(t);
  }
  const g = Object.values(groups);
  if (g.length > 1) fail(`${name}: versioni diverse → ${g.map(x => x.join(", ")).join("  ≠  ")}`); else if (g.length) console.log(`✓ ${name} (${g[0].length} tool)`);
}
for (const t of TOOLS) for (const k of ["alert", "confirm", "prompt"]) {
  const n = (src[t].match(new RegExp("(?<![\\w.$])" + k + "\\(", "g")) || []).length;
  if (n) fail(`${t}: ${n} ${k}() del browser: usa uiNote/uiAlert, uiConfirm o uiPrompt`);
}
if (bad) { console.error(`\n${bad} problemi trovati.`); process.exit(1); }
console.log("\nCodice comune allineato, nessuna finestra nativa.");
