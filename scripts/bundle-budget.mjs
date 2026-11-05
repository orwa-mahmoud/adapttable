/**
 * The bundle budget — what a table actually costs, measured and enforced.
 *
 * AdaptTable's promise is that features are opt-in: a plain table pays for the
 * plain table and nothing else. A promise like that is worth exactly what it is
 * measured at, so this bundles real consumer fixtures against the built
 * packages — what npm ships, not the source — and holds each one to a written
 * ceiling.
 *
 *   pnpm build && node scripts/bundle-budget.mjs      # measure and check
 *   node scripts/bundle-budget.mjs --update           # print current sizes
 *   node scripts/bundle-budget.mjs --json             # machine-readable sizes
 *   node scripts/bundle-budget.mjs --case mui-table --case core-formula
 *                                                     # only the named cases
 *
 * Sizes are minified + gzipped bytes of AdaptTable's own share of the graph.
 * React and the UI kits are external because an application already ships
 * them; counting them would drown the number the budget is about. Vue fixtures
 * externalize the same way — the Vue runtime and each kit's peer UI library.
 *
 * Every emitted chunk and asset is counted once, gzipped on its own, and
 * reported as initial (the entries' complete static closure and the styles
 * they load) or lazy (behind a dynamic import). Each fixture holds an initial
 * and a total ceiling.
 *
 * The bundler is rolldown, re-exported by tsdown, which builds this repo
 * already — the measurement adds no dependency of its own.
 *
 * Consumer paths live in `consumer-fixtures.mjs`: core-simple, every adapter
 * base (≤ 81 KB and ≥ 35% below the item-1 baseline), every feature delta on
 * MUI, `standardFeatures()` for every kit, representative combinations, and
 * the all-feature ceiling. Negative markers travel with each fixture.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { Rolldown } from "tsdown";

import {
  FIXTURES,
  PLAIN_ADAPTER_CEILING_KB,
  plantedLeakFixture,
} from "./consumer-fixtures.mjs";
import { packageDir, packageRel } from "./packages.mjs";
import { publishedFigures, staleReason } from "./published-figures.mjs";
import {
  vueConsumerCoverageProblems,
  vueConsumerExternals,
  vueEmittedCss,
  vueMissingCss,
} from "./vue-consumer-fixtures.mjs";
import { buildVueCssConsumer } from "./vue-css-consumer.mjs";
import { buildVueNativeConsumer } from "./vue-native-consumer.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE = process.argv.includes("--update");
const JSON_OUT = process.argv.includes("--json");
const KIB = 1024;

/** Anything an application already has. AdaptTable's share is what remains. */
const EXTERNAL = [
  /^react($|\/)/,
  /^react-dom($|\/)/,
  /^react-compiler-runtime($|\/)/,
  /^@mantine\//,
  /^@mui\//,
  /^@emotion\//,
  /^@chakra-ui\//,
  /^antd$/,
  /^@ant-design\//,
  /^@radix-ui\//,
  /^@base-ui($|\/)/,
  /^class-variance-authority$/,
  /^clsx$/,
  /^tailwind-merge$/,
  /^lucide-react$/,
];

const PEER_POLICY = {
  react: "React runtime and UI-kit libraries external",
  vue: "Vue runtime and the package's peerDependencies external",
};

function extraFiles(fixture) {
  const extras = [...(fixture.alsoFiles ?? [])];
  if (fixture.alsoEntryFile && !extras.includes(fixture.alsoEntryFile)) {
    extras.unshift(fixture.alsoEntryFile);
  }
  return extras;
}

/** The consumer module, and the package files it imports. */
function entryModule(fixture) {
  const dist = join(packageDir(fixture.pkg), "dist");
  const target = join(dist, fixture.entryFile ?? "index.js");
  const extras = extraFiles(fixture);
  const imports = [];
  let code = fixture.code;
  const use = (token, file) => {
    if (!code.includes(token)) return;
    code = code.replaceAll(token, file);
    imports.push(file);
  };
  use("PKG", target);
  for (let index = extras.length - 1; index >= 0; index--) {
    use(`ALSO${index}`, join(dist, extras[index]));
  }
  if (extras[0]) use("ALSO", join(dist, extras[0]));
  if (fixture.styleEntryFile) use("STYLE", join(dist, fixture.styleEntryFile));
  return { code, imports: imports.map((file) => relative(ROOT, file)).sort() };
}

