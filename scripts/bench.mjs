/**
 * The performance benchmark suite — the numbers behind every perf claim in the
 * docs, and the regression net under them.
 *
 * It drives the showcase scale demo through a set of scenarios and reports, for
 * each: how many rows and cells actually reach the DOM, the JS heap after the
 * table settles, and how long the table takes to become interactive. The demo
 * is the fixture on purpose — the benchmark measures the real adapter over the
 * real engine, never a synthetic harness that could drift from what ships.
 *
 *   node scripts/bench.mjs                        # all scenarios
 *   node scripts/bench.mjs --smoke                # the CI subset
 *   node scripts/bench.mjs --only patch --port 4321
 *   node scripts/bench.mjs --port 4321 --json     # machine-readable
 *
 * It serves the showcase itself when nothing is already on the port, and stops
 * that server again when it finishes. Running `pnpm --filter
 * @adapttable/showcase dev` by hand first is still the faster loop while
 * iterating — an already-running server is used as-is and left alone.
 *
 * Playwright is already a dev dependency here (the e2e suite uses it), so
 * this needs no extra install — only its browser, once:
 *
 *   npx playwright install chromium
 *
 * Reading the output: DOM rows is the number that must stay flat as rows grow
 * — that is windowing working. Heap is indicative, not a contract: it moves
 * with the browser build and the machine, so compare arms within one run
 * rather than across days.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : (args[i + 1] ?? true);
};
const PORT = flag("port", "5173");
const SMOKE = args.includes("--smoke");
const JSON_OUT = args.includes("--json");
const onlyFlag = flag("only", "");
const ONLY = typeof onlyFlag === "string" ? onlyFlag.toLowerCase() : "";

/**
 * Every scenario is a URL against the scale demo plus the shape we expect.
 * `smoke` marks the fast subset CI runs on every pull request; the rest are
 * the full sweep worth running before a release or when perf work lands.
 *
 * A scenario for a feature the library does not have is absent rather than
 * stubbed — a benchmark that measures nothing is worse than a missing one, so
 * each arrives with the feature it measures.
 */
