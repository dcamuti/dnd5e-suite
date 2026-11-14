// Mappa collegata al tracker degli Incontri: combattenti portati nel tracker, turno evidenziato, stato per i giocatori.
const { test, expect, open, ls, makeChar } = require("./helpers");

/* scheda di un PG, poi una mappa con il PG, un goblin del bestiario, un token senza scheda */
async function scene(page, context) {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  const pc = await makeChar(page, "Aria");
  const m = await context.newPage(); await m.goto("/maps/index.html"); await m.waitForTimeout(400);
  await m.evaluate(i => { addSuite("pc", i, 4, 4); addSuite("mon", "Goblin", 8, 4); addSuite("mon", "Goblin", 9, 4); addObject(["token", "hood", "Sconosciuto"], 12, 4); saveNow(); }, pc);
  return { m, pc };
}

test("porta nel tracker: PG riconosciuto dalla scheda, mostri con statistiche, nessun doppione", async ({ page, context }) => {
  const { m, pc } = await scene(page, context);
  await m.evaluate(() => setLTab("elem")); await m.click('button:has-text("Porta nel tracker")'); await m.waitForTimeout(200);
  const T = await ls(m, "dnd5e_enc_trk");
  expect(T.list.map(u => [u.name, u.pc, !!u.hpMax])).toEqual([["Aria", true, true], ["Goblin", false, true], ["Goblin 2", false, true]]);
  expect(T.list[0].charId).toBe(pc); expect(T.list[1].mn).toBe("Goblin");
  expect(await m.evaluate(() => M.objects.map(o => !!trkRowOf(o)))).toEqual([true, true, true, false]);
  await expect(m.locator("#uiNote")).toContainText("Un token senza scheda");
  await m.click('button:has-text("Porta nel tracker")'); await m.waitForTimeout(200);          // seconda volta: niente doppioni
  expect((await ls(m, "dnd5e_enc_trk")).list.length).toBe(3);
  /* negli Incontri le righe hanno la scheda del mostro giusta */
  await open(page, "encounters", "#tracker"); await expect(page.locator(".trk-row")).toHaveCount(3);
  expect(await page.evaluate(() => TRK.list.filter(u => !u.pc).map(u => MONSTERS[u.mi].n))).toEqual(["Goblin", "Goblin"]);
  /* collegamento a mano del token senza scheda, poi la copia non lo eredita */
  await page.evaluate(() => { TRK.list.push({ id: "trk_x", name: "Bandito", sub: "", mi: -1, pc: false, init: 3, ac: 12, hpMax: 11, hp: 11, dex: 0, cond: [] }); trkSave(); }); await m.waitForTimeout(300);
  await m.evaluate(() => { SEL = M.objects[3].id; renderSel(); }); await m.selectOption("#sTrk", "trk_x");
  expect(await m.evaluate(() => [M.objects[3].trk, (dupObj(), M.objects[4].trk)])).toEqual(["trk_x", undefined]);
});

