// Più campagne: dati separati per campagna, contenuti comuni condivisi, cambio sicuro, backup di tutte le campagne.
const fs = require("fs");
const { test, expect, open, ls, setLs, tmpFile } = require("./helpers");
const NPC = n => [{ id: "npc_" + n, name: n, sb: "Bandit" }];
const reg = page => ls(page, "dnd5e_camps");
/* crea una campagna dal menu Dati e aspetta la ricarica */
async function newCamp(page, name) { await page.evaluate(n => { window.__uiQueue = [{ btn: "yes", fields: { v: n } }]; }, name);
  await page.click("#snData > .btn"); await Promise.all([page.waitForEvent("load"), page.click('#snCamp button:has-text("Nuova campagna")')]); await page.waitForTimeout(250); }
async function pick(page, name) { await page.evaluate(n => { window.__uiQueue = [n]; }, name);
  await page.click("#snData > .btn"); await Promise.all([page.waitForEvent("load"), page.click('#snCamp button:has-text("Cambia campagna")')]); await page.waitForTimeout(250); }

test("primo avvio: i dati esistenti diventano «La mia campagna», senza spostare nulla", async ({ page }) => {
  await open(page, "npcs"); await page.evaluate(() => localStorage.clear());
  await setLs(page, { dnd5e_schema: "2", dnd5e_npcs: NPC("Mira") }); await page.reload(); await page.waitForTimeout(250);
  const r = await reg(page); expect(r.list.map(c => c.name)).toEqual(["La mia campagna"]); expect(r.cur).toBe(r.list[0].id);
  expect(await ls(page, "dnd5e_schema")).toBe(3); expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Mira");
  await page.click("#snData > .btn"); await expect(page.locator("#snCamp .mi-note")).toContainText("La mia campagna");
  await expect(page.locator("#snCamp .mi-it")).toHaveCount(4);                                  // con una sola campagna: nuova, rinomina, esporta, importa
  await expect(page.locator("#snData > .btn .lbl")).toHaveText("Dati");
});

test("nuova campagna e ritorno: dati separati, homebrew e preferenze in comune", async ({ page }) => {
  await open(page, "npcs"); await page.evaluate(() => localStorage.clear());
  await setLs(page, { dnd5e_npcs: NPC("Mira"), dnd5e_enc_hb: [{ id: "hb_1", n: "Belva", it: "Belva" }], dnd5e_diary: { sessions: [{ id: "ses_1", title: "Uno" }] }, dnd5e_ui: { x: 1 } });
  await page.reload(); await newCamp(page, "Strahd <b>");
  let r = await reg(page); expect(r.list.map(c => c.name)).toEqual(["La mia campagna", "Strahd b"]); expect(r.cur).toBe(r.list[1].id);
  expect(await ls(page, "dnd5e_npcs")).toBe(null); expect(await ls(page, "dnd5e_diary")).toBe(null);
  expect((await ls(page, "dnd5e_enc_hb"))[0].n).toBe("Belva"); expect((await ls(page, "dnd5e_ui")).x).toBe(1);
  expect(JSON.parse((await ls(page, "dnd5e_camp_" + r.list[0].id)).dnd5e_npcs)[0].name).toBe("Mira");
  await expect(page.locator("#snData > .btn .lbl")).toHaveText("Strahd b");
  /* eventi in ritardo delle scritture fatte dalla pagina precedente: la pagina nuova continua a salvare */
  expect(await page.evaluate(() => { const r = campReg(), fire = (key, val) => window.dispatchEvent(new StorageEvent("storage", { key, newValue: val, storageArea: localStorage }));
    fire("dnd5e_camp_" + r.list[0].id, "{}"); const a = DB_LOCK; fire("dnd5e_camps", JSON.stringify(r)); const b = DB_LOCK; fire("dnd5e_camp_" + r.cur, "{}"); return [a, b, DB_LOCK]; })).toEqual([false, false, false]);
  await page.evaluate(n => dbSet("npcs", n), NPC("Ireena"));
  await pick(page, "La mia campagna");
  r = await reg(page); expect(r.cur).toBe(r.list[0].id);
  expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Mira"); expect((await ls(page, "dnd5e_diary")).sessions[0].title).toBe("Uno");
  expect(await ls(page, "dnd5e_camp_" + r.list[0].id)).toBe(null);
  expect(JSON.parse((await ls(page, "dnd5e_camp_" + r.list[1].id)).dnd5e_npcs)[0].name).toBe("Ireena");
  /* rinomina ed elimina */
  await page.evaluate(() => { window.__uiQueue = [{ btn: "yes", fields: { v: "Faerûn" } }]; campRename(); }); await page.waitForTimeout(300);
  expect((await reg(page)).list[0].name).toBe("Faerûn");
  await page.evaluate(() => { window.__uiQueue = ["Strahd b", "yes"]; campDelete(); }); await page.waitForTimeout(500);
  r = await reg(page); expect(r.list.map(c => c.name)).toEqual(["Faerûn"]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("dnd5e_camp_")))).toEqual([]);
});

