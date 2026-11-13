// Verifica che il codice comune dei 7 tool corrisponda alla cartella common/ e che non siano tornate finestre native del browser.
// Uso (dalla radice del repository):  node tools/check-common.js   → esce con errore se trova differenze.
"use strict";
const fs = require("fs"), path = require("path");
const { run, TOOLS, REGIONS } = require("./build-common.js");
const root = path.join(__dirname, "..");
let bad = 0; const fail = m => { bad++; console.error("✗ " + m); };
try {
  const r = run(true);
  r.problems.forEach(fail);
  r.changed.forEach(c => fail(c + " non corrisponde a common/ (il codice comune si modifica lì, poi: node tools/build-common.js)"));
  if (!r.problems.length && !r.changed.length) console.log(`✓ ${REGIONS.length} blocchi comuni allineati a common/ in ${TOOLS.length} tool`);
} catch (e) { fail(e.message); }
for (const t of TOOLS) {
  const src = fs.readFileSync(path.join(root, t, "index.html"), "utf8");
  for (const k of ["alert", "confirm", "prompt"]) {
    const n = (src.match(new RegExp("(?<![\\w.$])" + k + "\\(", "g")) || []).length;
    if (n) fail(`${t}: ${n} ${k}() del browser: usa uiNote/uiAlert, uiConfirm o uiPrompt`);
  }
}
if (bad) { console.error(`\n${bad} problemi trovati.`); process.exit(1); }
console.log("\nCodice comune allineato, nessuna finestra nativa.");