const SOURCE_MAP = /\.map$/;

function emittedBytes(file) {
  if (file.type === "chunk") return Buffer.from(file.code);
  return Buffer.from(file.source);
}

function linkedFiles(chunk) {
  return [
    ...chunk.imports,
    ...(chunk.viteMetadata?.importedCss ?? []),
    ...(chunk.viteMetadata?.importedAssets ?? []),
  ];
}

/**
 * Every emitted chunk and asset, once, ordered by file name and marked
 * initial or lazy.
 *
 * Initial is what loading the entries costs before any dynamic import runs:
 * each entry chunk, its complete static import closure, and the stylesheets
 * and assets those chunks link. An asset no lazy chunk claims is initial, so
 * an unsplit stylesheet the entry imports is never hidden as optional.
 * Sourcemaps are not shipped to the browser and are not counted.
 */
export function emittedLedger(output) {
  const files = new Map();
  for (const file of output) {
    if (SOURCE_MAP.test(file.fileName)) continue;
    if (files.has(file.fileName)) {
      throw new Error(`${file.fileName} was emitted twice`);
    }
    files.set(file.fileName, file);
  }
  const chunks = [...files.values()].filter((file) => file.type === "chunk");
  const initial = new Set();
  const pending = chunks
    .filter((chunk) => chunk.isEntry)
    .map((chunk) => chunk.fileName);
  while (pending.length) {
    const name = pending.pop();
    const file = files.get(name);
    if (!file || initial.has(name)) continue;
    initial.add(name);
    if (file.type === "chunk") pending.push(...linkedFiles(file));
  }
  const claimedLazily = new Set(
    chunks
      .filter((chunk) => !initial.has(chunk.fileName))
      .flatMap((chunk) => linkedFiles(chunk))
  );
  for (const file of files.values()) {
    if (file.type === "asset" && !claimedLazily.has(file.fileName)) {
      initial.add(file.fileName);
    }
  }
  const emitted = (name) => files.has(name);
  return [...files.values()]
    .sort((a, b) => (a.fileName < b.fileName ? -1 : 1))
    .map((file) => {
      const bytes = emittedBytes(file);
      return {
        fileName: file.fileName,
        type: file.type,
        phase: initial.has(file.fileName) ? "initial" : "lazy",
        ...(file.type === "chunk" && {
          isEntry: file.isEntry,
          imports: file.imports.filter(emitted),
          dynamicImports: file.dynamicImports.filter(emitted),
          externalImports: [...file.imports, ...file.dynamicImports].filter(
            (name) => !emitted(name)
          ),
        }),
        bytes: bytes.length,
        gzipBytes: gzipSync(bytes).length,
      };
    });
}

function phaseTotals(ledger) {
  const totals = {};
  for (const phase of ["initial", "lazy", "total"]) {
    totals[phase] = { files: 0, bytes: 0, gzipBytes: 0 };
  }
  for (const file of ledger) {
    for (const phase of [file.phase, "total"]) {
      totals[phase].files++;
      totals[phase].bytes += file.bytes;
      totals[phase].gzipBytes += file.gzipBytes;
    }
  }
  return totals;
}

/**
 * Raw, minified and gzip bytes per phase, from the readable and minified
 * builds of the same graph. Gzip is of the minified files, each on its own.
 */
export function accountOutputs(minOutput, readableOutput) {
  const ledger = emittedLedger(minOutput);
  const minified = phaseTotals(ledger);
  const raw = phaseTotals(emittedLedger(readableOutput));
  const phases = {};
  for (const phase of ["initial", "lazy", "total"]) {
    phases[phase] = {
      files: minified[phase].files,
      rawBytes: raw[phase].bytes,
      minBytes: minified[phase].bytes,
      gzipBytes: minified[phase].gzipBytes,
    };
  }
  return { ...phases, ledger };
}

/**
 * Markers that leaked into, or are missing from, every emitted chunk and
 * stylesheet of the readable build.
 *
 * `absent` and `present` name runtime identifiers and are read from all
 * JavaScript chunks, lazy ones included. `absentCss` and `presentCss` are read
 * from the emitted stylesheets, where a published sheet legitimately carries
 * selectors for parts the runtime graph omits.
 */
