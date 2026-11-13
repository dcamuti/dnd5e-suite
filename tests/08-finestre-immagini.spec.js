// Finestre della suite (tastiera, Annulla, conferme) e libreria delle immagini.
const fs = require("fs");
const { test, expect, open, ls, tmpFile } = require("./helpers");
// PNG 2×2 valido, per i test di caricamento
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAr7cV9sAAAAASUVORK5CYII=", "base64");
const dialog = page => page.evaluate(() => { const o = document.querySelector(".ui-ov"); return o ? { title: (o.querySelector("h3") || {}).textContent || "", buttons: [...o.querySelectorAll(".ui-btns .btn")].map(b => b.textContent) } : null; });

test("finestre: modulo da tastiera, Tab resta dentro, Esc annulla", async ({ page }) => {
  await open(page, "encounters"); await page.evaluate(() => { localStorage.clear(); window.__uiManual = true; showTab("track"); addPc(); });
  await page.waitForTimeout(200);
  expect((await dialog(page)).buttons).toEqual(["Annulla", "Aggiungi"]);
  await page.keyboard.type("Aria"); for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest(".ui-ov"))).toBe(true);
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);
  expect(await dialog(page)).toBeNull(); expect(await page.evaluate(() => TRK.list.length)).toBe(0);
});

test("eliminazione con Annulla: la successiva rende definitiva la precedente", async ({ page }) => {
  await open(page, "npcs"); await page.evaluate(() => { localStorage.clear(); genNpc(); N.name = "Ugo"; saveNpc(); genNpc(); N.name = "Bruna"; saveNpc(); });
  const ids = (await ls(page, "dnd5e_npcs")).map(n => n.id);
  await page.evaluate(i => { delNpc(i[0]); delNpc(i[1]); }, ids);
  await expect(page.locator("#uiUndo")).toHaveCount(1);
  await page.click("#uiUndo button");
  expect((await ls(page, "dnd5e_npcs")).length).toBe(1);
});

test("ripristino del backup: conferma esplicita in rosso, Esc lascia i dati intatti", async ({ page }) => {
  await open(page, "journal"); await page.evaluate(() => { localStorage.clear(); dbSet("npcs", [{ id: "npc_x", name: "Resta" }]); window.__uiManual = true; });
  const f = tmpFile("bk.json", JSON.stringify({ type: "dnd5e_suite_backup", ver: 3, schema: 2, store: { dnd5e_npcs: "[]" } }));
  await page.setInputFiles("#bkFile", f); await page.waitForTimeout(300);
  expect((await dialog(page)).buttons).toEqual(["Annulla", "Sostituisci tutti i dati"]);
  await expect(page.locator(".ui-ov .btn.danger")).toHaveCount(1);
  await page.keyboard.press("Escape"); await page.waitForTimeout(150);
  expect((await ls(page, "dnd5e_npcs"))[0].name).toBe("Resta");
});

test("immagini: caricamento, doppione riconosciuto, SVG rifiutato, la mappa esportata le porta con sé", async ({ page }) => {
  await open(page, "maps"); await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase("dnd5e_assets"); }); await page.reload(); await page.waitForTimeout(400);
  const upload = async (file) => { const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.evaluate(() => { terrUpload(1); })]); await fc.setFiles(file); await page.waitForTimeout(700); };
  await upload({ name: "pietra.png", mimeType: "image/png", buffer: PNG });
  await upload({ name: "pietra.png", mimeType: "image/png", buffer: PNG });
  expect(await page.evaluate(() => imgList().length)).toBe(1);
  expect(await page.evaluate(() => imgOk(M.palette[1].tex))).toBe(true);
  await page.evaluate(() => { window.__uiLog = []; });
  await upload({ name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
  expect(await page.evaluate(() => [imgList().length, window.__uiLog.length])).toEqual([1, 1]);   // rifiutato con un avviso
  const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => { exportJson(); })]);
  const d = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  expect(d.assets.length).toBe(1); expect(d.assets[0].data.startsWith("data:image/")).toBe(true);
  await page.evaluate(async () => { for (const m of imgList()) await assetDel(m.id); await loadLibrary(); });
  // import come lo fa l'utente: menu ⋯ → «Importa mappa» → scelta del file
  const f = tmpFile("mappa.json", JSON.stringify(d));
  await page.click(".app-header .hmenu > .btn");
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.click(".app-header .hmenu-list >> text=Importa mappa")]);
  await fc.setFiles(f); await page.waitForTimeout(900);
  expect(await page.evaluate(() => [imgList().length, imgOk(M.palette[1].tex), mapsAll().length])).toEqual([1, true, 2]);
});
