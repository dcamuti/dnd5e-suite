// Uso senza connessione: service worker, font locali, manifest dell'app.
const fs = require("fs"), path = require("path");
const { test, expect } = require("./helpers");
const ROOT = path.join(__dirname, "..");
const TOOLS = ["characters", "npcs", "encounters", "world", "journal", "puzzles", "maps"];

test("nessuna pagina chiede risorse a server esterni; manifest e file elencati nel service worker esistono", async () => {
  for (const f of ["index.html", ...TOOLS.map(t => t + "/index.html")]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    expect(src.match(/(?:@import|src=|href=|url\()\s*["'(]*https?:\/\/(?!dcamuti\.github\.io)[^"')\s]+\.(?:css|js|woff2?|png|jpg)|fonts\.googleapis|fonts\.gstatic/g) || [], f).toEqual([]);
    expect(src, f).toContain('rel="manifest"');
  }
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), listed = [...sw.matchAll(/"([\w\/.-]+\.(?:html|woff2|png|webmanifest))"/g)].map(m => m[1]);
  expect(listed.length).toBeGreaterThan(15);
  for (const f of listed) expect(fs.existsSync(path.join(ROOT, f)), f).toBe(true);
  for (const t of TOOLS) expect(listed).toContain(t + "/index.html");
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  for (const i of man.icons) expect(fs.existsSync(path.join(ROOT, i.src)), i.src).toBe(true);
});

test.describe("con il service worker", () => {
  test.use({ serviceWorkers: "allow" });
  test("dopo la prima visita tutti i tool si aprono senza connessione, con font e dati", async ({ page, context }) => {
    await page.goto("/index.html");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => new Promise(r => { const t = setInterval(() => { if (navigator.serviceWorker.controller) { clearInterval(t); r(); } }, 50); })));
    await page.goto("/npcs/index.html"); await page.evaluate(() => { genNpc(); N.name = "Mira"; saveNpc(); });
    await page.click("#snData > .btn"); await expect(page.locator("#snDataInfo")).toContainText("Disponibile anche senza connessione");
    await context.setOffline(true);
    expect(await page.evaluate(() => fetch("../README.md").then(r => r.status).catch(() => "senza rete"))).toBe("senza rete");   // la rete manca davvero, anche per il service worker
    for (const t of TOOLS) {                                                               // anche i tool mai aperti prima
      await page.goto("/" + t + "/index.html"); await expect(page.locator(".suite-nav")).toBeVisible();
      expect(await page.evaluate(() => typeof dbGet), t).toBe("function");
    }
    await page.goto("/npcs/index.html#cerca"); await page.fill("#gsQ", "mira"); await expect(page.locator(".gs-it")).toHaveCount(1);
    expect(await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check("700 20px Cinzel")))).toBe(true);
    await page.goto("/index.html"); await expect(page.locator("h1")).toBeVisible();
    await page.goto("/maps/"); await expect(page.locator("#vp")).toBeVisible();              // la cartella vale come il suo index.html
    /* tornata la rete, la pagina servita è quella online e la copia locale viene aggiornata */
    await context.setOffline(false); await page.goto("/journal/index.html"); await expect(page.locator(".suite-nav")).toBeVisible();
    expect(await page.evaluate(async () => (await (await caches.open("dnd5e-suite-v1")).keys()).length)).toBeGreaterThan(15);
  });
});
