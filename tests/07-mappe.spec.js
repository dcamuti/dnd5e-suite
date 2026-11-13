// Editor di mappe: disegno, elementi, annulla, export/import, token collegati, nebbia e vista giocatori.
const fs = require("fs");
const { test, expect, open, ls, makeChar } = require("./helpers");
async function fresh(page) { await open(page, "maps"); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
  await page.evaluate(() => { VIEW.z = 1; VIEW.x = 0; VIEW.y = 0; applyView(); });
  const b = await page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return { x: r.left, y: r.top }; });
  return (cx, cy) => [b.x + cx * 32 + 16, b.y + cy * 32 + 16]; }
const drag = async (page, a, b) => { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(80); };

test("disegno: pennello, rettangolo, riempi (si ferma ai muri), gomma; annulla e ripeti", async ({ page }) => {
  const P = await fresh(page);
  await page.evaluate(() => setTerr(2)); await drag(page, P(3, 5), P(10, 5));
  expect((await page.evaluate(() => M.terrain[5])).slice(3, 11)).toBe("22222222");
  await page.evaluate(() => { setTerr(6); setMode("rect"); }); await drag(page, P(4, 8), P(8, 10));
  expect(await page.evaluate(() => [8, 9, 10].map(y => M.terrain[y].slice(4, 9)))).toEqual(["66666", "66666", "66666"]);
  await page.evaluate(() => { setTerr(5); setMode("fill"); }); await page.mouse.click(...P(15, 15));
  const row = await page.evaluate(() => M.terrain[15]); expect(row[0]).toBe("2"); expect(row[15]).toBe("5");
  await page.evaluate(() => { setMode("erase"); setBrush(3); }); await page.mouse.click(...P(6, 9));
  expect(await page.evaluate(() => M.terrain[9].slice(5, 8))).toBe("000");
  for (let i = 0; i < 6; i++) await page.keyboard.press("Control+z");
  expect((await page.evaluate(() => M.terrain[5])).slice(3, 11)).toBe("11111111");
  for (let i = 0; i < 6; i++) await page.keyboard.press("Control+y");
  expect((await page.evaluate(() => M.terrain[5])).slice(3, 11)).toBe("22222222");
});

test("elementi: posizionamento, spostamento con qualunque strumento, Alt per dipingere sotto, righello", async ({ page }) => {
  const P = await fresh(page);
  await page.evaluate(() => setLTab("elem")); await page.click('.pal .it[title="Goblin"]'); await page.mouse.click(...P(5, 5));
  expect(await page.evaluate(() => M.objects.map(o => [o.label, o.x, o.y]))).toEqual([["Goblin", 5, 5]]);
  await page.evaluate(() => setTerr(2)); await drag(page, P(5, 5), P(12, 7));              // pennello attivo: l'elemento si sposta, non si dipinge
  expect(await page.evaluate(() => [M.objects[0].x, M.objects[0].y, M.terrain[5].slice(5, 12)])).toEqual([12, 7, "1111111"]);
  await page.keyboard.down("Alt"); await drag(page, P(12, 7), P(12, 8)); await page.keyboard.up("Alt");
  expect(await page.evaluate(() => [M.terrain[7][12], M.objects[0].x])).toEqual(["2", 12]);
  await page.keyboard.press("m"); await page.mouse.move(...P(2, 2)); await page.mouse.down(); await page.mouse.move(...P(8, 5), { steps: 4 });
  await expect(page.locator("#status")).toContainText("30 ft"); await page.mouse.up();
  await page.evaluate(() => { setMode("select"); SEL = M.objects[0].id; }); await page.keyboard.press("Delete");
  expect(await page.evaluate(() => M.objects.length)).toBe(0);
});

