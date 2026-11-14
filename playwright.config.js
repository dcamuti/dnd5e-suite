// Configurazione dei test: un piccolo server locale serve la cartella del repository, i test usano Chromium.
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  timeout: 45000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  // channel "chromium": usa il Chromium completo in modalità headless (lo stesso installato da «npx playwright install chromium»)
  use: { channel: "chromium", baseURL: "http://localhost:4173", viewport: { width: 1400, height: 900 }, acceptDownloads: true, trace: "retain-on-failure",
    serviceWorkers: "block" },   // i test normali non passano dal service worker; lo prova tests/14-offline
  webServer: { command: "node tests/server.js", url: "http://localhost:4173/index.html", reuseExistingServer: !process.env.CI, timeout: 20000 },
});
