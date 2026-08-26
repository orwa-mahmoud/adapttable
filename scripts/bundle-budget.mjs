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
 *
 * Sizes are minified + gzipped bytes of AdaptTable's own share of the graph.
 * React and the UI kits are external because an application already ships
 * them; counting them would drown the number the budget is about.
 *
 * The bundler is rolldown, re-exported by tsdown, which builds this repo
 * already — the measurement adds no dependency of its own.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { Rolldown } from "tsdown";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE = process.argv.includes("--update");

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

/**
 * Each fixture is the smallest honest expression of one use case.
 *
 * `budgetKB` is a ceiling with headroom, not a target: it stays quiet through
 * ordinary work and fails the build when the base path puts on real weight.
 * Raising one is a decision that belongs in a pull request with a reason —
 * which is the entire point of writing them down.
 */
const FIXTURES = [
  {
    name: "core · simple table",
    pkg: "core",
    budgetKB: 20,
    code: `export { useFrontendData, useDataTable } from "PKG";`,
    // The size ceiling says the base import is small. These say WHY: the heavy
    // capabilities are genuinely shaken out, not merely compressing well. A
    // feature that starts leaking into the base path trips this before the
    // budget notices the bytes.
    absent: [
      "toCsv",
      "Blob",
      "download",
      "virtual",
      "PIVOT_BLANK",
      "parseFormula",
    ],
  },
  {
    // The whole surface at once, which no application imports. It is a canary
    // for the library's total weight rather than a promise about a user's
    // bundle — the promise is the fixture above, and it holds independently.
    // This number therefore moves when the library genuinely gains a feature,
    // and it moves in a commit that says which one.
    name: "core · every export",
    pkg: "core",
    budgetKB: 93,
    code: `export * from "PKG";`,
    // The optional entries are the proof that "optional" is real: even the
    // whole main surface at once does not carry them. The marker is an
    // engine-only name, not the word "pivot" — the panel's LABELS are shared
    // table labels and do belong in the base bundle.
    absent: ["PIVOT_BLANK", "parseFormula"],
  },
  {
    // What the pivot engine costs the tables that ask for it, and nothing to
    // the tables that do not — see the `absent` checks above.
    name: "core · pivot",
    pkg: "core",
    entryFile: "pivot.js",
    budgetKB: 5,
    code: `export { pivot } from "PKG";`,
  },
  {
    // The engine plus the mapping that renders it with an adapter's own
    // table — the pair a host actually imports to put a pivot on screen.
    // Measured 4.1 KB against the engine's 1.5, and 2.6 of that difference is
    // the shared label set: the mapping reads its two grand-total captions
    // from the same labels every table resolves, rather than shipping English
    // of its own. This fixture bundles the entry with nothing else installed,
    // so it counts that set in full; an app importing the table has already
    // paid for it, and the mapping's own weight is under a kilobyte.
    name: "core · pivot rendered",
    pkg: "core",
    entryFile: "pivot.js",
    budgetKB: 5,
    code: `export { pivot, pivotTableModel } from "PKG";`,
  },
  {
    // Same promise for the formula engine: a parser nobody imports is a
    // parser nobody pays for.
    name: "core · formula",
    pkg: "core",
    entryFile: "formula.js",
    budgetKB: 6,
    code: `export { buildFormulaColumns } from "PKG";`,
  },
  {
    // The React-free half of the model, which a backend imports instead of the
    // table: the filter-tree, pivot and formula-column URL codecs and nothing
    // else. Measured 0.8 KB, the pivot codec included: it carries the switches
    // and the folded groups a shared link names, which a route handler reads
    // with the same function the table wrote them with. The ceiling holds.
    // The absences carry the promise — `useState` is the
    // load-bearing one, because an entry that names a hook has a React peer no
    // route handler can satisfy; `PIVOT_BLANK` says the codec did not drag the
    // engine in behind it, and `parseFormula` says the same for the formula
    // parser, which reading a link must never reach.
    name: "core · query",
    pkg: "core",
    entryFile: "query.js",
    budgetKB: 1,
    code: `export { parseFilterTree, deserializePivot, deserializeFormulaColumns } from "PKG";`,
    absent: [
      "useState",
      "useSyncExternalStore",
      "PIVOT_BLANK",
      "toCsv",
      "parseFormula",
    ],
  },
  {
    // What a route handler pays to parse and validate a shared link: measured
    // 1.6 KB, the parser plus the codecs it reads through `@adapttable/core/query`.
    // React is external in every fixture here, so an accidental React import
    // would not show as bytes — the graph walk in `scripts/smoke-dist.mjs` is
    // what enforces its absence, and these markers are the cheap second look.
    name: "server · parse a query",
    pkg: "server",
    budgetKB: 2,
    code: `export { parseTableQuery } from "PKG";`,
    absent: ["useState", "PIVOT_BLANK", "toCsv"],
  },
  // Every adapter, because the adapters are meant to be interchangeable and
  // that includes their weight. One drifting away from the pack is a finding.
  //
  // These moved together on 2026-08-12 (+~1 KB each) when cell selection became
  // visible, columns became selectable and Ctrl/Cmd+C learned to copy the
  // rectangle — all of it on the grid path, which every adapter bundles. The
  // fixture that carries the actual promise is `core · simple table` above: a
  // plain table pays 10.6 KB of a 12 KB ceiling and did not move.
  //
  // Five capabilities joined that path on 2026-08-12, each of them chrome the
  // batteries-included table always carries: Ctrl/Cmd+V (~0.4 KB), the fill
  // handle (~1.3 KB), the selection statistics strip (~0.5 KB), the edit
  // history (~0.6 KB) and find in table (~0.8 KB, bar included). The fixture
  // that carries the actual promise is `core · simple table` above — a plain
  // table pays 10.7 KB of a 12 KB ceiling and did not move through any of it.
  //
  // Grouping grew on the same day: nesting, footers, ordering and the server's
  // own group rows all render through the entries every adapter already walks.
  // Row detail then learned to be measured together with its row, which is
  // what let it be used with virtualization at all, and the columns learned to
  // window too (~1 KB): the spacer cells and the horizontal window ride the
  // same render model every adapter already maps over. Auto-sizing added the
  // measurement and one menu action on top, and column sizing — bounds, flex
  // shares and the container-fitting mode — closed phase 3. Tree data adds a
  // second hierarchy model (~1 KB): the flattening walk, its own expansion
  // state, and the chevron every body and every card renders — plus the
  // per-node fetch state a lazily loaded branch needs, and the nested-table
  // region that turns master/detail into a real table under a row. Editing
  // validation adds the per-cell message state, the async check that supersedes
  // a stale answer, and the ARIA every editor now carries (~1 KB). The editor
  // set — boolean, date, datetime, time, multi-select — adds the platform
  // controls two of them render and the draft shapes they hold. Async saves add
  // the per-cell in-flight state, the rollback it offers, and a bring-your-own
  // editor's contract; dirty marks add the per-cell change set every row reads.
  // Row editing adds the second commit unit — the whole-row draft state, the
  // cell that renders a field instead of a value, and the three controls that
  // end the edit — and batch editing the third, holding many rows at once
  // behind one write. Lifecycle events (~0.5 KB) observe those three units:
  // start, cancel, commit, validation-fail and save-error, latched so a host
  // inline arrow never repaints rows. Edit conflicts (~0.5 KB) compare the
  // open editor to a live row and surface Keep mine / Take theirs on the
  // validation channel. The simple-table fixture did not move.
  //
  // Row reordering (~2 KB) is chrome every adapter already walks: the reserved
  // grip column, Space-lift keyboard, live-region announcer, HTML5 drop
  // targets, and the mobile up/down pair. The host still opts in with
  // `onRowReorder` — omit it and nothing renders — but the builders sit on
  // the same path as row actions. `core · simple table` stayed at 11.4 KB
  // of a 12 KB ceiling.
  //
  // Row pinning (~0.5 KB) adds the sticky top/bottom sections, the pin
  // actions, and the URL pair. The host still opts in with `pinnedRowIds`
  // or `onPinnedRowIdsChange`. `core · simple table` stayed at 11.4 KB of
  // a 12 KB ceiling.
  //
  // Row and column spanning (~1.5 KB) replaces every kit's columns.map
  // with a per-row cell list: origins carry colSpan/rowSpan, covered
  // cells are omitted, pins and the column window clip the rectangle,
  // and arrows / CSV skip a covered address. The host still opts in
  // with `getCellSpan` or `column.colSpan` / `column.rowSpan`.
  // `core · simple table` stayed at 11.4 KB of a 12 KB ceiling.
  //
  // Collapsible multi-level column groups (~0.4 KB) stack header rows
  // from a path, hide non-summary leaves when a group is collapsed, and
  // render one shared toggle. The host still opts in with
  // `collapsibleColumnGroups` — omit it and no toggle renders — but the
  // path walker sits on the same header-group path the kits already
  // imported. `core · simple table` stayed at 11.5 KB of a 12 KB ceiling.
  //
  // Column menu 2.0 (~2 KB per kit) adds the search box, bulk
  // show/hide/unpin, the per-column submenu, and the lock flags the
  // shared model already computed. The host still opts in with
  // `enableColumnMenu` — omit it and the menu does not render — but
  // every kit's ColumnMenu is on the same always-imported path.
  // `core · simple table` stayed at 11.5 KB of a 12 KB ceiling.
  //
  // Rich filter operators (~1.5 KB) put the per-datatype registry, the
  // operator-first widgets, and `f_<key>Op` persistence on the filter
  // form every kit already imports. The host still opts in with a
  // `filters` array — omit it and no widget renders — but the
  // comparison tokens ride the same AutoFilterForm path. `core ·
  // simple table` stayed at 11.7 KB of a 12 KB ceiling.
  //
  // Boolean filter (~0.3 KB) adds the tri-state any/true/false widget
  // on that same AutoFilterForm path. `core · simple table` unmoved.
  //
  // Relative date tokens (~0.5–1.1 KB) add the preset select + last/next
  // N on the dateRange widget. `core · simple table` stayed at 11.9 KB
  // of a 12 KB ceiling.
  //
  // AND/OR filter trees (~0.4 KB on the simple path, ~0.9 KB on the
  // full export) parse `ft=1.{…}` in the URL layer and evaluate the
  // tree in `useTableData`. A shared link has to filter without a
  // builder, so the codec cannot sit behind an optional entry. The
  // evaluator stays next to `filterDefs` (already on `useTableData`);
  // the codec is a separate module so `useFrontendData` does not pull
  // the predicate engine. `core · simple table` is 12.3 KB of a 13 KB
  // ceiling.
  //
  // The visual AND/OR builder (~4 KB per kit) mounts under the same
  // filter panel every adapter already imports. The host still opts
  // in with `filters` — omit the defs and the builder returns null —
  // but the recursive native UI cannot sit behind a second entry
  // without breaking a shared `ft=` link that needs editing. The
  // simple-table fixture stayed at 12.5 KB of a 13 KB ceiling.
  //
  // The Excel-style checklist (~1.5 KB per kit) is another leaf on
  // that same AutoFilterForm path. Omit `type: "checklist"` and the
  // widget returns null; a server page without `allFilteredRows`
  // never offers it. `core · simple table` stayed at 12.5 KB of a
  // 13 KB ceiling.
  //
  // The compact header filter row (~0.7 KB on the full export, ~1 KB
  // per kit) sits under the leaf header every desktop table already
  // renders. `headerFilters` opts the row in; omit it and
  // FilterHeaderRow returns null. Ant Design keeps the control in
  // the header cell so its fixture stayed under. `core · simple
  // table` stayed at 12.5 KB of a 13 KB ceiling.
  //
  // The public filter-type registry (~0.5 KB on the kit path) lives in
  // `filterBuiltins` so `useFrontendData` / `useDataTable` do not load
  // every built-in spec. Ant Design's header-cell control plus the
  // registry lookup on AutoFilterForm nudged that fixture over 101 KB.
  //
  // XLSX export grew into the shape a spreadsheet actually wants (#316): typed
  // cells, styling, a frozen header, and the grouped or tree structure the
  // reader can see rather than a denormalised leaf dump. That work sits in
  // `exportView` / `exportWriter`, on the CSV path every kit already carries,
  // and costs ~1.4 KB there. It is genuinely absent from the plain path:
  // `core · simple table` measured 12.5 KB before this change and 12.5 KB
  // after, against the same 13 KB ceiling. The PDF writer and the print
  // layout (#319) are behind `@adapttable/core/pdf` and cost the kits nothing.
  //
  // Incremental re-eval (#322) sits on `useFrontendData`. A patch that
  // carries a `rowPatchLog` re-runs search, filters, sort, grouping and
  // aggregates for the touched rows only, instead of walking the set.
  // That snapshot is the live path now, so the simple-table fixture
  // moved from 12.5 KB to 17.1 KB; the ceiling is 20 KB (~15%
  // headroom). The heavy capabilities are still shaken out: toCsv,
  // Blob, download and virtual stay absent. Every adapter imports that
  // hook, so the kit fixtures moved with it.
  //
  // Feature notices (~1 KB per kit) put the opted-in-but-inert features on
  // `useTableChrome`, which every adapter imports: the reason each one cannot
  // run, its localized label, and the status-bar strip that carries them when
  // the bar itself is off. Ant Design pays only this, which is what sizes it.
  //
  // The shared desktop assembly (~1.5 KB per thinned kit) replaces six
  // per-kit copies of the same header/pin/row/summary walk with one generic
  // pass in core. It is one graph serving six kits, so a single kit's bundle
  // carries paths its own copy specialised away; the trade is deliberate.
  //
  // The public plugin host (`TableFeature.setup`) lives on the default path
  // because editors, aggregators, column menus, filters, export, the palette
  // and the context menu read it during the same render. It cannot sit behind
  // an optional entry without becoming a second API. ~1 KB gzip; the four
  // kits that were already against the ceiling move by that amount.
  { name: "mantine · table", pkg: "adapter-mantine", budgetKB: 133 },
  { name: "mui · table", pkg: "adapter-mui", budgetKB: 133 },
  { name: "chakra · table", pkg: "adapter-chakra", budgetKB: 132 },
  { name: "antd · table", pkg: "adapter-antd", budgetKB: 126 },
  { name: "radix · table", pkg: "adapter-radix", budgetKB: 133 },
  { name: "base-ui · table", pkg: "adapter-base-ui", budgetKB: 139 },
  // Overlay placement, empty-cell hit area, and dir on the columns panel
  // grew the unstyled graph (~1 KB gzip). shadcn sits on that path, so both
  // ceilings move; ~3 KB slack so the next small patch does not flake CI.
  { name: "shadcn · table", pkg: "adapter-shadcn", budgetKB: 137 },
  { name: "unstyled · table", pkg: "adapter-unstyled", budgetKB: 133 },
].map((f) => ({ code: `export { DataTable } from "PKG";`, ...f }));