test("cambio con altre finestre aperte: le modifiche in sospeso finiscono nella campagna giusta, le altre finestre si ricaricano", async ({ page, context }) => {
  await open(page, "maps"); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
  const other = await context.newPage(); await other.goto("/npcs/index.html"); await other.waitForTimeout(300);
  await page.evaluate(() => { setMapName("Cripta"); addObject(["token", "hood", "Bandito"], 3, 3); });   // salvataggio ancora in sospeso
  const first = await page.evaluate(() => M.id);
  await Promise.all([other.waitForEvent("load"), newCamp(page, "Seconda")]); await other.waitForTimeout(300);
  const r = await reg(page);
  const parked = JSON.parse((await ls(page, "dnd5e_camp_" + r.list[0].id)).dnd5e_maps);
  expect(parked.map(m => [m.name, m.objects.length])).toEqual([["Cripta", 1]]);
  expect(await page.evaluate(() => M.id)).not.toBe(first);                                       // la nuova campagna ha la sua mappa vuota
  expect(await other.evaluate(() => [CAMP_AT_LOAD === campReg().cur, DB_LOCK])).toEqual([true, false]);
  /* una finestra rimasta indietro non può scrivere nella campagna sbagliata */
  await other.evaluate(() => { DB_LOCK = true; dbSet("npcs", [{ id: "npc_x", name: "Intruso" }]); DB_LOCK = false; });
  expect(await ls(page, "dnd5e_npcs")).toBe(null);
});

test("spazio insufficiente durante il cambio: resta tutto com'era", async ({ page }) => {
  await open(page, "npcs"); await page.evaluate(() => localStorage.clear()); await setLs(page, { dnd5e_npcs: NPC("Mira") }); await page.reload();
  const out = await page.evaluate(() => { const r = campReg(); r.list.push({ id: "cmp_b", name: "B", created: "" }); campSave(r); localStorage.setItem("dnd5e_camp_cmp_b", JSON.stringify({ dnd5e_npcs: '[{"id":"npc_b","name":"Boris"}]' }));
    const real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "dnd5e_camps") throw new Error("QuotaExceededError"); return real.call(this, k, v); };
    window.__uiQueue = ["yes"]; const ok = campSwitch("cmp_b"); Storage.prototype.setItem = real;
    return [ok, DB_LOCK, campReg().cur === r.cur, JSON.parse(localStorage.getItem("dnd5e_npcs"))[0].name, localStorage.getItem("dnd5e_camp_" + r.cur), JSON.parse(JSON.parse(localStorage.getItem("dnd5e_camp_cmp_b")).dnd5e_npcs)[0].name]; });
  expect(out).toEqual([false, false, true, "Mira", null, "Boris"]);
});

test("backup: contiene tutte le campagne; un backup precedente entra nella campagna attiva", async ({ page }) => {
  await open(page, "npcs"); await page.evaluate(() => localStorage.clear()); await setLs(page, { dnd5e_npcs: NPC("Mira") }); await page.reload();
  await newCamp(page, "Seconda"); await page.evaluate(n => dbSet("npcs", n), NPC("Ireena"));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => { backupSuite(); })]);
  const file = await dl.path(), bk = JSON.parse(fs.readFileSync(file, "utf8")), ids = (await reg(page)).list.map(c => c.id);
  expect(bk.ver).toBe(4); expect(Object.keys(bk.camps)).toEqual([ids[0]]);
  await page.evaluate(() => { localStorage.clear(); }); await page.reload();
  await Promise.all([page.waitForEvent("load"), page.setInputFiles("#bkFile", file)]); await page.waitForTimeout(250);
  let r = await reg(page); expect(r.list.map(c => c.name)).toEqual(["La mia campagna", "Seconda"]); expect(r.cur).toBe(ids[1]);
  expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Ireena");
  await pick(page, "La mia campagna"); expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Mira");
  /* backup della versione precedente (una sola campagna): sostituisce quella attiva, l'altra resta */
  const old = tmpFile("vecchio.json", JSON.stringify({ type: "dnd5e_suite_backup", ver: 3, schema: 2, store: { dnd5e_npcs: JSON.stringify(NPC("Volo")) } }));
  await Promise.all([page.waitForEvent("load"), page.setInputFiles("#bkFile", old)]); await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__uiLog || [])).toEqual([]);                           // (registro azzerato dalla ricarica)
  r = await reg(page); expect(r.list.length).toBe(2); expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Volo");
  expect(JSON.parse((await ls(page, "dnd5e_camp_" + ids[1])).dnd5e_npcs)[0].name).toBe("Ireena");
  /* la home ha lo stesso menu Dati: mostra la campagna attiva e permette di cambiarla */
  await page.goto("/index.html"); await expect(page.locator("#snData > .btn .lbl")).toHaveText("La mia campagna");
  await pick(page, "Seconda"); expect(page.url()).toMatch(/\/index\.html$/); await expect(page.locator("#snData > .btn .lbl")).toHaveText("Seconda");
  expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Ireena");
});

