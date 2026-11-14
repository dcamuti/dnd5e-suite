// Dungeon generato negli Incontri trasformato in una mappa dell'editor.
const { test, expect, open, ls } = require("./helpers");

test("pianta del dungeon: stanze tutte raggiungibili, chiuse da muri, contenuti al loro posto", async ({ page }) => {
  await open(page, "encounters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  /* molte generazioni: la disposizione è casuale, le regole devono valere sempre */
  const bad = await page.evaluate(() => { const out = [];
    for (let t = 0; t < 60; t++) { document.getElementById("dunN").value = String(4 + t % 11); genDun(); DUN.id = "dun_t"; const m = dunBuildMap(), W = m.grid.w, H = m.grid.h, n = DUN.rooms.length;
      const fail = x => out.push(`giro ${t} (${n} stanze): ${x}`);
      if (W > 100 || H > 100) fail("mappa troppo grande " + W + "×" + H);
      if (m.terrain.length !== H || m.terrain.some(r => r.length !== W)) fail("righe del terreno irregolari");
      const walk = (x, y) => "134".includes((m.terrain[y] || "")[x] || "0");
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(x, y)) { if (!x || !y || x === W - 1 || y === H - 1) fail("pavimento sul bordo");
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (m.terrain[y + j][x + i] === "0") fail("pavimento non chiuso da un muro in " + x + "," + y); }
      const notes = m.objects.filter(o => o.type === "note"); if (notes.length !== n) fail("note delle stanze: " + notes.length);
      const seen = new Set(), st = [[notes[0].x, notes[0].y]];
      while (st.length) { const [x, y] = st.pop(), k = x + "," + y; if (seen.has(k) || !walk(x, y)) continue; seen.add(k); st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
      notes.forEach(o => { if (!seen.has(o.x + "," + o.y)) fail(o.label + " non raggiungibile"); });
      m.objects.forEach(o => { if (!walk(o.x, o.y)) fail(o.type + " «" + o.label + "» fuori dal pavimento"); });
      if (m.objects.filter(o => o.type === "door").length < n - 1) fail("porte insufficienti");
      const want = t => DUN.rooms.filter(r => t.includes(r.tipo)).length, have = (ty, l) => m.objects.filter(o => o.type === ty && (!l || l.includes(o.label))).length;
      if (have("trap") !== want(["trappola"])) fail("trappole"); if (have("treasure") !== want(["tesoro", "mostro+tesoro", "boss"])) fail("tesori");
      if (have("poi", ["Mostri", "Boss"]) !== want(["mostro", "mostro+tesoro", "boss"])) fail("scontri");
      if (m.objects.some(o => o.type === "token" && o.vis !== "dm")) fail("incontro speciale visibile ai giocatori");
    } return out.slice(0, 5); });
  expect(bad).toEqual([]);
});

test("crea la mappa: salvata, aperta nell'editor senza correzioni, nebbia sulla prima stanza, nome distinto alla seconda", async ({ page, context }) => {
  await open(page, "encounters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.evaluate(() => { showTab("dun"); document.getElementById("dunN").value = "8"; genDun(); });
  const [m] = await Promise.all([context.waitForEvent("page"), page.click('button:has-text("Crea la mappa")')]);
  await m.waitForTimeout(900);
  const saved = (await ls(page, "dnd5e_maps"))[0];
  expect(await m.evaluate(() => [M.id, M.name, M.src.t, M.fog.on])).toEqual([saved.id, saved.name, "dun", true]);
  expect(await m.evaluate(() => M.terrain)).toEqual(saved.terrain);                              // l'editor accetta la pianta così com'è
  expect(await m.evaluate(() => M.objects.length)).toBe(saved.objects.length);
  /* «Rivela stanza» sulla prima stanza non aggiunge nulla: era già tutta rivelata, e solo quella */
  const first = saved.objects.find(o => o.label === "Stanza 1"), second = saved.objects.find(o => o.label === "Stanza 2");
  expect(await m.evaluate(([a, b]) => { const before = M.fog.shown.join(""); fogRoom({ x: a.x, y: a.y }); return [M.fog.shown.join("") === before, fogShown(b.x, b.y)]; }, [first, second])).toEqual([true, false]);
  /* vista giocatori: si vedono l'ingresso e le porte della prima stanza, non note, trappole e tesori */
  const pv = await context.newPage(); await pv.goto("/maps/index.html#view=" + saved.id); await pv.waitForTimeout(600);
  expect(await pv.evaluate(() => [...document.querySelectorAll(".obj")].every(e => /t-(poi|door)/.test(e.className)))).toBe(true);
  await expect(pv.locator(".obj.t-poi")).toHaveCount(1);
  await page.click('button:has-text("Crea la mappa")'); await page.waitForTimeout(300);
  const all = await ls(page, "dnd5e_maps"); expect(all.map(x => x.name)).toEqual([saved.name, saved.name + " (2)"]);
});
