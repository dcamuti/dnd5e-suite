// Storage: migrazione delle vecchie chiavi, ID, backup e ripristino.
const fs = require("fs");
const { test, expect, open, ls, setLs, tmpFile } = require("./helpers");
const LEGACY = {
  enc_saved: [{ id: "e1", name: "Imboscata", enc: [{ n: "Goblin", q: 3, v: 0 }] }], enc_src: ["MM"], enc_hb: [],
  enc_trk: { list: [{ id: "t1", name: "Orco", sub: "", mi: 0, pc: false, init: 10, ac: 13, hpMax: 15, hp: 15, dex: 1, cond: [] }], turn: -1, round: 0, fx: [] },
  dnd5e_diary: { sessions: [{ id: "s1", date: "2026-10-01", title: 'Campagna di D&D: "La torre" & l\'abisso', text: "" }], npcs: [], places: [], hooks: [], xp: { mode: "xp", total: 0, migrated: true, log: [], pcs: {} } },
};
const seedLegacy = async page => { await open(page, "journal"); await page.evaluate(() => localStorage.clear()); await setLs(page, LEGACY); };

test("migrazione 1→2: le chiavi enc_* passano a dnd5e_enc_* con copia di sicurezza", async ({ page }) => {
  await seedLegacy(page); await open(page, "encounters");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.filter(k => k.startsWith("enc_"))).toEqual([]);
  expect(await ls(page, "dnd5e_schema")).toBe(2);
  expect((await ls(page, "dnd5e_enc_saved"))[0].name).toBe("Imboscata");
  expect(Object.keys((await ls(page, "dnd5e_migr_v2")).store).sort()).toEqual(["enc_hb", "enc_saved", "enc_src", "enc_trk"]);
  expect(await page.evaluate(() => TRK.list.map(u => u.name))).toEqual(["Orco"]);
});

test("una vecchia chiave ricomparsa non sovrascrive i dati nuovi", async ({ page }) => {
  await seedLegacy(page); await open(page, "encounters");
  await page.evaluate(() => localStorage.setItem("enc_trk", '{"list":[],"turn":-1,"round":0}')); await page.reload();
  expect((await ls(page, "dnd5e_enc_trk")).list[0].name).toBe("Orco");
});

test("newId: formato tipo_tempo_casuale e nessun doppione", async ({ page }) => {
  await open(page, "journal");
  const r = await page.evaluate(() => { const s = new Set(); let bad = 0; for (let i = 0; i < 5000; i++) { const x = newId("npc"); if (!/^npc_[0-9a-z]+_[0-9a-z]{8}$/.test(x)) bad++; s.add(x); } return { n: s.size, bad }; });
  expect(r).toEqual({ n: 5000, bad: 0 });
});

test("backup e ripristino: giro completo identico, virgolette e & conservate, data dell'ultimo backup", async ({ page }) => {
  await seedLegacy(page); await page.reload(); await page.waitForTimeout(200);
  const before = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k !== "dnd5e_migr_v2" && k !== "dnd5e_last_backup" && k !== "dnd5e_ui").map(k => [k, localStorage.getItem(k)])));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => { backupSuite(); })]);
  const file = await dl.path(), bk = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(bk.ver).toBe(3); expect(bk.schema).toBe(2); expect(bk.store.dnd5e_last_backup).toBeTruthy();
  await expect(page.locator("#snData")).not.toHaveClass(/warn/);
  await page.evaluate(() => localStorage.clear());
  await Promise.all([page.waitForEvent("load"), page.setInputFiles("#bkFile", file)]);   // conferma e ricarica automatiche
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  for (const k in before) expect(JSON.parse(after[k]), k).toEqual(JSON.parse(before[k]));
  expect(JSON.parse(after.dnd5e_diary).sessions[0].title).toBe('Campagna di D&D: "La torre" & l\'abisso');
});

test("ripristino: i backup vecchi vengono tradotti, quelli di una versione futura rifiutati", async ({ page }) => {
  await open(page, "journal"); await page.evaluate(() => localStorage.clear());
  const store = Object.fromEntries(Object.entries(LEGACY).map(([k, v]) => [k, JSON.stringify(v)]));
  const old = tmpFile("vecchio.json", JSON.stringify({ type: "dnd5e_suite_backup", ver: 2, store }));
  const fut = tmpFile("futuro.json", JSON.stringify({ type: "dnd5e_suite_backup", ver: 9, schema: 99, store }));
  await Promise.all([page.waitForEvent("load"), page.setInputFiles("#bkFile", old)]); await page.waitForTimeout(300);
  expect((await ls(page, "dnd5e_enc_saved"))[0].name).toBe("Imboscata");
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("enc_")))).toEqual([]);
  await page.evaluate(() => { window.__uiLog = []; });
  await page.setInputFiles("#bkFile", fut); await page.waitForTimeout(400);
  expect((await page.evaluate(() => window.__uiLog)).length).toBe(1);                      // solo l'avviso «versione più recente»
  expect((await ls(page, "dnd5e_enc_saved"))[0].name).toBe("Imboscata");
});
