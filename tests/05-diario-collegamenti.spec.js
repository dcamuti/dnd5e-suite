// Collegamenti tra i tool: invio al Diario senza doppioni, origine delle voci, fazioni, link ↗.
const { test, expect, open, ls } = require("./helpers");

test("NPC → Diario: una sola voce, note e atteggiamento conservati, riconosciuto anche se rinominato", async ({ page }) => {
  await open(page, "npcs"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { genNpc(); }); await page.evaluate(() => npcToDiary());
  let d = await ls(page, "dnd5e_diary"); expect(d.npcs.length).toBe(1); expect(d.npcs[0].src.t).toBe("npc");
  await page.evaluate(() => { const D = dbGet("diary"); D.npcs[0].att = "Alleato"; D.npcs[0].note = "Ci deve un favore"; dbSet("diary", D); N.name = "Nome Cambiato"; N.where = "Porto"; });
  await page.evaluate(() => npcToDiary());
  d = await ls(page, "dnd5e_diary");
  expect(d.npcs.length).toBe(1); expect(d.npcs[0]).toMatchObject({ name: "Nome Cambiato", where: "Porto", att: "Alleato", note: "Ci deve un favore" });
  await page.evaluate(() => { window.__uiQueue = ["no"]; N.where = "Altrove"; }); await page.evaluate(() => npcToDiary());
  expect((await ls(page, "dnd5e_diary")).npcs[0].where).toBe("Porto");                      // «Lascia com'è»
});

test("Mondo → Diario: un insediamento mandato due volte non crea doppioni e chiede una volta sola", async ({ page }) => {
  await open(page, "world"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { run("set"); }); await page.evaluate(() => toDiaryCur("set"));
  const n = d => d.npcs.length + d.places.length + d.hooks.length, n1 = n(await ls(page, "dnd5e_diary"));
  await page.evaluate(() => { window.__uiLog = []; }); await page.evaluate(() => toDiaryCur("set"));
  expect(n(await ls(page, "dnd5e_diary"))).toBe(n1);
  expect((await page.evaluate(() => window.__uiLog)).length).toBe(1);
  await page.evaluate(() => saveCur("set"));
  const sid = (await ls(page, "dnd5e_world")).saved[0].id, d = await ls(page, "dnd5e_diary");
  expect(new Set([...d.npcs, ...d.places, ...d.hooks].filter(x => x.src).map(x => x.src.id))).toEqual(new Set([sid]));
});

test("Diario: ↗ apre l'originale, grigio se non esiste più; Annulla ripristina una voce al suo posto", async ({ page, context }) => {
  await open(page, "npcs"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { genNpc(); }); await page.evaluate(() => npcToDiary()); await page.evaluate(() => saveNpc());
  const id = await page.evaluate(() => N.id);
  await open(page, "journal");
  const href = await page.locator("a.srcl").first().getAttribute("href"); expect(href).toContain("#open=" + id);
  const p2 = await context.newPage(); await p2.goto("/journal/" + href); await p2.waitForTimeout(400);
  expect(await p2.evaluate(() => N && N.id)).toBe(id); expect(await p2.evaluate(() => location.hash)).toBe("");
  await p2.evaluate(i => dbSet("npcs", roster().filter(x => x.id !== i)), id); await page.waitForTimeout(400);
  await expect(page.locator("a.srcl")).toHaveCount(0); await expect(page.locator("span.srcl.off")).toHaveCount(1);
  await page.evaluate(() => { addRow("hooks"); addRow("hooks"); DIA.hooks[0].text = "Primo"; DIA.hooks[1].text = "Secondo"; save(); render(); del("hooks", DIA.hooks[1].id); });
  await page.click("#uiUndo button");
  expect(await page.evaluate(() => DIA.hooks.map(h => h.text))).toEqual(["Primo", "Secondo"]);
});

test("fazioni: l'NPC segue il nome nel Mondo, il Mondo elenca i membri, eliminazione segnalata", async ({ page, context }) => {
  await open(page, "world"); await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => newFaction()); const f = (await ls(page, "dnd5e_world")).factions[0];
  const n = await context.newPage(); await n.goto("/npcs/index.html"); await n.waitForTimeout(300);
  await n.evaluate(fid => { genNpc(); N.fazione = { nome: "vecchio nome", scopo: "", ruolo: "spia", world: true, fzId: fid }; saveNpc(); render(); }, f.id);
  await expect(n.locator("#dossier")).toContainText(f.name);
  await page.reload(); await page.evaluate(() => showTab("fz"));
  await expect(page.locator(`#fz-${f.id} a[href*='#open=']`)).toHaveCount(1);
  await page.evaluate(fid => { const W = world(); W.factions = W.factions.filter(x => x.id !== fid); worldSave(W); }, f.id);
  await n.evaluate(() => render());
  await expect(n.locator("#dossier")).toContainText("non più presente nel Mondo");
});

test("Diario: sezioni comprimibili, stato ricordato", async ({ page }) => {
  await open(page, "journal");
  await page.click("[data-collapse=panoramica] > .cl-head");
  await page.reload(); await page.waitForTimeout(200);
  await expect(page.locator("[data-collapse=panoramica]")).toHaveClass(/collapsed/);
  await page.locator("[data-collapse=panoramica] > .cl-head").press("Enter");
  await expect(page.locator("[data-collapse=panoramica]")).not.toHaveClass(/collapsed/);
});
