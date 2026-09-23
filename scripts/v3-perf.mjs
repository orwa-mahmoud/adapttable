/**
 * v3 base-table performance — parse/build, first render, sort/page/search
 * updates, and optional panel first-open.
 *
 * Smaller bytes must not buy a slower table, a layout shift, a hydration
 * mismatch or a delayed first interaction. This drives the unstyled landing
 * demo (search, sort, pager, column menu) and the packed adapter-root
 * fixtures, then holds the numbers against `scripts/v3-perf-baseline.json`.
 *
 * A baseline belongs to the machine it was measured on: `--baseline` names
 * another one, which the nightly workflow uses for the Linux runner
 * (`scripts/v3-perf-baseline.linux.json`). A baseline that does not exist yet
 * is written by the run that asks for it.
 *
 *   node scripts/v3-perf.mjs
 *   node scripts/v3-perf.mjs --update
 *   node scripts/v3-perf.mjs --port 4321
 *   node scripts/v3-perf.mjs --baseline scripts/v3-perf-baseline.linux.json
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { measure } from "./bundle-budget.mjs";
import { FIXTURES } from "./consumer-fixtures.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : (args[i + 1] ?? true);
};
const BASELINE_PATH = join(
  ROOT,
  String(flag("baseline", "scripts/v3-perf-baseline.json"))
);
const PORT = flag("port", "4321");
const UPDATE = args.includes("--update");
const JSON_OUT = args.includes("--json");
const TOLERANCE = 0.25;
const ABSOLUTE_MS = 80;

const PARSE_FIXTURES = ["unstyled · table", "mui · table", "antd · table"];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function measureParseBuild() {
  const dir = mkdtempSync(join(tmpdir(), "adapttable-v3-perf-"));
  const parseBuildMs = {};
  try {
    for (const name of PARSE_FIXTURES) {
      const fixture = FIXTURES.find((entry) => entry.name === name);
      const samples = [];
      for (let i = 0; i < 3; i++) {
        const { parseMs } = await measure(fixture, dir);
        samples.push(parseMs);
      }
      parseBuildMs[name] = median(samples);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return parseBuildMs;
}

async function serving() {
  try {
    const res = await fetch(`http://localhost:${PORT}/tailwind/`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function startShowcase() {
  const preview = join(ROOT, "apps/showcase/node_modules/.bin/vite");
  if (!existsSync(preview)) {
    throw new Error(
      "no vite binary in the showcase — run `pnpm install` first"
    );
  }
  const dist = join(ROOT, "apps/showcase/dist");
  const child = existsSync(join(dist, "tailwind/index.html"))
    ? spawn(preview, ["preview", "--port", String(PORT), "--strictPort"], {
        cwd: join(ROOT, "apps/showcase"),
        stdio: "ignore",
      })
    : spawn(preview, ["--port", String(PORT), "--strictPort"], {
        cwd: join(ROOT, "apps/showcase"),
        stdio: "ignore",
      });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await serving()) return child;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  child.kill();
  throw new Error(`showcase did not answer on :${PORT} within 60s`);
}

async function untilReady(page) {
  await page.locator('[data-adapttable-part="pager"]').waitFor({
    timeout: 30_000,
  });
}

async function firstRowText(page) {
  return page.locator('[role="row"]').nth(1).innerText();
}

async function waitRowChange(page, before) {
  await page.waitForFunction((prev) => {
    const rows = document.querySelectorAll('[role="row"]');
    const row = rows[1];
    return (row ? row.innerText : "") !== prev;
  }, before);
}

async function openLanding(browser, consoleErrors) {
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.addInitScript(() => {
    window.__adapttableCls = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__adapttableCls += entry.value;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
  });
  const navStarted = Date.now();
  await page.goto(`http://localhost:${PORT}/tailwind/`, {
    waitUntil: "domcontentloaded",
  });
  await untilReady(page);
  return { page, firstRenderMs: Date.now() - navStarted };
}

async function timeSort(page) {
  const header = page
    .locator('[data-adapttable-part="sort-button"]')
    .first()
    .locator("xpath=ancestor::*[@role='columnheader'][1]");
  const before = (await header.getAttribute("aria-sort")) ?? "";
  const started = Date.now();
  await page.locator('[data-adapttable-part="sort-button"]').first().click();
  await page.waitForFunction((prev) => {
    const el = document
      .querySelector('[data-adapttable-part="sort-button"]')
      ?.closest('[role="columnheader"]');
    return (el?.getAttribute("aria-sort") ?? "") !== prev;
  }, before);
  return Date.now() - started;
}

async function timePage(page, part) {
  const before = await firstRowText(page);
  const started = Date.now();
  await page.locator(`[data-adapttable-part="${part}"]`).click();
  await waitRowChange(page, before);
  return Date.now() - started;
}

async function timeSearch(page, query) {
  const field = page.locator('[data-adapttable-part="search"]');
  const before = await firstRowText(page);
  const started = Date.now();
  await field.fill(query);
  await waitRowChange(page, before);
  return Date.now() - started;
}

async function timePanelOpen(page) {
  const started = Date.now();
  await page
    .locator('[data-adapttable-part="column-menu-button"]')
    .first()
    .click();
  await page
    .locator('[data-adapttable-part="column-menu-panel"]')
    .waitFor({ timeout: 10_000 });
  return Date.now() - started;
}

async function sampleInteraction() {
  const browser = await chromium.launch();
  const consoleErrors = [];
  const firstRenders = [];
  const panelOpens = [];
  const clsSamples = [];
  let page;

  try {
    for (let i = 0; i < 3; i++) {
      const opened = await openLanding(browser, consoleErrors);
      firstRenders.push(opened.firstRenderMs);
      panelOpens.push(await timePanelOpen(opened.page));
      clsSamples.push(
        await opened.page.evaluate(() => window.__adapttableCls ?? 0)
      );
      await opened.page.keyboard.press("Escape");
      if (i < 2) await opened.page.close();
      else page = opened.page;
    }

    const sortSamples = [];
    for (let i = 0; i < 5; i++) sortSamples.push(await timeSort(page));

    const pageSamples = [];
    for (let i = 0; i < 5; i++) {
      pageSamples.push(
        await timePage(page, i % 2 === 0 ? "page-next" : "page-prev")
      );
    }

    const searchSamples = [];
    for (const query of ["Hopper", "Turing", "Founder"]) {
      searchSamples.push(await timeSearch(page, query));
      await page.locator('[data-adapttable-part="search"]').fill("");
      await untilReady(page);
    }

    return {
      firstRenderMs: median(firstRenders),
      sortMs: median(sortSamples),
      pageMs: median(pageSamples),
      searchMs: median(searchSamples),
      panelFirstOpenMs: median(panelOpens),
      cls: Number(Math.max(...clsSamples).toFixed(4)),
      hydrationErrors: consoleErrors.filter((text) => /hydrat/i.test(text)),
    };
  } finally {
    await browser.close();
  }
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
}

function regressions(current, baseline) {
  const failures = [];
  const compare = (label, value, floor) => {
    if (floor == null) return;
    const allowed = Math.max(floor * (1 + TOLERANCE), floor + ABSOLUTE_MS);
    if (value > allowed) {
      failures.push(
        `${label} ${value}ms > ${floor}ms + ${Math.round(TOLERANCE * 100)}%/${ABSOLUTE_MS}ms`
      );
    }
  };
  compare("firstRender", current.firstRenderMs, baseline.firstRenderMs);
  compare("sort", current.sortMs, baseline.sortMs);
  compare("page", current.pageMs, baseline.pageMs);
  compare("search", current.searchMs, baseline.searchMs);
  compare(
    "panelFirstOpen",
    current.panelFirstOpenMs,
    baseline.panelFirstOpenMs
  );
  for (const name of PARSE_FIXTURES) {
    compare(
      `parse ${name}`,
      current.parseBuildMs[name],
      baseline.parseBuildMs?.[name]
    );
  }
  if (current.cls > Math.max(0.01, (baseline.cls ?? 0) + 0.01)) {
    failures.push(`CLS ${current.cls} is a material layout shift`);
  }
  if (current.hydrationErrors.length) {
    failures.push(`hydration errors: ${current.hydrationErrors.join("; ")}`);
  }
  return failures;
}

const started = (await serving()) ? null : await startShowcase();
if (started && !JSON_OUT) {
  console.log(`started the showcase on :${PORT} for this run\n`);
}

try {
  const parseBuildMs = await measureParseBuild();
  const interaction = await sampleInteraction();
  const current = {
    measuredAt: new Date().toISOString().slice(0, 10),
    method:
      "rolldown parse of packed adapter-root fixtures; Playwright against /tailwind/ for first render, sort, page, search and column-menu first-open. React and the kit stay external in the parse fixtures.",
    parseBuildMs,
    ...interaction,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(current, null, 2));
  } else {
    console.log(
      `parse/build  unstyled ${parseBuildMs["unstyled · table"]}ms  mui ${parseBuildMs["mui · table"]}ms  antd ${parseBuildMs["antd · table"]}ms`
    );
    console.log(
      `first render ${current.firstRenderMs}ms  sort ${current.sortMs}ms  page ${current.pageMs}ms  search ${current.searchMs}ms  panel ${current.panelFirstOpenMs}ms  CLS ${current.cls}`
    );
  }

  const stored = { ...current };
  delete stored.hydrationErrors;

  if (UPDATE || !loadBaseline()) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(stored, null, 2)}\n`);
    if (!JSON_OUT) {
      console.log(
        UPDATE
          ? `\nwrote ${BASELINE_PATH}`
          : `\nlocked first baseline at ${BASELINE_PATH}`
      );
    }
    if (current.hydrationErrors.length) process.exitCode = 1;
  } else {
    const failures = regressions(current, loadBaseline());
    if (failures.length) {
      console.error(`\n${failures.join("\n")}`);
      process.exitCode = 1;
    } else if (!JSON_OUT) {
      console.log("\n✓ no material base performance regression");
    }
  }
} finally {
  started?.kill();
}