test("turno dalla mappa: evidenziato, salta gli sconfitti, gli Incontri aperti si aggiornano", async ({ page, context }) => {
  const { m } = await scene(page, context);
  await m.evaluate(() => toTracker()); await open(page, "encounters", "#tracker");
  await page.evaluate(() => { TRK.list[0].init = 18; TRK.list[1].init = 12; TRK.list[2].init = 5; TRK.list[1].hp = 0; TRK.list[2].cond = ["Prono"]; TRK.fx = [{ id: "fx_1", name: "Benedizione", rds: 1, tgt: "" }]; trkSave(); renderTrk(); });
  await m.waitForTimeout(300);
  await expect(m.locator("#cbar")).toContainText("Combattimento non iniziato");
  await expect(m.locator(".obj.dead")).toHaveCount(1); await expect(m.locator(".obj .cnd")).toHaveText("Prono");
  await m.click("#cbar button"); await expect(m.locator("#cbar")).toContainText("Round 1"); await expect(m.locator("#cbar")).toContainText("Aria");
  expect(await m.evaluate(() => document.querySelector(".obj.turn").dataset.id === M.objects[0].id)).toBe(true);
  await m.click("#cbar button"); await expect(m.locator("#cbar")).toContainText("Goblin 2");     // il goblin a 0 PF viene saltato
  await m.click("#cbar button"); await expect(m.locator("#cbar")).toContainText("Round 2");
  await expect(page.locator(".trk-row.active")).toContainText("Aria"); await expect(page.locator("#roundLbl")).toContainText("Round 2");
  await expect(page.locator("#dlog")).toContainText("Benedizione"); expect(await page.evaluate(() => TRK.fx.length)).toBe(0);
  /* dal tracker verso la mappa: danni e turno si vedono senza ricaricare */
  await page.evaluate(() => { nextTurn(); dmg(TRK.list[2].id, -99); trkSave(); }); await m.waitForTimeout(300);
  await expect(m.locator(".obj.dead")).toHaveCount(2); await expect(m.locator("#cbar")).toContainText("tocca a Goblin 2");
});

test("vista giocatori: turno e condizioni solo per le righe visibili, mai i PF dei mostri", async ({ page, context }) => {
  const { m } = await scene(page, context);
  await m.evaluate(() => { toTracker(); trkNext(); trkNext(); });                               // tocca al primo goblin
  const id = await m.evaluate(() => M.id);
  const pv = await context.newPage(); await pv.goto("/maps/index.html#view=" + id); await pv.waitForTimeout(500);
  await expect(pv.locator(".obj.turn")).toHaveCount(1); await expect(pv.locator(".obj .hpb")).toHaveCount(1);   // la barra dei PF c'è solo per il PG
  await open(page, "encounters", "#tracker");
  await page.evaluate(() => { TRK.list[1].vis = "dm"; TRK.list[1].cond = ["Avvelenato"]; TRK.list[2].hp = 0; trkSave(); }); await pv.waitForTimeout(400);
  await expect(pv.locator(".obj.turn")).toHaveCount(0); await expect(pv.locator(".obj .cnd")).toHaveCount(0);   // riga nascosta nel tracker
  await expect(pv.locator(".obj.dead")).toHaveCount(1);
  await m.evaluate(() => trkNext()); await pv.waitForTimeout(400);
  await expect(pv.locator(".obj.turn")).toHaveCount(1);                                         // ora tocca ad Aria (il goblin 2 è sconfitto)
});

test("dal tracker alla mappa: la scheda Tracker elenca chi manca e crea token collegati", async ({ page, context }) => {
  await open(page, "encounters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.evaluate(() => { addToTrk(MONSTERS.findIndex(x => x.n === "Ogre")); TRK.list.push({ id: "trk_y", name: "Capo dei banditi", sub: "", mi: -1, pc: false, init: null, ac: 15, hpMax: 40, hp: 40, dex: 1, cond: [], vis: "dm" }); trkSave(); });
  const m = await context.newPage(); await m.goto("/maps/index.html"); await m.waitForTimeout(400);
  await m.evaluate(() => { setLTab("elem"); setSTab("trk"); }); await expect(m.locator("#sList .sitem")).toHaveCount(2);
  const ids = await m.evaluate(() => trkGet().list.map(u => u.id));
  await m.evaluate(i => { addSuite("trk", i[0], 5, 5); addSuite("trk", i[1], 9, 5); renderSuiteList(); }, ids);
  expect(await m.evaluate(() => M.objects.map(o => [dispName(o), o.size, o.ref ? o.ref.t : "", !!trkRowOf(o), objVis(o)])))
    .toEqual([["Ogre", 2, "mon", true, "all"], ["Capo dei banditi", 1, "", true, "dm"]]);
  await expect(m.locator("#sList .sitem")).toHaveCount(0); await expect(m.locator("#cbar")).toBeVisible();
});