test("salvataggio automatico, export e import con ID nuovi", async ({ page }) => {
  await fresh(page);
  await page.evaluate(() => { addObject(PALETTE_ITEMS[3][1][0], 4, 4); setFogOn(true); fogRoom({ x: 3, y: 3 }); saveNow(); });
  const before = await page.evaluate(() => JSON.stringify([M.terrain, M.objects.map(o => [o.type, o.x, o.y]), M.fog]));
  await page.reload(); await page.waitForTimeout(400);
  expect(await page.evaluate(() => JSON.stringify([M.terrain, M.objects.map(o => [o.type, o.x, o.y]), M.fog]))).toBe(before);
  const id = await page.evaluate(() => M.id);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => { exportJson(); })]);
  const file = await dl.path(); expect(JSON.parse(fs.readFileSync(file, "utf8")).type).toBe("dnd5e_map");
  await page.setInputFiles('label:has-text("Importa mappa") input[type=file]', file); await page.waitForTimeout(500);
  expect(await page.evaluate(() => M.id)).not.toBe(id); expect((await ls(page, "dnd5e_maps")).length).toBe(2);
});

test("token collegati: PF del PG in tempo reale, originale eliminato segnalato", async ({ page, context }) => {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  const id = await makeChar(page, "Aria");
  const m = await context.newPage(); await m.goto("/maps/index.html"); await m.waitForTimeout(400);
  await m.evaluate(i => { addSuite("pc", i, 4, 4); addSuite("mon", "Ogre", 8, 4); }, id);
  expect(await m.evaluate(() => M.objects.map(o => [dispName(o), o.size, o.ref.t]))).toEqual([["Aria", 1, "pc"], ["Ogre", 2, "mon"]]);
  await page.evaluate(i => { const r = dbGet("chars"); const it = r.find(x => x.id === i); it.st.hpC = 1; dbSet("chars", r); }, id); await m.waitForTimeout(400);
  expect(await m.evaluate(() => refInfo(M.objects[0]).hp)).toBe(1); await expect(m.locator(".obj .hpb i.low")).toHaveCount(1);
  await page.evaluate(() => dbSet("chars", [])); await m.waitForTimeout(400);
  await expect(m.locator(".obj .warn")).toHaveCount(1); expect(await m.evaluate(() => dispName(M.objects[0]))).toBe("Aria");
});

test("nebbia e vista giocatori: stanza rivelata, elementi nascosti, aggiornamenti durante il trascinamento", async ({ page, context }) => {
  const P = await fresh(page);
  await page.evaluate(() => { for (let y = 0; y < 20; y++) setCell(12, y, CH[2]); buildStage(); addObject(PALETTE_ITEMS[2][1][0], 5, 5); addObject(PALETTE_ITEMS[5][1][0], 3, 3); saveNow(); });
  const pv = await context.newPage(); await pv.goto("/maps/index.html#view=" + await page.evaluate(() => M.id)); await pv.waitForTimeout(600);
  await expect(pv.locator(".app-header")).toBeHidden();
  await page.evaluate(() => { setFogOn(true); }); await page.waitForTimeout(300);
  await expect(pv.locator("#objs .obj")).toHaveCount(0);
  await page.evaluate(() => { setMode("revroom"); }); await page.mouse.click(...P(4, 4)); await pv.waitForTimeout(300);
  expect(await page.evaluate(() => [M.fog.shown[4][11], M.fog.shown[4][12], M.fog.shown[4][13]])).toEqual(["1", "1", "0"]);
  await expect(pv.locator("#objs .obj")).toHaveCount(1);                                   // il goblin sì, la trappola no
  await page.mouse.move(...P(3, 3)); await page.mouse.down(); await page.mouse.move(...P(7, 6), { steps: 6 }); await pv.waitForTimeout(250);
  expect(await pv.evaluate(() => M.objects.find(o => o.type === "token").x)).toBe(7);      // prima del rilascio
  await page.mouse.up();
  await page.evaluate(() => setPvNames("none")); await pv.waitForTimeout(300);
  await expect(pv.locator("#objs .lbl")).toHaveCount(0);
});

test("pannello a schede: la scheda segue lo strumento e viene ricordata", async ({ page }) => {
  await fresh(page);
  const tab = () => page.evaluate(() => document.querySelector(".ltab.on").dataset.lt);
  expect(await tab()).toBe("draw");
  await page.evaluate(() => setFogOn(true)); expect(await tab()).toBe("play");
  await page.reload(); await page.waitForTimeout(300); expect(await tab()).toBe("play");
});
