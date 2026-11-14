// Ricerca nella campagna: trova gli elementi salvati di tutti i tool e li apre al loro posto.
const { test, expect, open, ls, setLs, makeChar, TRAP, xss } = require("./helpers");
const DATA = {
  dnd5e_chars: [{ id: "pc_1", name: "Aria", data: {}, st: { name: "Aria Ventolieve", race: "Elfo", cls: "Mago 3" } }],
  dnd5e_npcs: [{ id: "npc_1", name: "Mira la Fabbra", race: "Nana", occ: "fabbro", sb: "Commoner", secret: "nasconde una spada maledetta" }],
  dnd5e_enc_saved: [{ id: "enc_1", name: "Imboscata al guado", enc: [{ n: "Goblin", q: 4 }] }],
  dnd5e_enc_hb: [{ id: "hb_1", n: "Shadow Hound", it: "Segugio d'ombra", cr: "2" }],
  dnd5e_diary: { sessions: [{ id: "ses_1", title: "La città sommersa", date: "2026-11-01", text: "Il gruppo trova la spada di Mira nel tempio." }], npcs: [{ id: "dnpc_1", name: "Oste Bruno", where: "Locanda", note: "" }], places: [{ id: "plc_1", name: "Tempio sommerso", note: "" }], hooks: [{ id: "hok_1", text: "Chi ha rubato la corona?" }] },
  dnd5e_world: { saved: [{ id: "wld_1", type: "set", title: "Borgo di Pietrafonda", date: "2026-10-01" }], factions: [{ id: "fz_1", name: "Lega della Corona" }] },
  dnd5e_puzzles: [{ id: "pz_1", name: "Porta delle rune", tipo: "Cifrario", player: "<p>Tre <b>rune</b> brillano</p>", dm: "soluzione: ALBA", date: "2026-10-02" }],
  dnd5e_maps: [{ id: "map_1", v: 1, name: "Cripta del Re", grid: { type: "square", w: 10, h: 10, cell: 5, unit: "ft" }, objects: [{ id: "obj_1", type: "note", x: 1, y: 1, size: 1, icon: "pin", label: "Altare", note: "qui c'è la corona" }], notes: "" }],
};
async function start(page, tool = "npcs") { await open(page, tool); await page.evaluate(() => localStorage.clear()); await setLs(page, DATA); await page.reload(); await page.waitForTimeout(250); }
const titles = page => page.locator(".gs-it b").allTextContents();

test("trova in tutti i tool: titoli prima, poi testo con il frammento; accenti e più parole", async ({ page }) => {
  await start(page); await page.keyboard.press("/"); await expect(page.locator("#gsQ")).toBeFocused();
  await expect(page.locator("#gsCount")).toHaveText("12 elementi salvati");
  await page.fill("#gsQ", "corona");
  expect(await titles(page)).toEqual(["Chi ha rubato la corona?", "Lega della Corona", "Cripta del Re"]);
  await expect(page.locator(".gs-sn")).toContainText("qui c'è la corona"); await expect(page.locator(".gs-sn mark")).toHaveText("corona");
  expect(await page.locator(".gs-grp").allTextContents()).toEqual(["Diario", "Mondo", "Mappe"]);
  await page.fill("#gsQ", "citta sommersa"); expect(await titles(page)).toEqual(["La città sommersa"]);          // senza accento
  await page.fill("#gsQ", "spada mira"); expect(await titles(page)).toEqual(["La città sommersa", "Mira la Fabbra"]);
  await page.fill("#gsQ", "rune brillano"); expect(await titles(page)).toEqual(["Porta delle rune"]);          // testo dentro l'HTML dell'enigma
  await page.fill("#gsQ", "segugio"); expect(await titles(page)).toEqual(["Segugio d'ombra"]);
  await page.fill("#gsQ", "goblin"); expect(await titles(page)).toEqual(["Imboscata al guado"]);
  await page.fill("#gsQ", "zzz"); await expect(page.locator(".gs-empty")).toContainText("Nessun elemento trovato");
  await page.keyboard.press("Escape"); await expect(page.locator("#gsOv")).toHaveCount(0);
});

