// Aree d'effetto (cerchio, cono, linea, cubo) e segnalazione di un punto ai giocatori.
const fs = require("fs");
const { test, expect, open, ls } = require("./helpers");
async function fresh(page) { await open(page, "maps"); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
  await page.evaluate(() => { VIEW.z = 1; VIEW.x = 0; VIEW.y = 0; applyView(); });
  const b = await page.evaluate(() => { const r = document.getElementById("stage").getBoundingClientRect(); return { x: r.left, y: r.top }; });
  return (cx, cy) => [b.x + cx * 32, b.y + cy * 32]; }                                         // coordinate in caselle (anche frazioni)
const drag = async (page, a, b) => { await page.mouse.move(...a); await page.mouse.down(); await page.mouse.move(...b, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(80); };

test("cerchio tracciato col trascinamento: caselle coperte, creature colpite, annulla", async ({ page }) => {
  const P = await fresh(page);
  await page.evaluate(() => { addObject(["token", "goblin-head", "Goblin"], 11, 10); addObject(["token", "hood", "Bandito"], 18, 10); setMode("area"); });
  await drag(page, P(10, 10), P(13, 10));                                                     // origine su un incrocio, raggio 3 caselle = 15 ft
  expect(await page.evaluate(() => M.areas.map(a => [a.shape, a.x, a.y, a.n]))).toEqual([["circle", 10, 10, 3]]);
  expect(await page.evaluate(() => areaCells(M.areas[0]).length)).toBe(32);
  await expect(page.locator("#arHits")).toContainText("1 creatura"); await expect(page.locator("#arHits")).toContainText("Goblin");
  await expect(page.locator(".ahandle .lbl")).toHaveText("Cerchio 15 ft"); expect(await page.evaluate(() => MODE)).toBe("select");
  await page.fill("#sLabel", "Palla di fuoco"); await page.fill("#arN", "45"); await page.locator("#arN").blur();
  await expect(page.locator("#arHits")).toContainText("2 creature"); await expect(page.locator(".ahandle .lbl")).toHaveText("Palla di fuoco · Cerchio 45 ft");
  for (let i = 0; i < 3; i++) await page.keyboard.press("Control+z");                           // misura, etichetta, creazione
  expect(await page.evaluate(() => M.areas.length)).toBe(0);
  await page.keyboard.press("Control+y"); expect(await page.evaluate(() => M.areas.length)).toBe(1);
  await page.keyboard.press("Control+y"); await page.keyboard.press("Control+y"); expect(await page.evaluate(() => [M.areas[0].label, M.areas[0].n])).toEqual(["Palla di fuoco", 9]);
  await page.evaluate(() => { SEL = M.areas[0].id; renderSel(); }); await page.focus("#vp"); await page.keyboard.press("Delete");
  expect(await page.evaluate(() => M.areas.length)).toBe(0);
});

test("cono, linea e cubo: forma e direzione seguono il trascinamento; un clic dà la misura più comune", async ({ page }) => {
  const P = await fresh(page);
  const cells = () => page.evaluate(() => areaCells(M.areas[M.areas.length - 1]).map(c => c.join(",")).sort().join(" "));
  await page.evaluate(() => setAreaShape("cone")); await drag(page, P(5, 10), P(8, 10));       // cono di 15 ft verso est
  expect(await page.evaluate(() => [M.areas[0].n, M.areas[0].a])).toEqual([3, 0]);
  expect(await cells()).toBe("6,10 6,9 7,10 7,9");
  await page.evaluate(() => setAreaShape("line")); await drag(page, P(12.5, 4.5), P(12.5, 9.5)); // linea di 25 ft verso sud, dal centro di una casella
  expect(await page.evaluate(() => [M.areas[1].n, M.areas[1].a])).toEqual([5, 90]);
  expect(await cells()).toBe("12,4 12,5 12,6 12,7 12,8 12,9".split(" ").sort().join(" "));
  await page.evaluate(() => setAreaShape("cube")); await drag(page, P(20, 12), P(18, 10));       // cubo di 10 ft trascinato verso l'alto a sinistra
  expect(await page.evaluate(() => [M.areas[2].x, M.areas[2].y, M.areas[2].n])).toEqual([18, 10, 2]);
  expect(await cells()).toBe("18,10 18,11 19,10 19,11");
  await page.evaluate(() => setAreaShape("circle")); await page.mouse.click(...P(25, 5));        // clic semplice: raggio 20 ft
  expect(await page.evaluate(() => M.areas[3].n)).toBe(4);
  await page.evaluate(() => { SEL = M.areas[0].id; renderSel(); setArea("a", 180); });           // il cono ruotato copre l'altro lato
  expect(await page.evaluate(() => areaCells(M.areas[0]).every(c => c[0] < 5))).toBe(true);
});

test("spostamento dalla maniglia, vista giocatori in tempo reale, aree solo per il master, export e import", async ({ page, context }) => {
  const P = await fresh(page);
  await page.evaluate(() => { setMode("area"); }); await drag(page, P(6, 6), P(8, 6));
  await page.evaluate(() => { setAreaShape("cube"); }); await drag(page, P(15, 6), P(17, 8));
  await page.evaluate(() => { setArea("vis", "dm"); SEL = M.areas[0].id; renderSel(); setArea("label", "Nube"); saveNow(); });
  const id = await page.evaluate(() => M.id);
  const pv = await context.newPage(); await pv.goto("/maps/index.html#view=" + id); await pv.waitForTimeout(500);
  await expect(pv.locator("#areas > g")).toHaveCount(1); await expect(pv.locator(".alabel")).toHaveText("Nube"); await expect(pv.locator(".ahandle")).toHaveCount(0);
  await page.evaluate(() => setMode("paint"));                                                  // la maniglia si prende con qualunque strumento
  await page.mouse.move(...P(6, 6)); await page.mouse.down(); await page.mouse.move(...P(10, 9), { steps: 5 }); await pv.waitForTimeout(150);
  expect(await pv.evaluate(() => [M.areas[0].x, M.areas[0].y])).toEqual([10, 9]);               // prima del rilascio
  await page.mouse.up(); await page.waitForTimeout(600);
  expect(await page.evaluate(() => [M.areas[0].x, M.areas[0].y, M.terrain[6][6]])).toEqual([10, 9, "1"]);
  await page.reload(); await page.waitForTimeout(400); expect(await page.evaluate(() => M.areas.map(a => [a.shape, a.vis || "all", a.label]))).toEqual([["circle", "all", "Nube"], ["cube", "dm", ""]]);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => { exportJson(); })]);
  const file = await dl.path(); expect(JSON.parse(fs.readFileSync(file, "utf8")).map.areas.length).toBe(2);
  await page.setInputFiles('label:has-text("Importa mappa") input[type=file]', file); await page.waitForTimeout(500);
  expect(await page.evaluate(() => M.areas.length)).toBe(2); expect((await ls(page, "dnd5e_maps")).length).toBe(2);
});

