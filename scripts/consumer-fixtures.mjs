/**
 * Packed consumer paths the bundle budget measures.
 *
 * Every fixture is a real import graph: a simple core table, each adapter
 * root, each feature beside a representative table, the junior preset,
 * representative combinations, and the all-feature ceiling. Negative markers
 * travel with the fixture so regenerating a size cannot launder a leak.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { angularConsumerFixtures } from "./angular-consumer-fixtures.mjs";
import { kitDir, KITS, packageNameAt } from "./kits.mjs";
import { folderOf, workspacePackages } from "./packed-consumers.mjs";
import { vueConsumerFixtures } from "./vue-consumer-fixtures.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const classification = JSON.parse(
  readFileSync(join(ROOT, "scripts/feature-classification.json"), "utf8")
);

/** Hard acceptance for a plain adapter `DataTable`. */
export const PLAIN_ADAPTER_CEILING_KB = 81;

/**
 * Item-1 packed adapter roots, the baseline the 35% reduction is judged
 * against. These are the committed per-kit figures from the classification
 * seam measurement, which is the item-1 / pre-split graph.
 */
export const ITEM1_ADAPTER_BASELINE_KB =
  classification.seamMeasurement.packedBefore;

/**
 * Every React kit the registry holds outside the private role, keyed by its
 * npm name: `@adapttable/mui` → `mui`. A kit added to `scripts/kits.mjs` is
 * measured without editing this file.
 */