/* elementi veri, creati dai rispettivi tool (più incontro, enigma, mappa e diario dai dati di prova) */
async function seed(page) {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload(); await makeChar(page, "Aria Ventolieve");
  await open(page, "npcs"); await page.evaluate(() => { genNpc(); N.name = "Mira la Fabbra"; saveNpc(); });
  await open(page, "world"); await page.evaluate(() => { newFaction(); const W = world(); W.factions[0].name = "Lega della Corona"; worldSave(W); });
  await setLs(page, { dnd5e_enc_saved: DATA.dnd5e_enc_saved, dnd5e_enc_hb: DATA.dnd5e_enc_hb, dnd5e_puzzles: DATA.dnd5e_puzzles, dnd5e_maps: DATA.dnd5e_maps, dnd5e_diary: DATA.dnd5e_diary });
}

test("apre l'elemento nel suo tool, anche restando nello stesso", async ({ page }) => {
  await seed(page); const fz = (await ls(page, "dnd5e_world")).factions[0].id;
  const go = async (tool, q, check) => { await open(page, tool); await page.keyboard.press("Control+k"); await page.fill("#gsQ", q); await expect(page.locator(".gs-it")).toHaveCount(1);
    await Promise.all([page.waitForEvent("load"), page.keyboard.press("Enter")]); await page.waitForTimeout(400); await check(); };
  await go("journal", "aria ventolieve", async () => { expect(page.url()).toContain("/characters/"); expect(await page.evaluate(() => C.name)).toBe("Aria Ventolieve"); });
  await go("npcs", "mira fabbra", async () => { expect(page.url()).toContain("/npcs/"); expect(await page.evaluate(() => N.name)).toBe("Mira la Fabbra"); });   // stesso tool: ricarica
  await go("npcs", "imboscata guado", async () => { expect(await page.evaluate(() => ENC.length)).toBe(1); });
  await go("npcs", "porta rune", async () => { expect(await page.evaluate(() => CUR.titolo)).toBe("Porta delle rune"); });
  await go("npcs", "cripta del re", async () => { expect(await page.evaluate(() => M.name)).toBe("Cripta del Re"); });
  await go("npcs", "oste bruno", async () => { expect(page.url()).toContain("/journal/"); await expect(page.locator("#q")).toHaveValue("Oste Bruno");
    expect(await page.evaluate(() => [...document.querySelectorAll("#npcList input")].map(i => i.value).filter(v => v === "Oste Bruno").length)).toBe(1); await expect(page.locator(".sess")).toHaveCount(0); });
  await go("maps", "lega corona", async () => { expect(page.url()).toContain("/world/"); await expect(page.locator("#fz-" + fz)).toBeVisible(); });
});

test("pulsante nella barra, frecce, collegamento #cerca dalla home, solo la campagna attiva, testi non eseguiti", async ({ page }) => {
  await seed(page); await open(page, "world");
  await page.evaluate(t => { const n = dbGet("npcs"); n.push(Object.assign({}, n[0], { id: "npc_t", name: "Trappola " + t, segreto: t })); dbSet("npcs", n); }, TRAP);
  await page.click("#snSearch"); await page.fill("#gsQ", "a");
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => [...document.querySelectorAll(".gs-it")].findIndex(x => x.classList.contains("on")))).toBe(2);
  await page.fill("#gsQ", "trappola"); await expect(page.locator(".gs-it")).toHaveCount(1); expect(await xss(page)).toEqual({ script: 0, markup: 0 });
  await page.keyboard.press("Escape");
  /* in un'altra campagna gli stessi dati non si trovano */
  await page.evaluate(() => { const r = campReg(); r.list.push({ id: "cmp_b", name: "B", created: "" }); campSave(r); });
  await Promise.all([page.waitForEvent("load"), page.evaluate(() => { if (campSwitch("cmp_b")) location.reload(); })]);
  await page.goto("/index.html"); await Promise.all([page.waitForEvent("load"), page.click('a:has-text("Cerca nella campagna")')]);
  await expect(page.locator("#gsQ")).toBeFocused(); await expect(page.locator("#gsQ")).toHaveAttribute("placeholder", /«B»/);
  await page.fill("#gsQ", "mira"); await expect(page.locator(".gs-it")).toHaveCount(0);
  await page.fill("#gsQ", "segugio"); expect(await titles(page)).toEqual(["Segugio d'ombra"]);                 // l'homebrew è comune a tutte le campagne
});