test("esporta e importa una campagna: arriva come nuova campagna con le sue immagini, le altre restano", async ({ page }) => {
  await open(page, "maps"); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
  /* una mappa con un'immagine, un NPC, e un mostro homebrew che non deve viaggiare */
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const img = await page.evaluate(async u => { const a = await uploadImage(new File([dataUrlToBlob(u)], "pedina.png", { type: "image/png" }), "token");
    setMapName("Cripta"); addObject(["token", "hood", "Bandito"], 3, 3); M.objects[0].img = a; saveNow(); dbSet("npcs", [{ id: "npc_1", name: "Mira", sb: "Bandit" }]); dbSet("encHb", [{ id: "hb_1", n: "Belva" }]); return a; }, png);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => { campExport(); })]);
  const file = await dl.path(), data = JSON.parse(fs.readFileSync(file, "utf8"));
  expect([data.type, data.name, data.assets.length, "dnd5e_enc_hb" in data.store, "dnd5e_camps" in data.store]).toEqual(["dnd5e_campaign", "La mia campagna", 1, false, false]);
  /* altro browser: dati diversi, libreria vuota */
  await page.evaluate(async () => { localStorage.clear(); for (const a of await assetAll()) await assetDel(a.id); }); await page.goto("/npcs/index.html");
  await page.evaluate(() => dbSet("npcs", [{ id: "npc_9", name: "Residente", sb: "Bandit" }]));
  const mine = (await reg(page)).cur;
  await page.evaluate(() => { window.__uiQueue = ["Aggiungi e apri"]; });
  await page.click("#snData > .btn");
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.click('#snCamp button:has-text("Importa una campagna")')]);
  await Promise.all([page.waitForEvent("load"), fc.setFiles(file)]); await page.waitForTimeout(300);
  const r = await reg(page); expect(r.list.map(c => c.name)).toEqual(["La mia campagna", "La mia campagna (2)"]); expect(r.cur).not.toBe(mine);
  expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Mira"); expect(await ls(page, "dnd5e_enc_hb")).toBe(null);
  expect(JSON.parse((await ls(page, "dnd5e_camp_" + mine)).dnd5e_npcs)[0].name).toBe("Residente");
  const maps = await ls(page, "dnd5e_maps"); expect(maps[0].name).toBe("Cripta");
  expect(await page.evaluate(async id => !!(await assetGet(id)), maps[0].objects[0].img)).toBe(true);
  /* un file di campagna dato a «Ripristina backup» viene riconosciuto; un backup dato a «Importa una campagna» viene rifiutato con una spiegazione */
  await page.evaluate(() => { window.__uiQueue = ["Annulla"]; }); await page.setInputFiles("#bkFile", file); await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window.__uiLog || []).join("|"))).toContain("Importare la campagna");
  await page.evaluate(() => { window.__uiQueue = ["yes"]; campImportData({ type: "dnd5e_suite_backup", store: {} }); }); await page.waitForTimeout(300);
  expect((await reg(page)).list.length).toBe(2);
});

test("libreria immagini comune: l'uso nelle altre campagne viene contato; il menu Dati mostra lo spazio usato", async ({ page }) => {
  await open(page, "maps"); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(400);
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  await page.evaluate(async u => { for (const a of await assetAll()) await assetDel(a.id); const id = await uploadImage(new File([dataUrlToBlob(u)], "pedina.png", { type: "image/png" }), "token");
    addObject(["token", "hood", "Bandito"], 3, 3); M.objects[0].img = id; saveNow(); }, png);
  await newCamp(page, "Seconda"); await page.waitForTimeout(300);
  await page.evaluate(() => openLib()); await expect(page.locator("#libBody")).toContainText("usata in 1 mappa di altre campagne"); await expect(page.locator("#libBody")).not.toContainText("non usata");
  await page.click("#libBody .xbtn"); await expect(page.locator("#uiUndo")).toContainText("era usata in 1 mappa (1 in altre campagne)");
  await page.click("#uiUndo button"); await page.waitForTimeout(300); expect(await page.evaluate(async () => (await assetAll()).length)).toBe(1);
  /* spazio usato: indicato nel menu, con avviso oltre l'80% */
  await page.evaluate(() => { document.getElementById("mdLib").style.display = "none"; });
  await page.click("#snData > .btn"); await expect(page.locator("#snSpace")).toContainText("MB"); await expect(page.locator("#snDataInfo")).not.toContainText("quasi esaurito");
  await page.evaluate(() => { localStorage.setItem("riempimento", "x".repeat(4100000)); hmCloseAll(); dataBadge(); });
  await expect(page.locator("#snData")).toHaveClass(/warn/); await page.click("#snData > .btn"); await expect(page.locator("#snDataInfo")).toContainText("Spazio quasi esaurito");
  await page.evaluate(() => localStorage.removeItem("riempimento"));
});
