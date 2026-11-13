// Strumenti comuni ai test.
const base = require("@playwright/test");
const fs = require("fs"), os = require("os"), path = require("path");
const TOOLS = ["characters", "npcs", "encounters", "world", "journal", "puzzles", "maps"];

/* Risponde da solo alle finestre della suite: di norma preme il pulsante principale; con window.__uiQueue si decide
   risposta per risposta ("no" = primo pulsante, un testo = pulsante che lo contiene, {btn, fields} per i moduli).
   Con window.__uiManual = true le finestre restano aperte e le gestisce il test. */
const UI_AUTO = `(()=>{const go=()=>{const ov=document.querySelector(".ui-ov");if(!ov||ov.__done)return;ov.__done=true;
  setTimeout(()=>{const q=window.__uiQueue||[];const a=q.length?q.shift():"yes";const btns=[...ov.querySelectorAll(".ui-btns .btn")];
    if(a&&typeof a==="object"&&a.fields){for(const k in a.fields){const i=ov.querySelector('input[data-k="'+k+'"]');if(i)i.value=a.fields[k]}}
    const want=a&&typeof a==="object"?a.btn:a;let b;
    if(want==="no")b=btns[0];else if(typeof want==="string"&&want!=="yes")b=btns.find(x=>x.textContent.includes(want));
    if(!b)b=btns.find(x=>x.classList.contains("gold")||x.classList.contains("danger"))||btns[btns.length-1];
    (window.__uiLog=window.__uiLog||[]).push(((ov.querySelector("h3")||{}).textContent||"")+" → "+b.textContent);b.click()},30)};
  new MutationObserver(()=>{if(window.__uiManual)return;go()}).observe(document,{childList:true,subtree:true})})()`;

/* Ogni test parte con un browser pulito, senza font esterni, e fallisce se la pagina genera errori JavaScript
   o apre finestre native del browser (alert, confirm, prompt). */
const test = base.test.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(UI_AUTO);
    await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await use(context);
  },
  page: async ({ page }, use, info) => {
    const problems = [];
    page.on("pageerror", e => problems.push("errore JavaScript: " + String(e).split("\n")[0]));
    page.on("dialog", d => { problems.push("finestra nativa del browser: " + d.type() + " «" + d.message().slice(0, 60) + "»"); d.dismiss().catch(() => {}); });
    await use(page);
    if (!info.annotations.some(a => a.type === "errori-attesi")) base.expect(problems, "problemi nella pagina").toEqual([]);
  },
});

async function open(page, tool, hash = "") { await page.goto(`/${tool}/index.html${hash}`); await page.waitForTimeout(250); }
const ls = (page, key) => page.evaluate(k => { const v = localStorage.getItem(k); try { return JSON.parse(v); } catch (e) { return v; } }, key);
const setLs = (page, obj) => page.evaluate(o => { for (const k in o) localStorage.setItem(k, typeof o[k] === "string" ? o[k] : JSON.stringify(o[k])); }, obj);
/* testo "trappola": se finisce nell'HTML senza escape esegue uno script o crea un elemento marcato */
const TRAP = `PX"'&amp;<img src=x onerror="window.__xss=(window.__xss||0)+1"><b data-xss>X</b>`;
const xss = page => page.evaluate(() => ({ script: window.__xss || 0, markup: document.querySelectorAll("[data-xss]").length }));
/* crea un PG casuale del livello indicato e lo salva; restituisce l'ID */
async function makeChar(page, name = "Aria", level = 3) {
  await page.evaluate(l => { window.__uiQueue = [{ btn: "yes", fields: { v: String(l) } }]; }, level);
  await page.evaluate(() => generateRandom()); await page.waitForTimeout(250);
  await page.evaluate(n => { C.name = n; saveChar(); }, name);
  return (await ls(page, "dnd5e_chars")).find(c => c.name === name).id;
}
/* file temporaneo con percorso solo ASCII (i percorsi con lettere accentate, come le cartelle dei risultati dei test
   con titoli in italiano, non vengono letti correttamente dal browser quando si sceglie un file) */
function tmpFile(name, content) { const d = fs.mkdtempSync(path.join(os.tmpdir(), "dnd5e-test-")); const f = path.join(d, name); fs.writeFileSync(f, content); return f; }
module.exports = { test, expect: base.expect, TOOLS, open, ls, setLs, TRAP, xss, makeChar, tmpFile };
