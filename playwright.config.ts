import { generateKeyPairSync } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgres://mosaic_app:app_dev_pw@localhost:5432/mosaic_e2e";
// Use a pre-installed Chromium when the bundled one is unavailable (CI images, sandboxes).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);

// Push notification keys for this run only (made fresh each time; nothing is sent to a real push service).
const vapid = (() => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  return {
    pub: Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, "base64url"), Buffer.from(pub.y!, "base64url")]).toString("base64url"),
    priv: privateKey.export({ format: "jwk" }).d!,
  };
})();

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    // The suite checks behaviour, not motion: with reduced motion the app drops its animations.
    reducedMotion: "reduce",
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
    ...devices["Pixel 7"],
  },
  webServer: [
  {
    // A stand-in web page with an Open Graph card (link preview tests).
    command: "node tests/e2e/og-server.mjs",
    url: "http://127.0.0.1:4599/health",
    reuseExistingServer: false,
    env: { OG_PORT: "4599" },
  },
  {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Link previews may reach only this local test page (never set outside tests).
      LINK_PREVIEW_TEST_HOSTS: "127.0.0.1:4599",
      DATABASE_URL: E2E_DB,
      APP_ORIGIN: `http://localhost:${PORT}`,
      // AI goes to the stand-in above (never set outside tests): AI-on screens are always exercised.
      ANTHROPIC_API_KEY: "e2e-stand-in",
      ANTHROPIC_BASE_URL: "http://127.0.0.1:4599",
      RATE_LIMIT_SALT: "e2e",
      // Specs that register several people send their own client IP, so the per-IP registration
      // limit applies per simulated device rather than to the whole suite.
      TRUST_PROXY: "1",
      CLIENT_IP_HEADER: "x-e2e-client-ip",
      DEV_TOOLS: "on",
      // Specs fill sign-up forms faster than a person could (the bot timing check is tested on its own).
      SIGNUP_MIN_SECONDS: "0",
      VAPID_PUBLIC_KEY: vapid.pub,
      VAPID_PRIVATE_KEY: vapid.priv,
      VAPID_SUBJECT: "mailto:e2e@example.test",
      // Sign-in with Google / Facebook goes to the stand-in provider above (never set outside tests).
      OAUTH_TEST_BASE: "http://127.0.0.1:4599",
      GOOGLE_CLIENT_ID: "test-google",
      GOOGLE_CLIENT_SECRET: "test-google-secret",
      FACEBOOK_APP_ID: "test-facebook",
      FACEBOOK_APP_SECRET: "test-facebook-secret",
    },
  },
  ],
});