const SCENARIOS = [
  {
    name: "baseline · 50k rows, windowed",
    query: "rows=50000",
    smoke: true,
    expect: { maxDomRows: 60 },
  },
  {
    name: "variable height · 20k rows, windowed",
    query: "rows=20000&rowHeight=1",
    smoke: true,
    expect: { maxDomRows: 80 },
  },
  {
    name: "100k rows, windowed",
    query: "rows=100000",
    smoke: true,
    expect: { maxDomRows: 60 },
  },
  {
    name: "10k rows, windowed (A/B arm)",
    query: "rows=10000&all=1&virtualize=1",
    smoke: true,
    expect: { maxDomRows: 60 },
  },
  {
    name: "10k rows, NOT windowed (A/B arm)",
    query: "rows=10000&all=1&virtualize=0",
    smoke: false,
    expect: { minDomRows: 9000 },
  },
  {
    name: "wide · 100 columns",
    query: "rows=5000&cols=100",
    smoke: true,
    expect: { maxDomRows: 60 },
  },
  {
    name: "wide · 500 columns",
    query: "rows=5000&cols=500",
    smoke: false,
    expect: { maxDomRows: 60 },
  },
  // The horizontal A/B pair: same table, same rows, columns windowed or not.
  // The cell count is the number that moves, and it is the whole point of
  // windowing an axis nobody scrolls to the end of.
  {
    name: "wide · 500 columns, windowed (A/B arm)",
    query: "rows=5000&cols=500&virtualizeColumns=1",
    smoke: false,
    expect: { maxDomRows: 60, maxCells: 3000 },
  },
  {
    // A 50,000-row hierarchy with every parent open: the flattening walk runs
    // over the whole set, and the window is what keeps the DOM small.
    name: "tree · 50k rows, every parent open",
    query: "rows=50000&tree=1",
    smoke: true,
    expect: { maxDomRows: 60 },
  },
  {
    name: "grouped by status",
    query: "rows=20000&scale.groupBy=status",
    smoke: true,
    expect: { maxDomRows: 400 },
  },
  {
    name: "pinned first column",
    query: "rows=20000&scale.colPin=name%3Astart",
    smoke: false,
    expect: { maxDomRows: 60 },
  },
  {
    name: "sorted · 100k rows",
    query: "rows=100000&scale.sortBy=budget&scale.sortDir=desc",
    smoke: false,
    expect: { maxDomRows: 60 },
  },
  {
    // The server tier over a set no browser can hold: rows are answered a page
    // at a time, so what this measures is the table's cost at a 1,000,000-row
    // total rather than the cost of building 1,000,000 objects.
    name: "server tier · 1M rows",
    query: "tier=server&rows=1000000",
    smoke: true,
    expect: { maxDomRows: 60 },
  },
  {
    name: "editing · 20k rows",
    query: "rows=20000&edit=1",
    smoke: false,
    expect: { maxDomRows: 60 },
  },
  {
    // Realtime patches through the patch API, the way a socket feed would
    // arrive — on the plain pipeline, which rebuilds the view per patch.
    // `awaitPatches` holds the sample open until the burst lands, and the page
    // reports the burst's own elapsed time so a patch-speed regression shows
    // up as a number rather than hiding inside the mount.
    name: "realtime patches · 20k rows, 200 updates",
    query: "rows=20000&patch=200",
    smoke: false,
    awaitPatches: 200,
    expect: { maxDomRows: 60 },
  },
  {
    // The same burst with the incremental engine engaged, so the pair below
    // prints a measured comparison instead of a claim.
    name: "realtime patches · incremental engine",
    query: "rows=20000&patch=200&incremental=1",
    smoke: false,
    awaitPatches: 200,
    expect: { maxDomRows: 60 },
  },
];

