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

test("Incontri: mostro homebrew con HTML in ogni campo, in bestiario, scheda, incontro e tracker", async ({ page }) => {
  await open(page, "encounters"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(t => { const hb = { id: "hb_1", n: "Trap Beast" + t, it: "Belva" + t, src: "HB" + t, cr: "1", sz: "Media", tp: "bestia" + t, al: "caotico" + t, ac: "13" + t, hp: "22 (4d8+4)" + t, spd: "9 m" + t, ab: [10, 12, 12, 3, 10, 6],
      sv: "Des +3" + t, sk: "Furtività" + t, vul: "v" + t, res: "r" + t, imm: "i" + t, cim: "c" + t, sen: "s" + t, lg: "l" + t, env: ["sottosuolo"],
      tr: [["Tratto" + t, "descr" + t]], act: [["Morso" + t, "Attacco con arma da mischia: +4 al colpire. Colpito: 5 (1d6+2) danni" + t]], rea: [["Rea" + t, "x" + t]], leg: [["Leg" + t, "y" + t]] };
    localStorage.setItem("dnd5e_enc_hb", JSON.stringify([hb])); localStorage.setItem("dnd5e_enc_saved", JSON.stringify([{ id: "enc_1", name: "Salvato" + t, enc: [{ n: hb.n, q: 2 }] }])); }, TRAP);
  await page.reload(); await page.waitForTimeout(300);
  await page.evaluate(() => { showTab("best"); renderBest(); openSb(MONSTERS.length - 1); SBV = 1; renderSbModal(); });
  await expect(page.locator("#sbBody .mname")).toContainText("Belva"); await expect(page.locator("#sbBody")).toContainText("<b data-xss>X</b>");   // mostrato come testo
  await page.evaluate(() => { document.getElementById("sbModal").style.display = "none"; showTab("hb"); renderHbList(); hbEdit(0); hbPreview(); document.getElementById("sbModal").style.display = "none"; hbCancel();
    showTab("gen"); loadEnc("enc_1"); encToTracker(); showTab("track"); TRK.list.forEach((u, i) => u.init = 10 - i); nextTurn(); dmg(TRK.list[0].id, -3); });
  await expect(page.locator(".trk-row")).toHaveCount(2);
  expect(await xss(page)).toEqual({ script: 0, markup: 0 });
});

test("Schede PG: contenuti homebrew con HTML in ogni campo, nei passi della creazione e nella scheda", async ({ page }) => {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(t => localStorage.setItem("dnd5e_homebrew", JSON.stringify({
    races: [{ n: "Razza" + t, size: "Medium", spd: 30, dv: 60, asi: { str: 2 }, traits: ["Tratto" + t, "Altro: descr" + t] }], spells: [{ n: "Magia" + t, it: "MagiaIT" + t, lv: 1, school: "V", classes: "wsbcdprka", det: "dettagli" + t }],
    feats: [{ n: "Talento" + t, it: "TalentoIT" + t, desc: "desc" + t }], bgs: [{ n: "Sfondo" + t, sk: ["Athletics", "Stealth"], x: "extra" + t }], weapons: [{ n: "Arma" + t, it: "ArmaIT" + t, dmg: "1d8 tagl." + t, props: "prop" + t }],
    armors: [{ n: "Corazza" + t, it: "CorazzaIT" + t, cat: "light", ac: 12, note: "nota" + t }], shields: [{ n: "Scudone" + t, it: "Rock & Roll", bonus: 3, note: "nota" + t }] })), TRAP);
  await page.reload(); await page.waitForTimeout(300);
  /* il nome fa da chiave: perde < > & " e resta leggibile; i testi da mostrare restano interi ma innocui */
  expect(await page.evaluate(() => [HB.races[0].n, RACES[RACES.length - 1].n])).toEqual(["RazzaPX'amp;img src=x onerror=window.__xss=(window.__xss||0)+1b data-xssX/b", "RazzaPX'amp;img src=x onerror=window.__xss=(window.__xss||0)+1b data-xssX/b"]);
  await page.evaluate(async t => { window.uiPrompt = async () => "8"; await generateRandom(); C.name = "Eroe" + t; C.player = "G" + t; C.race = RACES[RACES.length - 1].n; C.bg = BACKGROUNDS[BACKGROUNDS.length - 1].n; C.feat = FEATS[FEATS.length - 1][0];
    const g = gear(); g.armor = ARMORS[ARMORS.length - 1][0]; g.shield = SHIELDS[SHIELDS.length - 1][0]; g.weapons = [WEAPONS[WEAPONS.length - 1][0]]; g.inv = "inv" + t;
    if (C.mag) Object.keys(C.mag).forEach(k => { if (Array.isArray(C.mag[k])) C.mag[k].push(SPELLS[SPELLS.length - 1][0]); });
    openHbModal(); closeHbModal(); for (let i = 0; i < 6; i++) { step = i; renderStep(); } buildSheet(); }, TRAP);
  await expect(page.locator("#sheet")).toContainText("TalentoIT"); await expect(page.locator("#sheet")).toContainText("Rock & Roll");   // una & vera non viene raddoppiata
  expect(await page.evaluate(() => document.getElementById("sheet").textContent.includes("&amp;amp;"))).toBe(false);
  expect(await xss(page)).toEqual({ script: 0, markup: 0 });
});
