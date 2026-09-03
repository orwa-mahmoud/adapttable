import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke suite over the real showcase (`apps/showcase`), which mounts every
 * genuine adapter. jsdom unit tests can't see the bug class this guards —
 * overlay z-index / popover bleed-through, drawer backdrops, sticky headers,
 * pinned-column offsets and virtualization DOM bounds — so these run in a real
 * browser. Depth stays in the unit suites; this is a smoke net.
 *
 * Tiers:
 * - Per-PR / `pnpm test:e2e`: Chromium (+ the Vite-only `chromium-dev` file).
 * - Nightly / pre-release (`.github/workflows/e2e-nightly.yml`): Firefox,
 *   WebKit, Pixel 5, and Chromium visual baselines. Those projects are always
 *   defined here so a local `playwright test --project=firefox` works; the
 *   default npm script and the PR shards pass `--project=chromium` so the
 *   extra browsers never run on every PR.
 */
const PORT = 4321;
/** The dev server the `chromium-dev` project needs, on its own port. */
const DEV_PORT = 4322;

/** Smoke the extra browsers run. Not the full Chromium suite. */
const CROSS_BROWSER_SPECS = [
  "**/nightly-smoke.spec.ts",
  "**/axe-audit.spec.ts",
  "**/aria-parity.spec.ts",
  "**/accessibility-page.spec.ts",
  "**/rtl.spec.ts",
];

const MOBILE_SPECS = [
  "**/nightly-smoke.spec.ts",
  "**/mobile-page.spec.ts",
  "**/axe-audit.spec.ts",
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Nine GitHub-hosted boxes (`--shard=i/9` in pr.yml) × 1 Chromium.
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
      // Dev-only, visual baselines, and the extra-browser smoke stay off the
      // per-PR project. `pnpm test:e2e` also passes `--project=chromium`.
      testIgnore: [
        "**/dev-server/**",
        "**/visual/**",
        "**/nightly-smoke.spec.ts",
      ],
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
    {
      name: "firefox",
      testMatch: CROSS_BROWSER_SPECS,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: CROSS_BROWSER_SPECS,
      use: { ...devices["Desktop WebKit"] },
    },
    {
      name: "mobile-chrome",
      testMatch: MOBILE_SPECS,
      use: { ...devices["Pixel 5"] },
    },
    {
      // Chromium-only visual baselines. OS is part of the path because font
      // rasterisation differs; CI nightly is Linux. See e2e/visual/README.md.
      name: "chromium-visual",
      testMatch: "**/visual/**/*.spec.ts",
      snapshotPathTemplate: "e2e/visual/baselines/{platform}/{arg}{ext}",
      use: {
        ...devices["Desktop Chrome"],
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
