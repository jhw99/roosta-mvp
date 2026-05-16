import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — Roosta Solana QA.
 *
 * - PORT 3100 by default so it does not collide with `next dev` (3000).
 * - PLAYWRIGHT_USE_PROD=1 boots `next build && next start` (production
 *   bundle); otherwise `next dev` for fast inner loop.
 * - `NEXT_PUBLIC_ENABLE_TEST_WALLET=1` is forced into the webServer env so
 *   the KeypairWalletAdapter is registered. This must NEVER be set in real
 *   production deploys; the test adapter only signs with the keypair we
 *   inject from the test fixture via page.addInitScript.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const USE_PROD = process.env.PLAYWRIGHT_USE_PROD === "1";
const APP_DIR = "app";

const startCmd = USE_PROD
  ? `cd ${APP_DIR} && NEXT_PUBLIC_ENABLE_TEST_WALLET=1 npx next start -p ${PORT}`
  : `cd ${APP_DIR} && NEXT_PUBLIC_ENABLE_TEST_WALLET=1 npx next dev -p ${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false, // on-chain ops use shared keypair / nonce
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: USE_PROD
      ? `cd ${APP_DIR} && NEXT_PUBLIC_ENABLE_TEST_WALLET=1 npx next build && ${startCmd}`
      : startCmd,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { NEXT_PUBLIC_ENABLE_TEST_WALLET: "1" },
  },
});