export function inspectOutputs(fixture, readableOutput) {
  const code = readableOutput
    .filter((file) => file.type === "chunk")
    .map((file) => file.code)
    .join("\n");
  const css = vueEmittedCss(readableOutput);
  const inCode = (name) => new RegExp(`\\b${name}`).test(code);
  return {
    leaked: [
      ...(fixture.absent ?? []).filter(inCode),
      ...(fixture.absentCss ?? [])
        .filter((marker) => css.includes(marker))
        .map((marker) => `CSS ${marker}`),
    ],
    missing: [
      ...(fixture.present ?? []).filter((name) => !inCode(name)),
      ...vueMissingCss(fixture, css).map((marker) => `CSS ${marker}`),
    ],
  };
}

async function bundleFixture(fixture, entry, dir, externals) {
  if (fixture.consumerHost) {
    return Promise.all(
      [true, false].map((minify) =>
        buildVueNativeConsumer(fixture, entry, dir, minify, [], externals)
      )
    );
  }
  if (fixture.styleEntryFile) {
    // Independent builds keep the stateful CSS collection passes separate.
    const min = await buildVueCssConsumer(entry, dir, true, [], externals);
    const readable = await buildVueCssConsumer(
      entry,
      dir,
      false,
      [],
      externals
    );
    return [min, readable];
  }
  const bundle = await Rolldown.rolldown({
    input: entry,
    external: (id) => externals.some((re) => re.test(id)),
    logLevel: "silent",
  });
  try {
    return await Promise.all([
      bundle.generate({ format: "esm", minify: true }),
      bundle.generate({ format: "esm" }),
    ]);
  } finally {
    await bundle.close();
  }
}

/**
 * Bundle one fixture: its emitted-file ledger and per-phase bytes, plus any
 * names that were supposed to be shaken out and were not.
 *
 * The sizes come from minified output because that is what ships. The marker
 * checks read the unminified build of the same graph, where identifiers still
 * carry their real names. `buildMs` is the bundler's wall-clock time for both
 * builds, not a browser parse measurement.
 */
export async function measure(fixture, dir) {
  const { code, imports } = entryModule(fixture);
  const entry = join(dir, "entry.js");
  writeFileSync(entry, code);
  const framework = fixture.framework === "vue" ? "vue" : "react";
  const externals =
    framework === "vue" ? vueConsumerExternals(fixture.pkg) : EXTERNAL;

  const started = performance.now();
  const [min, readable] = await bundleFixture(fixture, entry, dir, externals);
  const buildMs = Math.round(performance.now() - started);

  const accounted = accountOutputs(min.output, readable.output);
  return {
    ...accounted,
    entryImports: imports,
    peerPolicy: PEER_POLICY[framework],
    externalImports: [
      ...new Set(
        accounted.ledger.flatMap((file) => file.externalImports ?? [])
      ),
    ].sort(),
    buildMs,
    ...inspectOutputs(fixture, readable.output),
  };
}

/** The initial and total ceilings a fixture is held to, in KiB. */
export function fixtureCeilings(fixture) {
  const { initialKB, totalKB } = fixture;
  if (!(initialKB > 0 && totalKB >= initialKB)) {
    throw new Error(
      `${fixture.name} needs an initial ceiling and a total ceiling no lower than it`
    );
  }
  return { initialKB, totalKB };
}

/**
 * The `--case` IDs a run asked for, in order. A flag without a value is an
 * error, so a typo cannot quietly select everything.
 */
export function requestedCases(argv) {
  const ids = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    let value;
    if (arg === "--case") value = argv[++index];
    else if (arg.startsWith("--case=")) value = arg.slice("--case=".length);
    else continue;
    if (!value || value.startsWith("--")) {
      throw new Error("--case needs a case ID");
    }
    ids.push(...value.split(","));
  }
  return ids;
}

