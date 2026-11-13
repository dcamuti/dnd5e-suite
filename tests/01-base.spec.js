// Controlli di base su tutti i tool: caricamento, navigazione, accessibilità dei controlli.
const { test, expect, TOOLS, open } = require("./helpers");

test("la home elenca i 7 tool", async ({ page }) => {
  await page.goto("/index.html");
  const links = await page.locator(".tools a").evaluateAll(a => a.map(x => x.getAttribute("href")));
  expect(links).toEqual(["characters/index.html", "npcs/index.html", "encounters/index.html", "world/index.html", "journal/index.html", "puzzles/index.html", "maps/index.html"]);
});

for (const t of TOOLS) {
  test(`${t}: si apre senza errori, con barra dei tool e menu Dati`, async ({ page }) => {
    await open(page, t);
    await expect(page.locator(".suite-nav .sn-tools a.on")).toHaveCount(1);
    expect(await page.locator(".suite-nav .sn-tools a[href*='index.html']").count()).toBe(8); // home + 7 tool
    await page.click("#snData > .btn");
    await expect(page.locator("#snData")).toHaveClass(/open/);
    await expect(page.locator("#snDataInfo")).toContainText("Ultimo backup");
    await page.keyboard.press("Escape");
    await expect(page.locator("#snData")).not.toHaveClass(/open/);
  });

  test(`${t}: su smartphone la pagina non sborda e l'intestazione resta compatta`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, t);
    const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, nav: Math.round(document.querySelector(".suite-nav").getBoundingClientRect().bottom) }));
    expect(m.w).toBeLessThanOrEqual(390);
    expect(m.nav).toBeLessThan(140);
  });

  test(`${t}: i controlli cliccabili visibili sono raggiungibili da tastiera`, async ({ page }) => {
    await open(page, t);
    const unreachable = await page.evaluate(() => [...document.querySelectorAll("[onclick]")]
      .filter(e => e.offsetWidth && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|OPTION)$/.test(e.tagName))
      .filter(e => e.tabIndex < 0 && !e.querySelector("button,input,select,textarea,a[href],[onclick]")).length);
    expect(unreachable).toBe(0);
  });
}
