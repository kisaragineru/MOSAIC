import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgres://mosaic_app:app_dev_pw@localhost:5432/mosaic_e2e";
// Use a pre-installed Chromium when the bundled one is unavailable (CI images, sandboxes).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
    ...devices["Pixel 7"],
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DB,
      APP_ORIGIN: `http://localhost:${PORT}`,
      ANTHROPIC_API_KEY: "",
      RATE_LIMIT_SALT: "e2e",
      // Specs that register several people send their own client IP, so the per-IP registration
      // limit applies per simulated device rather than to the whole suite.
      TRUST_PROXY: "1",
      CLIENT_IP_HEADER: "x-e2e-client-ip",
    },
  },
});