/**
 * Bundle one fixture: its gzipped size, plus any names that were supposed to
 * be shaken out and were not.
 *
 * The size comes from minified output because that is what ships. The absence
 * check reads the unminified build of the same bundle, where identifiers still
 * carry their real names.
 */
async function measure(fixture, dir) {
  const entry = join(dir, "entry.js");
  // Optional entries (`@adapttable/core/pivot` and friends) build to their
  // own file, and measuring them is the only way to say what they cost.
  const target = join(
    ROOT,
    "packages",
    fixture.pkg,
    "dist",
    fixture.entryFile ?? "index.js"
  );
  writeFileSync(entry, fixture.code.replaceAll("PKG", target));

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

  const code = readable.output[0].code;
  return {
    sizeKB: gzipSync(min.output[0].code).length / 1024,
    leaked: (fixture.absent ?? []).filter((name) =>
      new RegExp(`\\b${name}`).test(code)
    ),
  };
}

const dir = mkdtempSync(join(tmpdir(), "adapttable-budget-"));
const rows = [];
let over = 0;

try {
  for (const fixture of FIXTURES) {
    const { sizeKB, leaked } = await measure(fixture, dir);
    const ok = sizeKB <= fixture.budgetKB && leaked.length === 0;
    if (!ok) over++;
    rows.push({ ...fixture, sizeKB, ok });
    const headroom = fixture.budgetKB - sizeKB;
    console.log(
      `${ok ? "✓" : "✗"} ${fixture.name.padEnd(26)}` +
        `${sizeKB.toFixed(1).padStart(6)} KB gzipped` +
        `   budget ${String(fixture.budgetKB).padStart(3)} KB` +
        (headroom >= 0
          ? `   (${headroom.toFixed(1)} KB to spare)`
          : `   OVER by ${(-headroom).toFixed(1)} KB`)
    );
    if (leaked.length) {
      console.log(
        `  └ reached the base import but should not have: ${leaked.join(", ")}`
      );
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (UPDATE) {
  console.log("\nCurrent sizes with ~15% headroom — for the FIXTURES table:");
  for (const r of rows) {
    console.log(
      `  ${r.name.padEnd(26)} budgetKB: ${Math.ceil(r.sizeKB * 1.15)}`
    );
  }
  process.exit(0);
}

if (over) {
  console.error(
    `\n${over} fixture(s) over budget.\n` +
      `Either the weight belongs behind an optional entry point, or the budget ` +
      `needs raising — in the pull request, with a reason, never silently.`
  );
  process.exit(1);
}
console.log(`\nAll ${rows.length} fixtures within budget.`);
