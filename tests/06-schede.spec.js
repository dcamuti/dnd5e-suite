// Schede PG: generazione, salvataggio, eliminazione con Annulla, salita di livello dal Diario, regole di stampa.
const { test, expect, open, ls, makeChar } = require("./helpers");

test("genera, salva, elimina con Annulla; nomi con apostrofi e virgolette non rompono i pulsanti", async ({ page }) => {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  const id = await makeChar(page, `Ser "Lupo" D'Arco & <figlio>`, 5);
  expect(id).toMatch(/^pc_[0-9a-z]+_[0-9a-z]{8}$/);
  expect((await ls(page, "dnd5e_chars"))[0].st.lv).toBe(5);
  await page.evaluate(() => openCharModal());
  await page.locator("#charModal button", { hasText: "🗑" }).first().click();
  expect((await ls(page, "dnd5e_chars")).length).toBe(0);
  await page.click("#uiUndo button");
  expect((await ls(page, "dnd5e_chars"))[0].name).toBe(`Ser "Lupo" D'Arco & <figlio>`);
});

test("«Genera»: Annulla nella finestra del livello non crea un personaggio", async ({ page }) => {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.evaluate(() => { window.__uiQueue = ["no"]; }); await page.evaluate(() => generateRandom());
  await expect(page.locator("#sheetWrap")).toBeHidden();
});

test("creazione guidata: tutti i passi senza errori per più personaggi casuali", async ({ page }) => {
  await open(page, "characters");
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => generateRandom()); await page.waitForTimeout(150);
    await page.evaluate(() => startWizard(true));
    for (let s = 0; s < 14; s++) await page.evaluate(() => { for (const q of [".spell-item", ".info-btn", ".chip"]) [...document.querySelectorAll(q)].slice(0, 2).forEach(e => e.click()); nextStep(); });
  }
});

test("salita di livello dal Diario: il link apre la scheda giusta e il livello si aggiorna senza duplicati", async ({ page, context }) => {
  await open(page, "characters"); await page.evaluate(() => localStorage.clear()); await page.reload();
  const id = await makeChar(page, "Aria", 3);
  const j = await context.newPage(); await j.goto("/journal/index.html"); await j.waitForTimeout(300);
  await j.evaluate(i => { DIA.xp.mode = "xp"; xpInit(); DIA.xp.pcs[i].xp = 2700; save(); renderXp(); }, id);
  const href = await j.locator("#xpBody a.btn").getAttribute("href"); expect(href).toContain(`#lvup=${id}&to=4`);
  const c = await context.newPage(); await c.goto("/journal/" + href); await c.waitForTimeout(500);
  expect(await c.evaluate(() => C.id)).toBe(id);
  await c.evaluate(() => { C.level = 4; renderStep(); });
  for (let s = 0; s < 14; s++) await c.evaluate(() => { try { autoOpts() } catch (e) {} try { autoSpells() } catch (e) {} try { autoAsi() } catch (e) {} nextStep(); });
  await c.evaluate(() => saveChar());
  const all = await ls(c, "dnd5e_chars"); expect(all.length).toBe(1); expect(all[0].st.lv).toBe(4);
});

test("stampa: i riquadri non si spezzano tra le pagine, quelli lunghi solo tra le voci", async ({ page }) => {
  await open(page, "characters"); await makeChar(page, "Aria", 14);
  await page.emulateMedia({ media: "print" });
  const css = await page.evaluate(() => { const g = (sel, p) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[p] : null; };
    return { box: g(".sh-box:not(.sh-spells):not(.sh-long)", "breakInside"), head: g(".sh-box h3", "breakAfter"), row: g(".sh-list li", "breakInside"), header: getComputedStyle(document.querySelector(".app-header")).display }; });
  expect(css).toEqual({ box: "avoid", head: "avoid", row: "avoid", header: "none" });
});

test("stampa compatta: niente descrizioni né personalità, meno pagine, e la stampa normale resta intera", async ({ page }) => {
  await open(page, "characters"); await makeChar(page, "Aria", 9);
  const pages = async () => ((await page.pdf({ format: "A4", printBackground: true })).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  await page.emulateMedia({ media: "print" });
  const full = await pages(), names = await page.evaluate(() => document.querySelectorAll(".sh-list li > b, .sh-trait > b").length);
  expect(await page.evaluate(() => [...document.querySelectorAll(".ft-desc")].some(e => e.offsetParent))).toBe(true);
  await page.evaluate(() => document.documentElement.classList.add("print-compact"));
  const vis = sel => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).length, sel);
  expect(await vis(".ft-desc")).toBe(0); expect(await vis(".sh-pers")).toBe(0);
  expect(await vis(".sh-list li > b, .sh-trait:not(.sh-xtra) > b")).toBeGreaterThan(5);            // i nomi restano
  expect(await vis(".sh-combat .cbox")).toBeGreaterThan(5); expect(await vis(".sh-line")).toBeGreaterThan(20);
  const compact = await pages(); expect(compact).toBeLessThan(full); expect(compact).toBeLessThanOrEqual(2); expect(names).toBeGreaterThan(5);
  /* il pulsante mette la classe solo per la durata della stampa */
  await page.evaluate(() => { document.documentElement.classList.remove("print-compact"); window.print = () => { window.__cls = document.documentElement.classList.contains("print-compact"); window.dispatchEvent(new Event("afterprint")); }; printCompact(); });
  expect(await page.evaluate(() => [window.__cls, document.documentElement.classList.contains("print-compact")])).toEqual([true, false]);
});
