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
 *
 * Sizes are minified + gzipped bytes of AdaptTable's own share of the graph.
 * React and the UI kits are external because an application already ships
 * them; counting them would drown the number the budget is about.
 *
 * The bundler is rolldown, re-exported by tsdown, which builds this repo
 * already — the measurement adds no dependency of its own.
 *
 * Consumer paths live in `consumer-fixtures.mjs`: core-simple, every adapter
 * base (≤ 80 KB and ≥ 35% below the item-1 baseline), every feature delta on
 * MUI, `standardFeatures()` for every kit, representative combinations, and
 * the all-feature ceiling. Negative markers travel with each fixture.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { Rolldown } from "tsdown";

import {
  adapterAcceptanceKB,
  FIXTURES,
  PLAIN_ADAPTER_CEILING_KB,
  plantedLeakFixture,
} from "./consumer-fixtures.mjs";
import { packageDir, packageRel } from "./packages.mjs";
import { publishedFigures, staleReason } from "./published-figures.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE = process.argv.includes("--update");
const JSON_OUT = process.argv.includes("--json");

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

function extraFiles(fixture) {
  const extras = [...(fixture.alsoFiles ?? [])];
  if (fixture.alsoEntryFile && !extras.includes(fixture.alsoEntryFile)) {
    extras.unshift(fixture.alsoEntryFile);
  }
  return extras;
}

function entryCode(fixture) {
  const dist = join(packageDir(fixture.pkg), "dist");
  const target = join(dist, fixture.entryFile ?? "index.js");
  const extras = extraFiles(fixture);
  let code = fixture.code.replaceAll("PKG", target);
  for (let index = extras.length - 1; index >= 0; index--) {
    code = code.replaceAll(`ALSO${index}`, join(dist, extras[index]));
  }
  if (extras[0]) {
    code = code.replaceAll("ALSO", join(dist, extras[0]));
  }
  return code;
}

/**
 * Bundle one fixture: its gzipped size, plus any names that were supposed to
 * be shaken out and were not.
 *
 * The size comes from minified output because that is what ships. The absence
 * check reads the unminified build of the same bundle, where identifiers still
 * carry their real names.
 */
export async function measure(fixture, dir) {
  const entry = join(dir, "entry.js");
  writeFileSync(entry, entryCode(fixture));

  const started = performance.now();
  const bundle = await Rolldown.rolldown({
    input: entry,
    external: (id) => EXTERNAL.some((re) => re.test(id)),
    logLevel: "silent",
  });
  const [min, readable] = await Promise.all([
    bundle.generate({ format: "esm", minify: true }),
    bundle.generate({ format: "esm" }),
  ]);
  await bundle.close();
  const parseMs = Math.round(performance.now() - started);

  const code = readable.output[0].code;
  const sizeBytes = gzipSync(min.output[0].code).length;
  return {
    sizeBytes,
    sizeKB: sizeBytes / 1024,
    parseMs,
    leaked: (fixture.absent ?? []).filter((name) =>
      new RegExp(`\\b${name}`).test(code)
    ),
    missing: (fixture.present ?? []).filter(
      (name) => !new RegExp(`\\b${name}`).test(code)
    ),
  };
}

function fixtureCeiling(fixture) {
  if (fixture.kind === "adapter-base") {
    return adapterAcceptanceKB(fixture.kit);
  }
  return fixture.budgetKB;
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
 * fixtures it summarises — more than one publishes a range.
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

function logRow(fixture, row) {
  const headroom = row.ceiling - row.sizeKB;
  console.log(
    `${row.ok ? "✓" : "✗"} ${fixture.name.padEnd(34)}` +
      `${row.sizeKB.toFixed(1).padStart(6)} KB gzipped` +
      `   budget ${String(Math.ceil(row.ceiling)).padStart(3)} KB` +
      (headroom >= 0
        ? `   (${headroom.toFixed(1)} KB to spare)`
        : `   OVER by ${(-headroom).toFixed(1)} KB`) +
      `   parse ${String(row.parseMs).padStart(4)}ms`
  );
  if (fixture.kind === "adapter-base") {
    const cut = ((1 - row.sizeKB / fixture.item1BaselineKB) * 100).toFixed(0);
    const vs80 =
      row.sizeKB <= PLAIN_ADAPTER_CEILING_KB
        ? "≤ 80 KB"
        : `OVER ${PLAIN_ADAPTER_CEILING_KB} KB`;
    console.log(
      `  └ item-1 ${fixture.item1BaselineKB} KB → ${cut}% smaller · ${vs80}`
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

function countStale(rows) {
  let stale = 0;
  for (const { doc, find, from } of PUBLISHED) {
    const measured = rows
      .filter((r) => from.includes(r.name))
      .map((r) => r.sizeKB);
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
  if (!stale) {
    console.log(
      `\n✓ ${PUBLISHED.length} published size figures match this run`
    );
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

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "adapttable-budget-"));
  const rows = [];
  let over = 0;

  try {
    for (const fixture of FIXTURES) {
      const measured = await measure(fixture, dir);
      const ceiling = fixtureCeiling(fixture);
      const ok =
        measured.sizeKB <= ceiling &&
        measured.leaked.length === 0 &&
        measured.missing.length === 0;
      if (!ok) over++;
      const row = {
        name: fixture.name,
        kind: fixture.kind,
        kit: fixture.kit,
        ...measured,
        ceiling,
        ok,
      };
      rows.push(row);
      if (!JSON_OUT) logRow(fixture, row);
    }
    await provePlantedLeak(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          fixtures: rows.map((row) => ({
            name: row.name,
            sizeBytes: row.sizeBytes,
            sizeKB: Number(row.sizeKB.toFixed(3)),
          })),
        },
        null,
        2
      )
    );
  }

  if (UPDATE) {
    console.log("\nCurrent sizes with ~15% headroom — for the FIXTURES table:");
    for (const r of rows) {
      console.log(
        `  ${r.name.padEnd(34)} budgetKB: ${Math.ceil(r.sizeKB * 1.15)}`
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
