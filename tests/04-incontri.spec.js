// Incontri: tracker, fine combattimento, esperienza, sincronizzazione con le schede.
const { test, expect, open, ls, setLs, makeChar } = require("./helpers");
const diary = () => ({ sessions: [{ id: "s1", date: "2026-10-29", title: "Sessione 1", text: "" }], npcs: [], places: [], hooks: [], xp: { mode: "xp", total: 0, migrated: true, log: [], pcs: {} } });
async function tracker(page) {
  await open(page, "encounters");
  const gi = await page.evaluate(() => MONSTERS.findIndex(m => m.n === "Goblin"));
  await setLs(page, { dnd5e_diary: diary(), dnd5e_enc_trk: { list: [
    { id: "t1", name: "Goblin", sub: "", mi: gi, pc: false, init: 12, ac: 15, hpMax: 7, hp: 0, dex: 2, cond: [] },
    { id: "t2", name: "Aria", sub: "PG", mi: -1, pc: true, init: 15, ac: 14, hpMax: null, hp: null, dex: 2, cond: [] },
    { id: "t3", name: "Bran", sub: "PG", mi: -1, pc: true, init: 9, ac: 16, hpMax: null, hp: null, dex: 0, cond: [] }], turn: 0, round: 2, fx: [] } });
  await page.reload(); await page.waitForTimeout(250);
}
const end = async (page, answers) => { await page.evaluate(q => { window.__uiQueue = q; }, answers); await page.evaluate(() => endCombat()); await page.waitForTimeout(150); };
const xpOf = async page => Object.fromEntries(Object.entries((await ls(page, "dnd5e_diary")).xp.pcs).map(([k, v]) => [k, v.xp]));

test("fine combattimento: XP assegnati anche senza riepilogo nel Diario, e mai due volte", async ({ page }) => {
  await tracker(page);
  await end(page, ["yes", "no", "no"]);                                    // XP sì, riepilogo no, tieni il tracker
  expect(await xpOf(page)).toEqual({ "n:aria": 25, "n:bran": 25 });
  expect((await ls(page, "dnd5e_diary")).sessions[0].text).toBe("");
  await end(page, ["yes", "yes", "yes"]);                                  // secondo clic: solo l'avviso
  expect(await xpOf(page)).toEqual({ "n:aria": 25, "n:bran": 25 });
  await page.evaluate(() => { TRK.turn = 2; nextTurn(); });                 // nuovo round: si può concludere di nuovo
  await end(page, ["yes", "no", "no"]);
  expect(await xpOf(page)).toEqual({ "n:aria": 50, "n:bran": 50 });
});

test("fine combattimento: solo il riepilogo, oppure niente", async ({ page }) => {
  await tracker(page);
  await end(page, ["no", "no"]);
  expect(await xpOf(page)).toEqual({}); expect(await page.evaluate(() => !!TRK.ended)).toBe(false);
  await end(page, ["no", "yes", "no"]);
  expect(await xpOf(page)).toEqual({}); expect((await ls(page, "dnd5e_diary")).sessions[0].text).toContain("Goblin");
});

test("PG omonimi dalle schede restano separati; un PG a mano non si duplica", async ({ page }) => {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  await makeChar(page, "Aria"); await page.evaluate(() => { C = JSON.parse(JSON.stringify(C)); delete C.id; });
  await makeChar(page, "Aria");
  expect((await ls(page, "dnd5e_chars")).length).toBe(2);
  await open(page, "encounters");
  const addAll = () => page.evaluate(() => { openRoster(); document.querySelectorAll(".rosterChk").forEach(c => c.checked = true); rosterAdd(); });
  await addAll(); await addAll();
  expect(await page.evaluate(() => TRK.list.filter(u => u.pc).length)).toBe(2);
  await page.evaluate(() => { addPcRow({ name: "Bran", ac: 15, hpM: 20 }); addPcRow({ name: "Bran", ac: 16, hpM: 22 }); });
  expect(await page.evaluate(() => TRK.list.filter(u => u.name === "Bran").map(u => u.ac))).toEqual([16]);
});

test("sincronizzazione tracker → scheda: PF, condizioni e TS contro morte", async ({ page }) => {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  const id = await makeChar(page, "Aria");
  await open(page, "encounters");
  await page.evaluate(() => { openRoster(); document.querySelectorAll(".rosterChk").forEach(c => c.checked = true); rosterAdd(); });
  await page.evaluate(() => { const u = TRK.list.find(u => u.pc); u.hp = 0; u.cond = ["Prono", "Conc."]; u.dsS = 1; u.dsF = 2; trkSave(); });
  await end(page, ["yes", "no", "no"]);                                    // aggiorna le schede, niente riepilogo
  const it = (await ls(page, "dnd5e_chars")).find(c => c.id === id);
  expect(it.data.play).toMatchObject({ hp: 0, cond: ["Prono", "Concentrazione"], dsS: 1, dsF: 2 });
});

test("Svuota tracker con Annulla; modulo «Aggiungi PG»; condizioni compatte su smartphone", async ({ page }) => {
  await tracker(page);
  await page.evaluate(() => { showTab("track"); clearTrk(); });
  expect(await page.evaluate(() => TRK.list.length)).toBe(0);
  await page.click("#uiUndo button");
  expect(await page.evaluate(() => TRK.list.length)).toBe(3);
  await page.evaluate(() => { window.__uiQueue = [{ btn: "yes", fields: { name: "Cora", init: "7", ac: "15", hp: "22" } }]; addPc(); });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (u => [u.init, u.ac, u.hpMax])(TRK.list.find(u => u.name === "Cora")))).toEqual([7, 15, 22]);
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => { TRK.list[0].cond = ["Prono"]; renderTrk(); });
  const vis = await page.evaluate(() => [...document.querySelector(".trk-row").querySelectorAll(".conds .chip")].filter(c => getComputedStyle(c).display !== "none").map(c => c.textContent));
  expect(vis).toEqual(["Prono", "＋ Condizione"]);
});

test("nascondere un combattente lo toglie dalla Vista giocatore", async ({ page }) => {
  await tracker(page);
  await page.evaluate(() => { const f = document.createElement("iframe"); document.body.append(f); PV = f.contentWindow; showTab("track"); renderTrk(); trkVis("t1"); });
  expect(await page.evaluate(() => [...PV.document.querySelectorAll(".r .nm")].map(x => x.textContent.trim()))).toEqual(["Aria", "Bran"]);
  expect((await ls(page, "dnd5e_enc_trk")).list[0].vis).toBe("dm");
});
