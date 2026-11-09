#!/usr/bin/env node
/**
 * Row-patch timings for both table engines, against the built core.
 *
 * Rows are filtered and sorted by a column's `sortValue`; the grouped cases
 * also group by a 20-value column. A patch batch is made the way a host
 * streams one — `updateRow` changes applied with `applyRowPatches`, so the
 * array carries the patch log — and handed to `invalidate(["data"], { data })`.
 * The timer covers the engine only. Each case alternates a build and a
 * patch, and reports the median of each after one warm-up.
 *
 *   pnpm --filter @adapttable/core build && node scripts/engine-patch-bench.mjs
 *   node scripts/engine-patch-bench.mjs --json
 *   node scripts/engine-patch-bench.mjs --core /path/to/other/core/dist
 *
 * Exits 1 when a patch takes more than a tenth longer than building the same
 * table from nothing: a patch path that loses to a rebuild is a defect. A
 * batch large enough to be evaluated from nothing costs a build plus the
 * session's change detection, which is what the tenth covers.
 */
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const args = process.argv.slice(2);
const coreAt = args.indexOf("--core");
/** The built core to measure; `--core <dir>` measures another build. */
const CORE =
  coreAt === -1
    ? join(ROOT, "packages/shared/core/dist")
    : resolve(args[coreAt + 1] ?? "");
const JSON_OUT = args.includes("--json");

const { createTableEngine, createBasicTableEngine } = await import(
  pathToFileURL(join(CORE, "engine.js")).href
);
const { applyRowPatches, updateRow } = await import(
  pathToFileURL(join(CORE, "index.js")).href
);

const SIZES = [10_000, 100_000];
const BATCHES = [1, 100, 1_000];
const RUNS = 15;
/** A patch may cost a build plus the session's change detection, no more. */
const BUILD_SHARE = 1.1;

const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
  {
    key: "points",
    header: "Points",
    sortable: true,
    sortValue: (row) => row.points,
  },
];

const ENGINES = [
  { name: "full", create: createTableEngine, grouped: false },
  { name: "full, grouped", create: createTableEngine, grouped: true },
  { name: "basic", create: createBasicTableEngine, grouped: false },
];

function makeRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    name: `n${String(index)}`,
    team: `t${String(index % 20)}`,
    points: (index * 7919) % 1000,
  }));
}

function options(data, grouped) {
  return {
    data,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    filterFn: (row) => row.points % 5 !== 0,
    defaults: {
      sortBy: "points",
      sortDir: "asc",
      limit: 25,
      ...(grouped && { groupBy: "team" }),
    },
  };
}

function median(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** `batch` rows spread across the table, each with a new score. */
function patched(data, batch, round) {
  const stride = Math.max(1, Math.floor(data.length / batch));
  const patches = [];
  for (let k = 0; k < batch; k += 1) {
    const row = data[(k * stride + round) % data.length];
    patches.push(
      updateRow(row.id, { points: (row.points + 37 * (round + 1)) % 1000 })
    );
  }
  return applyRowPatches(data, patches, (row) => row.id);
}

/** Build the table from nothing once: the milliseconds it took. */
function buildOnce(engine, data) {
  const started = performance.now();
  const table = engine.create(options(data, engine.grouped));
  table.rows("full");
  table.snapshot();
  const ms = performance.now() - started;
  table.dispose();
  return ms;
}

/**
 * Patches of `batch` rows and builds of the same table, one of each per
 * round, so both run under the same conditions. Medians after a warm-up.
 */
function timeCase(engine, data, batch) {
  const table = engine.create(options(data, engine.grouped));
  table.rows("full");
  let current = data;
  const builds = [];
  const patches = [];
  for (let run = 0; run <= RUNS; run += 1) {
    const build = buildOnce(engine, data);
    const next = patched(current, batch, run);
    const started = performance.now();
    table.invalidate(["data"], { data: next });
    table.rows("full");
    table.snapshot();
    const patch = performance.now() - started;
    if (run > 0) {
      builds.push(build);
      patches.push(patch);
    }
    current = next;
  }
  table.dispose();
  return { buildMs: median(builds), patchMs: median(patches) };
}

const results = [];
for (const size of SIZES) {
  const data = makeRows(size);
  for (const engine of ENGINES) {
    for (const batch of BATCHES) {
      results.push({
        rows: size,
        engine: engine.name,
        batch,
        ...timeCase(engine, data, batch),
      });
    }
  }
}

const slower = results
  .filter((result) => result.patchMs > result.buildMs * BUILD_SHARE)
  .map(
    (result) =>
      `${result.engine} at ${String(result.rows)} rows: a ${String(result.batch)}-row patch takes ${result.patchMs.toFixed(1)} ms, a build ${result.buildMs.toFixed(1)} ms`
  );

if (JSON_OUT) {
  console.log(JSON.stringify({ results, slower }, null, 2));
} else {
  const ms = (value) => `${value.toFixed(1)} ms`.padStart(10);
  console.log(
    `${"rows".padStart(7)}  ${"engine".padEnd(14)}${"batch".padStart(7)}${"build".padStart(10)}${"patch".padStart(10)}`
  );
  for (const result of results) {
    console.log(
      `${String(result.rows).padStart(7)}  ${result.engine.padEnd(14)}${String(result.batch).padStart(7)}${ms(result.buildMs)}${ms(result.patchMs)}`
    );
  }
  for (const line of slower) console.error(`✗ ${line}`);
}
process.exit(slower.length > 0 ? 1 : 0);