/** Every fixture when no IDs were requested; otherwise exactly the named ones. */
export function selectFixtures(fixtures, ids) {
  if (!ids.length) return fixtures;
  const known = new Set(fixtures.map((fixture) => fixture.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length) {
    throw new Error(
      `Unknown --case ${unknown.join(", ")}. Known cases:\n  ${[...known].join("\n  ")}`
    );
  }
  return fixtures.filter((fixture) => ids.includes(fixture.id));
}

/**
 * A planted import of a live hook must trip the negative assertion. If this
 * stays green, the detector is what failed — not the table.
 */
export async function provePlantedLeak(dir) {
  const fixture = plantedLeakFixture(ROOT);
  const { leaked } = await measure(fixture, dir);
  if (!leaked.includes("useTableEditHistory")) {
    throw new Error(
      "planted leak did not fail the negative assertion — the detector is blind"
    );
  }
  if (!JSON_OUT) {
    console.log(
      "✓ planted leak failed the negative assertion (useTableEditHistory)"
    );
  }
}

/**
 * Every size figure this repo publishes, and the fixture each one comes from.
 *
 * A budget is a ceiling, so a fixture can sit well under one for months while
 * the figure published beside it says something else entirely — which is how
 * `~51 kB` outlived a 134 KB measurement. Several of these pages tell the
 * reader the budget checks them; this is where that becomes true.
 *
 * `find` is the start of the line carrying the figure. `from` names the
 * fixtures it summarises — more than one publishes a range. Published figures
 * are initial transfer: what a page loads before any lazy import.
 */
const PUBLISHED = [
  {
    doc: "docs/faq.md",
    find: "| `useFrontendData` + `useDataTable` (react)",
    from: ["react · simple table"],
  },
  {
    doc: "docs/faq.md",
    find: "| every core export",
    from: ["core · every export"],
  },
  {
    doc: "docs/faq.md",
    find: "| `DataTable` from an adapter",
    from: FIXTURES.filter((f) => f.kind === "adapter-base").map((f) => f.name),
  },
  {
    doc: "docs/features.md",
    find: "Measured on MUI, the table alone is",
    from: ["mui · table", "mui · table + preset"],
  },
  {
    doc: "docs/getting-started.md",
    find: "A plain adapter `DataTable` is",
    from: FIXTURES.filter((f) => f.kind === "adapter-base").map((f) => f.name),
  },
  {
    doc: "docs/comparison.md",
    find: "A plain AdaptTable adapter `DataTable` is",
    from: FIXTURES.filter((f) => f.kind === "adapter-base").map((f) => f.name),
  },
  {
    doc: "docs/formulas.md",
    find: "columns never downloads a parser. It costs",
    from: ["core · formula"],
  },
  {
    doc: "docs/pivot.md",
    find: "never downloads the engine. It costs",
    from: ["core · pivot"],
  },
  {
    doc: `${packageRel("server")}/README.md`,
    find: "  no hooks and no client boundary, so an Express",
    from: ["server · parse a query"],
  },
];

const kib = (bytes) => bytes / KIB;

function headroomText(sizeKB, ceilingKB) {
  const headroom = ceilingKB - sizeKB;
  return headroom >= 0
    ? `${headroom.toFixed(1)} to spare`
    : `OVER by ${(-headroom).toFixed(1)}`;
}

function logRow(fixture, row) {
  const initialKB = kib(row.initial.gzipBytes);
  const totalKB = kib(row.total.gzipBytes);
  const lazy = row.lazy.files
    ? `   lazy ${kib(row.lazy.gzipBytes).toFixed(1)} KiB in ${row.lazy.files}`
    : "";
  console.log(
    `${row.ok ? "✓" : "✗"} ${fixture.name.padEnd(34)}` +
      `initial ${initialKB.toFixed(1).padStart(6)} / ${String(Math.ceil(row.initialKB)).padStart(3)} KiB` +
      ` (${headroomText(initialKB, row.initialKB)})` +
      `   total ${totalKB.toFixed(1).padStart(6)} / ${String(Math.ceil(row.totalKB)).padStart(3)} KiB` +
      ` (${headroomText(totalKB, row.totalKB)})` +
      lazy +
      `   build ${String(row.buildMs).padStart(4)}ms`
  );
  if (fixture.kind === "adapter-base") {
    const cut = ((1 - initialKB / fixture.item1BaselineKB) * 100).toFixed(0);
    const vs80 =
      initialKB <= PLAIN_ADAPTER_CEILING_KB
        ? `≤ ${PLAIN_ADAPTER_CEILING_KB} KiB`
        : `OVER ${PLAIN_ADAPTER_CEILING_KB} KiB`;
    console.log(
      `  └ item-1 ${fixture.item1BaselineKB} KiB → ${cut}% smaller · ${vs80}`
    );
  }
  if (row.leaked.length) {
    console.log(
      `  └ reached the base import but should not have: ${row.leaked.join(", ")}`
    );
  }
  if (row.missing.length) {
    console.log(
      `  └ feature marker missing from the composed graph: ${row.missing.join(", ")}`
    );
  }
}

/**
 * Published figures whose fixtures this run measured, checked against the
 * initial transfer. A `--case` run skips the figures it did not measure.
 */
function countStale(rows) {
  let stale = 0;
  let checked = 0;
  for (const { doc, find, from } of PUBLISHED) {
    const measured = rows
      .filter((r) => from.includes(r.name))
      .map((r) => kib(r.initial.gzipBytes));
    if (measured.length !== from.length) continue;
    checked++;
    const figures = publishedFigures(join(ROOT, doc), find);
    if (figures === null) {
      stale++;
      console.error(
        `✗ ${doc}: no line starting "${find}" — the text moved or was reworded`
      );
      continue;
    }
    const reason = staleReason(figures, measured);
    if (reason) {
      stale++;
      console.error(`✗ ${doc} · ${find.trim()}: ${reason}`);
    }
  }
  if (!stale && checked) {
    console.log(`\n✓ ${checked} published size figures match this run`);
  }
  return stale;
}

function exitIfFailed(over, stale) {
  if (!over && !stale) return;
  if (over) {
    console.error(
      `\n${over} fixture(s) over budget.\n` +
        `Either the weight belongs behind an optional entry point, or the budget ` +
        `needs raising — in the pull request, with a reason, never silently.`
    );
  }
  if (stale) {
    console.error(
      `\n${stale} published size figure(s) no longer match the build.\n` +
        `Correct the documented number; never widen the tolerance instead.`
    );
  }
  process.exit(1);
}

function jsonRow(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    peerPolicy: row.peerPolicy,
    entryImports: row.entryImports,
    externalImports: row.externalImports,
    initial: row.initial,
    lazy: row.lazy,
    total: row.total,
    ceilingsKiB: { initial: row.initialKB, total: row.totalKB },
    ok: row.ok,
    leaked: row.leaked,
    missing: row.missing,
    ledger: row.ledger,
  };
}

