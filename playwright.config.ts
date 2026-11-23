import { defineConfig } from "@playwright/test";

// Browser tests. Run `npm run test:e2e` after a build made with
// NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54398 (the mock in e2e/mock-supabase.mjs).
const port = Number(process.env.E2E_PORT || 3200);

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // the page's short fade-ins would otherwise be caught half-way by contrast checks and quick clicks
    reducedMotion: "reduce",
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {},
  },
  webServer: [
    { command: "node e2e/mock-supabase.mjs", port: 54398, reuseExistingServer: true },
    { command: `npx next start -p ${port}`, port, reuseExistingServer: true, timeout: 60_000 },
  ],
});