/** Mount one scenario and measure it once the rendered row count settles. */
async function sample(query, awaitPatches = 0) {
  const browser = await chromium.launch();
  const page = await browser
    .newContext({ viewport: { width: 1280, height: 900 } })
    .then((c) => c.newPage());
  const started = Date.now();
  // `/scale/` is a meta-refresh to `/mantine/scale/` that drops the query
  // string, so `?patch=200` never reached the demo and the A/B was a no-op.
  await page.goto(`http://localhost:${PORT}/mantine/scale/?${query}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("table tbody tr", {
    state: "attached",
    timeout: 90000,
  });
  const interactiveMs = Date.now() - started;

  // A patch scenario is not finished when the first row paints: hold until the
  // burst the demo was asked for has actually been applied, so the sample
  // covers every re-render it caused rather than the mount alone.
  if (awaitPatches > 0) {
    await page.waitForFunction(
      (n) =>
        Number(
          document
            .querySelector("[data-bench-patches]")
            ?.getAttribute("data-bench-patches")
        ) >= n,
      awaitPatches,
      { timeout: 180_000 }
    );
  }

  // Settle: the virtualizer measures rows after paint, so the count moves for
  // a few frames. Four identical reads in a row is the table holding still.
  let prev = -1;
  let stable = 0;
  while (stable < 4) {
    await page.waitForTimeout(200);
    const c = await page.locator("table tbody tr").count();
    if (c === prev) stable++;
    else {
      stable = 0;
      prev = c;
    }
  }

  const domCells = await page.evaluate(
    () => document.querySelectorAll("table tbody td").length
  );
  // The burst's own elapsed time, stamped by the page between the first patch
  // dispatch and the commit that put the last one on screen. `interactiveMs`
  // is the mount and says nothing about patch speed.
  const patchBurstMs = await page.evaluate(() => {
    const value = document
      .querySelector("[data-bench-burst-ms]")
      ?.getAttribute("data-bench-burst-ms");
    return value == null ? null : Number(value);
  });
  const heapMB = await retainedHeapMB(page);
  await page.context().browser().close();
  return { domRows: prev, domCells, heapMB, interactiveMs, patchBurstMs };
}

/**
 * Retained heap, which is not what `usedJSHeapSize` reports on its own.
 *
 * That figure counts everything allocated and not yet collected, so it answers
 * "how much has V8 got its hands on right now", not "how much does this table
 * hold". The gap is enormous and it is not noise: on a busy machine the
 * virtualized arm reads ~215 MB, and on an idle one the same page reads 17 MB.
 * Under CPU contention V8 cannot finish collecting, even when asked directly.
 *
 * So collect until the number stops falling. Garbage can only ever inflate the
 * reading — it can never push it below what is genuinely retained — which
 * makes the floor the honest answer and makes the measurement reproducible on
 * a laptop that is also doing something else.
 */
async function retainedHeapMB(page, { maxPasses = 10 } = {}) {
  if (!(await page.evaluate(() => "memory" in performance))) return null;
  const cdp = await page.context().newCDPSession(page);
  let min = Infinity;
  let steady = 0;
  for (let pass = 0; pass < maxPasses && steady < 3; pass++) {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(120);
    const mb = await page.evaluate(
      () => performance.memory.usedJSHeapSize / 1048576
    );
    if (mb < min - 0.5) {
      min = mb;
      steady = 0;
    } else {
      steady++;
    }
  }
  return Math.round(min);
}

/** A scenario fails only against its own stated expectation, never a diff. */
function verdict(result, expect = {}) {
  const failures = [];
  if (expect.maxDomRows !== undefined && result.domRows > expect.maxDomRows) {
    failures.push(`${result.domRows} DOM rows > ${expect.maxDomRows}`);
  }
  if (expect.minDomRows !== undefined && result.domRows < expect.minDomRows) {
    failures.push(`${result.domRows} DOM rows < ${expect.minDomRows}`);
  }
  // Cells are the number a wide table lives or dies by: windowing the rows of
  // a 500-column table still leaves eleven thousand of them.
  if (expect.maxCells !== undefined && result.domCells > expect.maxCells) {
    failures.push(`${result.domCells} cells > ${expect.maxCells}`);
  }
  return failures;
}

/**
 * The demo has to be served for any of this to mean anything.
 *
 * Running the dev server by hand still works and is the faster loop while
 * iterating. But `pnpm bench` on its own used to die on a raw
 * ERR_CONNECTION_REFUSED stack trace, which says nothing about what to do —
 * so when the port is silent this starts the server, waits for it, and shuts
 * it down again at the end.
 */
async function serving() {
  try {
    const res = await fetch(`http://localhost:${PORT}/`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Start the showcase dev server and resolve once it answers. */
async function startShowcase() {
  // The showcase's own vite binary, by absolute path — nothing resolves
  // through PATH, so what runs is the version this repo installed.
  const vite = join(ROOT, "apps/showcase/node_modules/.bin/vite");
  if (!existsSync(vite)) {
    throw new Error(
      `no vite binary at ${vite} — run \`pnpm install\` first, or start the ` +
        `showcase by hand and re-run`
    );
  }
  const child = spawn(vite, ["--port", String(PORT), "--strictPort"], {
    cwd: join(ROOT, "apps/showcase"),
    stdio: "ignore",
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await serving()) return child;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill();
  throw new Error(
    `the showcase did not come up on port ${PORT} within 60s — start it by ` +
      `hand with \`pnpm --filter @adapttable/showcase dev\` and re-run`
  );
}

const started = (await serving()) ? null : await startShowcase();
if (started && !JSON_OUT) {
  console.log(`started the showcase on :${PORT} for this run\n`);
}

const chosen = (SMOKE ? SCENARIOS.filter((s) => s.smoke) : SCENARIOS).filter(
  (s) => !ONLY || s.name.toLowerCase().includes(ONLY)
);
const results = [];
let failed = 0;

/**
 * Measure a scenario twice and keep the lower heap reading.
 *
 * Collecting until the number settles fixes most of the variance, but roughly
 * one run in five on a loaded machine still comes back inflated and stays
 * there however many times it is asked to collect. A second page load clears
 * it, and since the DOM counts are identical between the two, the only thing
 * this picks between is the heap figure — the lower of which is the real one.
 */
async function measure(query, awaitPatches = 0) {
  const first = await sample(query, awaitPatches);
  const second = await sample(query, awaitPatches);
  const heapMB =
    first.heapMB === null || second.heapMB === null
      ? (first.heapMB ?? second.heapMB)
      : Math.min(first.heapMB, second.heapMB);
  return { ...first, heapMB };
}

for (const scenario of chosen) {
  const result = await measure(scenario.query, scenario.awaitPatches ?? 0);
  const failures = verdict(result, scenario.expect);
  if (failures.length) failed++;
  results.push({ ...scenario, ...result, failures });
  if (!JSON_OUT) {
    const status = failures.length ? `FAIL — ${failures.join(", ")}` : "ok";
    const burst =
      result.patchBurstMs == null
        ? ""
        : `  burst ${String(Math.round(result.patchBurstMs)).padStart(5)}ms ` +
          `(${(result.patchBurstMs / (scenario.awaitPatches ?? 1)).toFixed(2)}ms/update)`;
    console.log(
      `${failures.length ? "✗" : "✓"} ${scenario.name.padEnd(34)} ` +
        `${String(result.domRows).padStart(5)} rows  ` +
        `${String(result.domCells).padStart(6)} cells  ` +
        `${String(result.heapMB ?? "—").padStart(4)}MB  ` +
        `${String(result.interactiveMs).padStart(5)}ms${burst}  ${status}`
    );
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ port: PORT, smoke: SMOKE, results }, null, 2));
} else {
  // The A/B is the headline claim: windowing renders a viewport, not a dataset.
  const on = results.find((r) => r.query.includes("virtualize=1"));
  const off = results.find((r) => r.query.includes("virtualize=0"));
  if (on && off) {
    console.log(
      `\nwindowing at 10k rows: ${Math.round(off.domRows / on.domRows)}x fewer ` +
        `DOM rows (${off.domRows} → ${on.domRows})` +
        (on.heapMB && off.heapMB
          ? `, ${off.heapMB - on.heapMB}MB less heap`
          : "")
    );
  }
  // The same claim on the other axis: a wide table renders the columns a
  // reader can see, not the ones the schema has.
  const wideOn = results.find((r) => r.query.includes("virtualizeColumns=1"));
  const wideOff = results.find(
    (r) =>
      r.query.includes("cols=500") && !r.query.includes("virtualizeColumns")
  );
  if (wideOn && wideOff) {
    console.log(
      `windowing 500 columns: ${Math.round(wideOff.domCells / wideOn.domCells)}x ` +
        `fewer DOM cells (${wideOff.domCells} → ${wideOn.domCells})`
    );
  }
  // The third A/B: the incremental engine's win over rebuilding per patch.
  const full = results.find(
    (r) => r.query.includes("patch=200") && !r.query.includes("incremental=1")
  );
  const incr = results.find((r) => r.query.includes("incremental=1"));
  if (full?.patchBurstMs != null && incr?.patchBurstMs != null) {
    const times = full.patchBurstMs / incr.patchBurstMs;
    console.log(
      `200-update burst: ${Math.round(full.patchBurstMs)}ms full rebuild → ` +
        `${Math.round(incr.patchBurstMs)}ms incremental (${times.toFixed(1)}x)`
    );
  }
  console.log(
    `\n${chosen.length - failed}/${chosen.length} scenarios within expectations`
  );
}

// Leave the machine as we found it: a server this script started is this
// script's to stop, and one that was already running is not.
started?.kill();

process.exit(failed ? 1 : 0);