export function reactAdapters(kits = KITS, root = ROOT) {
  return kits
    .filter((kit) => kit.framework === "react" && kit.role !== "private")
    .map((kit) => ({
      kit: packageNameAt(kitDir(kit, root)).replace(/^@adapttable\//, ""),
      pkg: kit.name,
    }));
}

export const ADAPTERS = reactAdapters();

/**
 * Strings that must not appear in a plain adapter root. Hook names that still
 * live in JSDoc on the lean path are not markers.
 */
export const ADAPTER_ABSENT = [
  "ROW_DND_MIME",
  "useVirtualizer",
  "GRID_CELL_ATTR",
  "buildExportTable",
  "useFilterTreeChips",
  "matchKeySet",
  "useRowPinningUrlState",
  "useTableEditHistory",
  "FilterTreeBuilder",
  "SavedViewsMenu",
  "DensityButton",
  "header-rename-form",
];

/** Unique identifier that proves a feature entry actually entered the graph. */
export const FEATURE_MARKERS = {
  "row-reorder": "ROW_DND_MIME",
  virtualize: "useVirtualizer",
  "cell-navigation": "GRID_CELL_ATTR",
  export: "buildExportTable",
  filters: "useFilterTreeChips",
  "find-in-table": "matchKeySet",
  "row-pinning": "useRowPinningUrlState",
  editing: "useTableEditHistory",
  "grouping-panel": "grouping-drop-zone",
  "row-detail": "useRowExpansion",
  "context-menu": "useTableContextMenu",
  "command-palette": "useCommandPalette",
  density: "DensityButton",
  "saved-views": "SavedViewsMenu",
  "column-menu": "header-rename-form",
  grouping: "groupedEntriesForStrategy",
};

/** Deltas and combinations are measured on the kit that already owns the preset fixtures. */
export const DELTA_KIT = "mui";

function uniqueFeatureSubpaths() {
  const seen = new Map();
  for (const feature of Object.values(classification.features)) {
    if (!seen.has(feature.subpath)) seen.set(feature.subpath, feature.subpath);
  }
  return [...seen.values()];
}

/**
 * Engines that must not ride along with an unrelated feature. Companion
 * markers (export writer next to selection-stats, filter builder next to
 * filters) stay off this list — they belong to that feature's own graph.
 */
const UNRELATED_ENGINE = {
  "row-reorder": "ROW_DND_MIME",
  virtualize: "useVirtualizer",
  "grouping-panel": "grouping-drop-zone",
};

function absentExcept(markers, alsoKeep = []) {
  const own = new Set([...markers, ...alsoKeep]);
  return Object.entries(UNRELATED_ENGINE)
    .filter(([, marker]) => !own.has(marker))
    .map(([, marker]) => marker);
}

function adapterOf(kit) {
  return ADAPTERS.find((adapter) => adapter.kit === kit);
}

/**
 * Core engines a consumer of one named primitive must not download: the
 * table engine, pivot, formula, the export writers and the filter-tree codec.
 */
const UNRELATED_CORE_ENGINES = [
  "createTableEngine",
  "PIVOT_BLANK",
  "parseFormula",
  "buildExportTable",
  "xlsxWriter",
  "parseFilterTree",
];

/**
 * Packed measurements of 2026-11-05 with ~15% headroom: `applyRowPatches`
 * 0.59 KiB, `columnAriaSort` 0.39 KiB, the engine with a lazy XLSX writer
 * 9.87 KiB initial and 13.44 KiB total, MUI grouping + aggregation 80.27 KiB.
 */
const PRIMITIVE_CEILINGS = { applyRowPatches: 1, columnAriaSort: 1 };
const XLSX_LAZY_CEILINGS = { initialKB: 12, totalKB: 16 };
const GROUPING_AGGREGATION_CEILING_KB = 93;

/**
 * Ceilings, in KiB of gzip. `initialKB` holds what loading the entries costs:
 * these React and core fixtures held exactly that scope before every emitted
 * file was counted. `totalKB` adds everything behind a dynamic import. On
 * 2026-11-05 every one of them except the lazy PDF case emitted a single file,
 * so its total ceiling is its initial ceiling.
 */
const CORE_FIXTURES = [
  {
    name: "core · simple table",
    kind: "core",
    pkg: "core",
    initialKB: 20,
    totalKB: 20,
    code: `export { createTableEngine } from "PKG";`,
    present: ["createTableEngine"],
    absent: [
      "toCsv",
      "Blob",
      "download",
      "virtual",
      "useRowPatchStream",
      "grouping-drop-zone",
    ],
  },
  {
    name: "core · basic table",
    kind: "core",
    pkg: "core",
    // 4.65 KiB on 2026-11-05, held with headroom. The convenience engine
    // beside it measured 10.34 KiB in the same run.
    initialKB: 6,
    totalKB: 6,
    code: `export { createBasicTableEngine } from "PKG";`,
    present: ["createBasicTableEngine"],
    absent: [
      "groupedEntriesForStrategy",
      "createFullRowModel",
      "toCsv",
      "Blob",
      "download",
      "virtual",
      "useRowPatchStream",
      "grouping-drop-zone",
    ],
  },
  {
    name: "core · engine + lazy pdf",
    kind: "core",
    pkg: "core",
    alsoEntryFile: "pdf.js",
    // The engine's own initial ceiling. The writer arrives through a dynamic
    // import: 20.8 KiB total on 2026-11-05, held with ~15% headroom.
    initialKB: 20,
    totalKB: 24,
    code: `export { createTableEngine } from "PKG";\nexport const loadPdf = () => import("ALSO");`,
    present: ["createTableEngine", "pdfWriter"],
  },
  {
    name: "core · engine + lazy xlsx",
    kind: "core",
    pkg: "core",
    alsoEntryFile: "xlsx.js",
    initialKB: XLSX_LAZY_CEILINGS.initialKB,
    totalKB: XLSX_LAZY_CEILINGS.totalKB,
    code: `export { createTableEngine } from "PKG";\nexport const loadXlsx = () => import("ALSO");`,
    present: ["createTableEngine", "xlsxWriter"],
  },
  {
    name: "core · type only",
    kind: "core",
    pkg: "core",
    typeOnly: true,
    // A type import erases: whatever the bundler emits for an empty module.
    initialKB: 0.1,
    totalKB: 0.1,
    code: `export type { TableSource } from "PKG";`,
  },
  {
    name: "core · one primitive",
    kind: "core",
    pkg: "core",
    initialKB: PRIMITIVE_CEILINGS.applyRowPatches,
    totalKB: PRIMITIVE_CEILINGS.applyRowPatches,
    code: `export { applyRowPatches } from "PKG";`,
    present: ["applyRowPatches"],
    absent: UNRELATED_CORE_ENGINES,
  },
  {
    name: "core · binding helper",
    kind: "core",
    pkg: "core",
    entryFile: "binding.js",
    initialKB: PRIMITIVE_CEILINGS.columnAriaSort,
    totalKB: PRIMITIVE_CEILINGS.columnAriaSort,
    code: `export { columnAriaSort } from "PKG";`,
    present: ["columnAriaSort"],
    absent: UNRELATED_CORE_ENGINES,
  },
  {
    name: "core · every export",
    kind: "core",
    pkg: "core",
    // Raised from 93 KB when the feature controllers and runtimes moved out
    // of the React binding into core, so every binding drives the same state
    // machines (#497). The weight moved rather than grew: a headless table
    // still costs ~25 KB, and this fixture imports everything at once.
    // Async edit/save lifetimes, row validation and bounded clipboard/fill work
    // bring the complete export surface to 100.9 KB (2026-10-15); settled
    // filter trees, batch change marks, content-sized XLSX columns and pinned
    // edge marks bring it to 101.2 KB (2026-10-30). The simple core table and
    // the hard plain-adapter ceiling stay as they are.
    initialKB: 102,
    totalKB: 102,
    code: `export * from "PKG";`,
    // The engines a named primitive must not carry are real identifiers of
    // the full graph, so their absence there is a finding, not a typo.
    present: UNRELATED_CORE_ENGINES,
    absent: ["useRowPatchStream", "grouping-drop-zone"],
  },
  {
    name: "core · pivot",
    kind: "core",
    pkg: "core",
    entryFile: "pivot.js",
    initialKB: 5,
    totalKB: 5,
    code: `export { pivot } from "PKG";`,
  },
  {
    name: "core · formula",
    kind: "core",
    pkg: "core",
    entryFile: "formula.js",
    initialKB: 6,
    totalKB: 6,
    code: `export { buildFormulaColumns } from "PKG";`,
  },
  {
    name: "core · stream",
    kind: "core",
    pkg: "core",
    entryFile: "stream.js",
    initialKB: 5,
    totalKB: 5,
    code: `export { openRowPatchStream, parseRowPatchFrame } from "PKG";`,
    absent: ["useState", "useRowPatchStream"],
    node: [
      `import { parseRowPatchFrame } from "PKG";`,
      `const [patch] = parseRowPatchFrame('{"type":"remove","id":7}');`,
      `if (patch?.type !== "remove" || patch.id !== "7") throw new Error("frame not parsed");`,
    ].join("\n"),
  },
  {
    name: "core · query",
    kind: "core",
    pkg: "core",
    entryFile: "query.js",
    initialKB: 1,
    totalKB: 1,
    code: `export { parseFilterTree, deserializePivot, deserializeFormulaColumns } from "PKG";`,
    absent: [
      "useState",
      "useSyncExternalStore",
      "PIVOT_BLANK",
      "toCsv",
      "parseFormula",
    ],
    node: [
      `import { parseFilterTree, deserializePivot, deserializeFormulaColumns } from "PKG";`,
      `if (parseFilterTree("not a tree") !== undefined) throw new Error("junk tree accepted");`,
      `if (deserializeFormulaColumns(null).length) throw new Error("empty formula param");`,
      `deserializePivot(null);`,
    ].join("\n"),
  },
  {
    name: "server · parse a query",
    kind: "core",
    pkg: "server",
    // Declared filters, filter-type checks, the typed filter tree and
    // grouping keys all run inside parseTableQuery, so a column-list caller
    // carries them too.
    initialKB: 5,
    totalKB: 5,
    code: `export { parseTableQuery } from "PKG";`,
    absent: ["useState", "PIVOT_BLANK", "toCsv"],
    node: [
      `import { parseTableQuery } from "PKG";`,
      `const query = parseTableQuery("?page=2&limit=10&sort=name", { columns: ["name"] });`,
      `if (query.page !== 2 || query.limit !== 10 || query.rejected.length) throw new Error(JSON.stringify(query));`,
    ].join("\n"),
  },
];

const REACT_FIXTURES = [
  {
    name: "react · simple table",
    kind: "react",
    pkg: "react",
    initialKB: 35,
    totalKB: 35,
    code: `export { useFrontendData, useDataTable } from "PKG";`,
    present: ["useDataTable", "useFrontendData"],
    absent: ["grouping-drop-zone"],
  },
  {
    name: "react · grouping panel",
    kind: "react",
    pkg: "react",
    entryFile: "features.js",
    initialKB: 16,
    totalKB: 16,
    code: `export { groupingPanel } from "PKG";`,
    present: ["groupingPanel"],
  },
  {
    name: "react · pivot rendered",
    kind: "react",
    pkg: "react",
    entryFile: "pivot.js",
    initialKB: 8,
    totalKB: 8,
    code: `export { pivotTableModel } from "PKG";`,
  },
  {
    name: "react · stream hook",
    kind: "react",
    pkg: "react",
    entryFile: "stream.js",
    initialKB: 6,
    totalKB: 6,
    code: `export { useRowPatchStream } from "PKG";`,
    present: ["useRowPatchStream"],
  },
];

function adapterBaseFixtures() {
  return ADAPTERS.map(({ kit, pkg }) => ({
    name: `${kit} · table`,
    kind: "adapter-base",
    kit,
    pkg,
    initialKB: adapterAcceptanceKB(kit),
    totalKB: adapterAcceptanceKB(kit),
    item1BaselineKB: ITEM1_ADAPTER_BASELINE_KB[kit],
    code: `export { DataTable } from "PKG";`,
    absent: ADAPTER_ABSENT,
  }));
}

function presetFixtures() {
  return ADAPTERS.flatMap(({ kit, pkg }) => [
    {
      name: `${kit} · preset`,
      kind: "preset",
      kit,
      pkg,
      entryFile: "preset.js",
      initialKB: 150,
      totalKB: 150,
      code: `export { standardFeatures } from "PKG";`,
    },
    {
      name: `${kit} · table + preset`,
      kind: "preset",
      kit,
      pkg,
      alsoEntryFile: "preset.js",
      initialKB: 160,
      totalKB: 160,
      code: `export { DataTable } from "PKG";\nexport { standardFeatures } from "ALSO";`,
    },
  ]);
}

function featureDeltaFixtures() {
  const { pkg } = adapterOf(DELTA_KIT);
  return uniqueFeatureSubpaths().map((subpath) => {
    const marker = FEATURE_MARKERS[subpath];
    const present = marker ? [marker] : [];
    const namedImport = subpath === "editing";
    return {
      name: `${DELTA_KIT} · + ${subpath}`,
      kind: "feature-delta",
      kit: DELTA_KIT,
      pkg,
      alsoEntryFile: `${subpath}.js`,
      initialKB: 160,
      totalKB: 160,
      code: namedImport
        ? `export { DataTable } from "PKG";\nexport { editing } from "ALSO";`
        : `export { DataTable } from "PKG";\nexport * from "ALSO";`,
      present,
      absent: absentExcept(present),
    };
  });
}

function combinationFixtures() {
  const { pkg } = adapterOf(DELTA_KIT);
  return [
    {
      name: `${DELTA_KIT} · live cluster`,
      kind: "combination",
      kit: DELTA_KIT,
      pkg,
      alsoFiles: ["cell-navigation.js", "find-in-table.js", "editing.js"],
      initialKB: 180,
      totalKB: 180,
      code: `export { DataTable } from "PKG";\nexport * from "ALSO0";\nexport * from "ALSO1";\nexport * from "ALSO2";`,
      present: ["GRID_CELL_ATTR", "matchKeySet", "useTableEditHistory"],
      absent: absentExcept([
        "GRID_CELL_ATTR",
        "matchKeySet",
        "useTableEditHistory",
      ]),
    },
    {
      name: `${DELTA_KIT} · filter + group + menu`,
      kind: "combination",
      kit: DELTA_KIT,
      pkg,
      alsoFiles: ["filters.js", "grouping.js", "column-menu.js"],
      initialKB: 180,
      totalKB: 180,
      code: `export { DataTable } from "PKG";\nexport * from "ALSO0";\nexport * from "ALSO1";\nexport * from "ALSO2";`,
      present: [
        "useFilterTreeChips",
        "groupedEntriesForStrategy",
        "header-rename-form",
      ],
      absent: absentExcept(["useFilterTreeChips", "header-rename-form"]),
    },
    {
      name: `${DELTA_KIT} · export + print`,
      kind: "combination",
      kit: DELTA_KIT,
      pkg,
      alsoFiles: ["export.js", "print.js"],
      initialKB: 180,
      totalKB: 180,
      code: `export { DataTable } from "PKG";\nexport * from "ALSO0";\nexport * from "ALSO1";`,
      present: ["buildExportTable"],
      absent: absentExcept(["buildExportTable"]),
    },
    {
      name: `${DELTA_KIT} · grouping + aggregation`,
      kind: "combination",
      kit: DELTA_KIT,
      pkg,
      alsoEntryFile: "grouping.js",
      initialKB: GROUPING_AGGREGATION_CEILING_KB,
      totalKB: GROUPING_AGGREGATION_CEILING_KB,
      code: `export { DataTable } from "PKG";\nexport { grouping } from "ALSO";\nexport { aggregate } from "@adapttable/react";`,
      present: ["groupedEntriesForStrategy", "aggregate"],
      absent: absentExcept(["groupedEntriesForStrategy"]),
    },
  ];
}

function allFeatureFixture() {
  const { pkg } = adapterOf(DELTA_KIT);
  return {
    name: `${DELTA_KIT} · all features`,
    kind: "all-features",
    kit: DELTA_KIT,
    pkg,
    alsoEntryFile: "features.js",
    initialKB: 220,
    totalKB: 220,
    code: `export { DataTable } from "PKG";\nexport * from "ALSO";`,
  };
}

const existingFixtures = [
  ...CORE_FIXTURES,
  ...REACT_FIXTURES,
  ...adapterBaseFixtures(),
  ...presetFixtures(),
  ...featureDeltaFixtures(),
  ...combinationFixtures(),
  allFeatureFixture(),
];

/**
 * The stable `--case` ID of a fixture name: `mui · + export` → `mui-plus-export`.
 * Names are already the keys published figures and comparables use.
 */
export function caseId(name) {
  return name
    .toLowerCase()
    .replaceAll("+", " plus ")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function withCaseIds(fixtures) {
  const seen = new Map();
  return fixtures.map((fixture) => {
    const id = caseId(fixture.name);
    if (seen.has(id)) {
      throw new Error(
        `"${fixture.name}" and "${seen.get(id)}" share the case ID ${id}`
      );
    }
    seen.set(id, fixture.name);
    return { id, ...fixture };
  });
}

export const FIXTURES = withCaseIds([
  ...existingFixtures,
  ...vueConsumerFixtures(existingFixtures, PLAIN_ADAPTER_CEILING_KB),
  ...angularConsumerFixtures(),
]);

/**
 * A consumer that deliberately imports a live hook into an adapter root.
 * The budget must report the leak; a green result here means the detector died.
 */
export function plantedLeakFixture() {
  return {
    id: "planted-leak",
    name: "planted leak · antd + useTableEditHistory",
    kind: "planted-leak",
    pkg: "adapter-antd",
    code: `export { DataTable } from "PKG";\nexport { useTableEditHistory } from "@adapttable/react";`,
    absent: ["useTableEditHistory"],
  };
}

/**
 * Ceiling that is both the plain-adapter hard cap and 35% under the item-1
 * baseline. A kit that postdates item 1 has no baseline and gets the cap.
 */
export function adapterAcceptanceKB(kit) {
  const baseline = ITEM1_ADAPTER_BASELINE_KB[kit];
  if (baseline === undefined) return PLAIN_ADAPTER_CEILING_KB;
  return Math.min(PLAIN_ADAPTER_CEILING_KB, baseline * 0.65);
}

const SCOPED_IMPORT = /["'](@adapttable\/[^/"']+)/g;

/**
 * The package folders a set of fixtures installs: each one's own package and
 * every `@adapttable/*` package its code names directly.
 */
export function fixtureFolders(fixtures, packages = workspacePackages()) {
  const folders = new Set();
  for (const fixture of fixtures) {
    folders.add(fixture.pkg);
    for (const [, name] of fixture.code.matchAll(SCOPED_IMPORT)) {
      folders.add(folderOf(name, packages));
    }
  }
  return [...folders].sort();
}