/** The fixtures this run's `--case` flags name; a bad request exits 2. */
function selectedFixtures() {
  try {
    return selectFixtures(FIXTURES, requestedCases(process.argv));
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(2);
  }
}

async function measuredRow(fixture, dir) {
  const measured = await measure(fixture, dir);
  const ceilings = fixtureCeilings(fixture);
  const ok =
    kib(measured.initial.gzipBytes) <= ceilings.initialKB &&
    kib(measured.total.gzipBytes) <= ceilings.totalKB &&
    measured.leaked.length === 0 &&
    measured.missing.length === 0;
  return {
    id: fixture.id,
    name: fixture.name,
    kind: fixture.kind,
    kit: fixture.kit,
    ...measured,
    ...ceilings,
    ok,
  };
}

async function main() {
  const coverageProblems = vueConsumerCoverageProblems(FIXTURES);
  if (coverageProblems.length) throw new Error(coverageProblems.join("\n"));
  const selected = selectedFixtures();
  const dir = mkdtempSync(join(tmpdir(), "adapttable-budget-"));
  const rows = [];

  try {
    for (const fixture of selected) {
      const row = await measuredRow(fixture, dir);
      rows.push(row);
      if (!JSON_OUT) logRow(fixture, row);
    }
    await provePlantedLeak(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const over = rows.filter((row) => !row.ok).length;

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        { unit: "bytes; KiB = 1024 bytes", fixtures: rows.map(jsonRow) },
        null,
        2
      )
    );
  }

  if (UPDATE) {
    console.log("\nCurrent sizes with ~15% headroom — for the FIXTURES table:");
    for (const r of rows) {
      console.log(
        `  ${r.name.padEnd(34)} initialKB: ${Math.ceil(kib(r.initial.gzipBytes) * 1.15)}` +
          `   totalKB: ${Math.ceil(kib(r.total.gzipBytes) * 1.15)}`
      );
    }
    process.exit(over ? 1 : 0);
  }

  const stale = JSON_OUT ? 0 : countStale(rows);
  exitIfFailed(over, stale);
  if (!JSON_OUT) {
    console.log(`\nAll ${rows.length} fixtures within budget.`);
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
