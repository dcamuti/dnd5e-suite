// Sicurezza: testi con HTML o script in dati salvati, importati o condivisi non devono essere eseguiti.
const { test, expect, open, setLs, TRAP, xss } = require("./helpers");

test("NPC: nome con HTML mostrato come testo in scheda, elenco, eliminazione e Annulla", async ({ page }) => {
  await open(page, "npcs"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(t => { genNpc(); N.name = "Ugo" + t; N.occ = "Oste" + t; N.segreto = "Segreto" + t; render(); saveNpc(); openSaved(); }, TRAP);
  await page.evaluate(() => delNpc(roster()[0].id));
  await expect(page.locator("#uiUndo")).toContainText("Ugo");
  expect(await xss(page)).toEqual({ script: 0, markup: 0 });
});

test("Mondo: elementi salvati con HTML nei campi", async ({ page }) => {
  await open(page, "world"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(t => { run("set"); const P = o => typeof o === "string" ? o + t : Array.isArray(o) ? o.map(P) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ["type", "seed", "env", "id", "v"].includes(k) ? v : P(v)])) : o;
    CUR.set = P(CUR.set); show("set"); saveCur("set"); openSaved(); }, TRAP);
  expect(await xss(page)).toEqual({ script: 0, markup: 0 });
});

test("Diario: voci con HTML e registro esperienza con nomi con apostrofo", async ({ page }) => {
  await open(page, "journal");
  await setLs(page, { dnd5e_diary: { sessions: [{ id: "s1", date: "2026-10-01", title: "T" + TRAP, text: "x" + TRAP }], npcs: [{ id: "n1", name: "N" + TRAP, where: "", att: "Neutrale", note: TRAP }],
    places: [{ id: "p1", name: "L" + TRAP, note: "" }], hooks: [{ id: "h1", text: "H" + TRAP, done: false }], xp: { mode: "xp", total: 0, migrated: true, log: [], pcs: { "n:d'arco": { name: "D'Arco", xp: 500 } } } } });
  await page.reload(); await page.waitForTimeout(300);
  await page.locator("#xpBody input[type=checkbox]").first().uncheck();                    // l'apostrofo non deve rompere il controllo
  expect(await xss(page)).toEqual({ script: 0, markup: 0 });
});

test("import: da file, backup e link vengono tolti < e >, non le virgolette né &", async ({ page }) => {
  await open(page, "journal");
  expect(await page.evaluate(() => cleanStr('D&D "x" <b>y</b>'))).toBe('D&D "x" by/b');
  expect(await page.evaluate(() => JSON.parse(safeStoreVal("dnd5e_puzzles", JSON.stringify([{ id: "p", player: '<h3>ok</h3><img src=x onerror="a()"><a href="javascript:a()">l</a>' }])))[0].player)).toBe('<h3>ok</h3><img src="x"><a>l</a>');
});

test("Mappe: mappa importata malevola normalizzata, etichette come testo", async ({ page }) => {
  await open(page, "maps"); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  const m = await page.evaluate(t => { const n = normalizeMap({ name: "M", grid: { w: 5000, h: -3 }, terrain: ["zz9"], palette: [{ k: "x", tex: "a b<" }],
    objects: [{ type: "evil", x: 1 }, { type: "trap", x: 999, y: 2, label: "T" + t, icon: "nope", img: "x y", ref: { t: "hack", id: "1" } }], bg: { img: "<x>" } });
    openMap(n); return { w: n.grid.w, h: n.grid.h, objs: n.objects.length, o: n.objects[0], bg: n.bg || null, tex: n.palette[0].tex || null }; }, TRAP);
  expect(m.w).toBe(100); expect(m.h).toBe(5); expect(m.objs).toBe(1);
  expect(m.o.x).toBe(99); expect(m.o.icon).toBe("trap-mask"); expect(m.o.img).toBeUndefined(); expect(m.o.ref).toBeUndefined();
  expect(m.bg).toBeNull(); expect(m.tex).toBeNull();
  expect(await xss(page)).toEqual({ script: 0, markup: 0 });
});
