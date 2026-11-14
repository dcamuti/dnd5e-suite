// Inserisce il codice comune (cartella common/) nei 7 tool, tra i marcatori ">>> COMUNE" e "<<< COMUNE".
// La cartella common/ è l'unica fonte: una correzione si fa lì, poi si rilancia questo script.
// I file pubblicati restano singoli e autonomi: a runtime non viene caricato nessun file condiviso.
//
// Uso (dalla radice del repository):
//   node tools/build-common.js           → riscrive i blocchi comuni nei 7 index.html
//   node tools/build-common.js --check   → non scrive nulla; esce con errore se un tool non corrisponde a common/
//
// Varianti per singolo tool, dentro i file di common/ (ogni direttiva su una riga a sé):
//   /*#if puzzles*/ … /*#else*/ … /*#endif*/      più tool: /*#if npcs,world*/      negazione: /*#if !characters*/
"use strict";
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), dir = path.join(root, "common");
const TOOLS = ["characters", "npcs", "encounters", "world", "journal", "puzzles", "maps"];
/* blocchi nell'ordine in cui compaiono nei file; skip = tool che non hanno il blocco */
const REGIONS = [
  { name: "stile", files: ["stile-base.css", "stile-intestazione.css", "stile-finestre.css", "stile-sezioni.css", "stile-icone.css"] },
  { name: "storage", files: ["storage.js"] },
  { name: "dati", files: ["dati-esterni.js", "id-visibilita.js"] },
  { name: "motore", files: ["motore.js", "diario.js"], skip: ["characters"] },   // le Schede PG non generano contenuti e non scrivono nel Diario
  { name: "interfaccia", files: ["immagini.js", "backup.js", "campagne.js", "finestre.js", "menu.js", "interfaccia.js", "ricerca.js", "pwa.js"] },
];
const startOf = n => `/* >>> COMUNE: ${n} (generato da common/ con tools/build-common.js: non modificare qui) */\n`;
const endOf = n => `/* <<< COMUNE: ${n} */\n`;

/* applica le direttive #if / #else / #endif per un tool */
function forTool(text, tool, file) {
  const out = []; let keep = null;   // null = fuori da un #if
  text.split("\n").forEach((line, i) => {
    const m = line.match(/^\s*\/\*#(if|else|endif)\s*([^*]*?)\s*\*\/\s*$/);
    if (!m) { if (keep !== false) out.push(line); return; }
    const where = `${file}:${i + 1}`;
    if (m[1] === "if") {
      if (keep !== null) throw new Error(`${where}: #if dentro un altro #if`);
      const neg = m[2].startsWith("!"), list = m[2].replace(/^!/, "").split(",").map(s => s.trim());
      list.forEach(t => { if (!TOOLS.includes(t)) throw new Error(`${where}: tool sconosciuto "${t}"`); });
      keep = list.includes(tool) !== neg;
    } else if (keep === null) throw new Error(`${where}: #${m[1]} senza #if`);
    else if (m[1] === "else") keep = !keep; else keep = null;
  });
  if (keep !== null) throw new Error(`${file}: #if senza #endif`);
  return out.join("\n");
}
function build(region, tool) {
  return region.files.map(f => {
    const t = fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");
    if (!t.endsWith("\n")) throw new Error(`common/${f}: deve finire con un a capo`);
    return forTool(t, tool, "common/" + f);
  }).join("");
}
function run(check) {
  const problems = [], changed = [];
  for (const tool of TOOLS) {
    const file = path.join(root, tool, "index.html"); let src = fs.readFileSync(file, "utf8"); const before = src;
    for (const r of REGIONS) {
      const a = startOf(r.name), b = endOf(r.name), i = src.indexOf(a), j = src.indexOf(b);
      if (r.skip && r.skip.includes(tool)) { if (i >= 0) problems.push(`${tool}: contiene il blocco "${r.name}", che qui non è previsto`); continue; }
      if (i < 0 || j < i) { problems.push(`${tool}: marcatori del blocco "${r.name}" mancanti o rovinati`); continue; }
      if (src.indexOf(a, i + 1) >= 0) { problems.push(`${tool}: blocco "${r.name}" presente due volte`); continue; }
      const want = build(r, tool);
      if (src.slice(i + a.length, j) !== want) { changed.push(`${tool}: ${r.name}`); src = src.slice(0, i + a.length) + want + src.slice(j); }
    }
    if (!check && src !== before) fs.writeFileSync(file, src);
  }
  return { problems, changed };
}
module.exports = { run, TOOLS, REGIONS };
if (require.main === module) {
  const check = process.argv.includes("--check");
  let r; try { r = run(check); } catch (e) { console.error("✗ " + e.message); process.exit(1); }
  r.problems.forEach(p => console.error("✗ " + p));
  if (check) {
    r.changed.forEach(c => console.error("✗ " + c + " non corrisponde a common/"));
    if (r.problems.length || r.changed.length) { console.error("\nIl codice comune si modifica in common/, poi: node tools/build-common.js"); process.exit(1); }
    console.log(`Codice comune allineato a common/ (${REGIONS.length} blocchi, ${TOOLS.length} tool).`);
  } else {
    if (r.problems.length) process.exit(1);
    console.log(r.changed.length ? "Aggiornati:\n  " + r.changed.join("\n  ") : "Nessuna modifica: i tool corrispondono già a common/.");
  }
}
