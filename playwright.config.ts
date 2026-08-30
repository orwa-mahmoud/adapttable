import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke suite over the real showcase (`apps/showcase`), which mounts every
 * genuine adapter. jsdom unit tests can't see the bug class this guards —
 * overlay z-index / popover bleed-through, drawer backdrops, sticky headers,
 * pinned-column offsets and virtualization DOM bounds — so these run in a real
 * browser. Depth stays in the unit suites; this is a smoke net.
 */
const PORT = 4321;
/** The dev server the `chromium-dev` project needs, on its own port. */
const DEV_PORT = 4322;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Five GitHub-hosted boxes (`--shard=i/5` in e2e.yml) × 1 Chromium.
  // Four workers on one runner contended and stalled; one per box is enough.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // The dev-only file below is the one thing this project must not claim.
      testIgnore: "**/dev-server/**",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Behaviour that exists only while Vite is serving — today, the real
      // EventSource behind the realtime feed. Kept to one file so the suite
      // itself never waits on a cold route compile again.
      name: "chromium-dev",
      testDir: "./e2e/dev-server",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${DEV_PORT}`,
      },
    },
  ],
  webServer: [
    {
      // A production build served from disk. The showcase resolves
      // `@adapttable/*` to package SOURCE and `vite build` follows those
      // aliases, so the suite still exercises the current library — with every
      // route already compiled, which is what a dev server could not promise
      // under parallel load.
      command: `node scripts/serve-showcase.mjs --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      // The build runs inside this command; a cold one has to fit here.
      timeout: 600_000,
    },
    {
      command: `pnpm --filter @adapttable/showcase exec vite --port ${DEV_PORT} --strictPort`,
      url: `http://localhost:${DEV_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