test("segnalazione di un punto: doppio clic o pulsante, compare anche ai giocatori e non viene salvata", async ({ page, context }) => {
  const P = await fresh(page);
  await page.evaluate(() => saveNow()); const id = await page.evaluate(() => M.id);
  const pv = await context.newPage(); await pv.goto("/maps/index.html#view=" + id); await pv.waitForTimeout(500);
  await page.mouse.dblclick(...P(7.5, 7.5));
  await expect(page.locator(".ping")).toHaveCount(1); await expect(pv.locator(".ping")).toHaveCount(1);
  expect(await pv.evaluate(() => { const p = document.querySelector(".ping"); return [parseFloat(p.style.left) / 32, parseFloat(p.style.top) / 32].map(v => Math.round(v * 2) / 2); })).toEqual([7.5, 7.5]);
  await page.evaluate(() => setLTab("play")); await page.click("#pingBtn"); await page.mouse.click(...P(12, 3)); await expect(pv.locator(".ping")).toHaveCount(2);
  expect(await page.evaluate(() => [PING_ARM, M.objects.length, M.areas.length])).toEqual([false, 0, 0]);
  await page.waitForTimeout(3200); await expect(page.locator(".ping")).toHaveCount(0); await expect(pv.locator(".ping")).toHaveCount(0);
});

test("area legata a un effetto del tracker: sparisce quando l'effetto termina, con Annulla; le aree entrano nel PNG", async ({ page }) => {
  const P = await fresh(page);
  await page.evaluate(() => { dbSet("encTrk", { list: [{ id: "trk_a", name: "Aria", pc: true, mi: -1, init: 10, hp: 10, hpMax: 10, cond: [] }], turn: 0, round: 1, fx: [{ id: "fx_1", name: "Nube velenosa", rds: 1, tgt: "" }] }); trkChanged(); setMode("area"); });
  await drag(page, P(8, 8), P(10, 8)); await page.selectOption("#arFx", "fx_1");
  expect(await page.evaluate(() => M.areas[0].fx)).toBe("fx_1");
  /* il PNG per i giocatori contiene il colore dell'area */
  const px = await page.evaluate(() => new Promise(res => { const real = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function () { HTMLCanvasElement.prototype.toBlob = real; const d = this.getContext("2d").getImageData(8.5 * 64, 8.5 * 64, 1, 1).data; res([d[0] > d[2] + 20, d[3]]); }; exportPng(false); }));
  expect(px).toEqual([true, 255]);
  await page.evaluate(() => { addObject(["token", "hood", "X"], 2, 2); M.objects[0].trk = "trk_a"; renderObjs(); trkNext(); });   // nuovo round: l'effetto da 1 round termina
  expect(await page.evaluate(() => [trkRead().fx.length, M.areas.length])).toEqual([0, 0]);
  await expect(page.locator("#uiUndo")).toContainText("Effetto terminato"); await page.click("#uiUndo button");
  expect(await page.evaluate(() => [M.areas.length, M.areas[0].fx])).toEqual([1, undefined]);    // ripristinata, senza più il legame
});
