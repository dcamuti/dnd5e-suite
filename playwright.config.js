// Configurazione dei test: un piccolo server locale serve la cartella del repository, i test usano Chromium.
// Sono definiti anche Firefox e WebKit (il motore di Safari): servono «npx playwright install firefox webkit» e si lanciano
// con «npm run test:altri». «npm test» usa solo Chromium. Su GitHub Actions gli altri due girano in un lavoro a parte,
// che non blocca quello principale.
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  timeout: 45000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: "http://localhost:4173", viewport: { width: 1400, height: 900 }, acceptDownloads: true, trace: "retain-on-failure",
    serviceWorkers: "block" },   // i test normali non passano dal service worker; lo prova tests/14-offline
  projects: [
    // channel "chromium": usa il Chromium completo in modalità headless (lo stesso installato da «npx playwright install chromium»)
    { name: "chromium", use: { browserName: "chromium", channel: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: { command: "node tests/server.js", url: "http://localhost:4173/index.html", reuseExistingServer: !process.env.CI, timeout: 20000 },
});
