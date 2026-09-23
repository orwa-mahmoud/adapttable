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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const classification = JSON.parse(
  readFileSync(join(ROOT, "scripts/feature-classification.json"), "utf8")
);

/** Hard acceptance for a plain adapter `DataTable` — never raise this. */
export const PLAIN_ADAPTER_CEILING_KB = 80;

/**
 * Item-1 packed adapter roots, the baseline the 35% reduction is judged
 * against. These are the committed per-kit figures from the classification
 * seam measurement, which is the item-1 / pre-split graph.
 */
export const ITEM1_ADAPTER_BASELINE_KB =
  classification.seamMeasurement.packedBefore;

export const ADAPTERS = [
  { kit: "mantine", pkg: "adapter-mantine" },
  { kit: "mui", pkg: "adapter-mui" },
  { kit: "chakra", pkg: "adapter-chakra" },
  { kit: "antd", pkg: "adapter-antd" },
  { kit: "radix", pkg: "adapter-radix" },
  { kit: "base-ui", pkg: "adapter-base-ui" },
  { kit: "shadcn", pkg: "adapter-shadcn" },
  { kit: "unstyled", pkg: "adapter-unstyled" },
];

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

const CORE_FIXTURES = [
  {
    name: "core · simple table",
    kind: "core",
    pkg: "core",
    budgetKB: 20,
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
    name: "core · every export",
    kind: "core",
    pkg: "core",
    budgetKB: 93,
    code: `export * from "PKG";`,
    absent: ["useRowPatchStream", "grouping-drop-zone"],
  },
  {
    name: "core · pivot",
    kind: "core",
    pkg: "core",
    entryFile: "pivot.js",
    budgetKB: 5,
    code: `export { pivot } from "PKG";`,
  },
  {
    name: "core · formula",
    kind: "core",
    pkg: "core",
    entryFile: "formula.js",
    budgetKB: 6,
    code: `export { buildFormulaColumns } from "PKG";`,
  },
  {
    name: "core · stream",
    kind: "core",
    pkg: "core",
    entryFile: "stream.js",
    budgetKB: 5,
    code: `export { openRowPatchStream, parseRowPatchFrame } from "PKG";`,
    absent: ["useState", "useRowPatchStream"],
  },
  {
    name: "core · query",
    kind: "core",
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
    name: "server · parse a query",
    kind: "core",
    pkg: "server",
    // Declared filters, filter-type checks, the typed filter tree and
    // grouping keys all run inside parseTableQuery, so a column-list caller
    // carries them too.
    budgetKB: 5,
    code: `export { parseTableQuery } from "PKG";`,
    absent: ["useState", "PIVOT_BLANK", "toCsv"],
  },
];

const REACT_FIXTURES = [
  {
    name: "react · simple table",
    kind: "react",
    pkg: "react",
    budgetKB: 35,
    code: `export { useFrontendData, useDataTable } from "PKG";`,
    present: ["useDataTable", "useFrontendData"],
    absent: ["grouping-drop-zone"],
  },
  {
    name: "react · grouping panel",
    kind: "react",
    pkg: "react",
    entryFile: "features.js",
    budgetKB: 16,
    code: `export { groupingPanel } from "PKG";`,
    present: ["groupingPanel"],
  },
  {
    name: "react · pivot rendered",
    kind: "react",
    pkg: "react",
    entryFile: "pivot.js",
    budgetKB: 8,
    code: `export { pivotTableModel } from "PKG";`,
  },
  {
    name: "react · stream hook",
    kind: "react",
    pkg: "react",
    entryFile: "stream.js",
    budgetKB: 6,
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
    budgetKB: PLAIN_ADAPTER_CEILING_KB,
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
      budgetKB: 150,
      code: `export { standardFeatures } from "PKG";`,
    },
    {
      name: `${kit} · table + preset`,
      kind: "preset",
      kit,
      pkg,
      alsoEntryFile: "preset.js",
      budgetKB: 160,
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
      budgetKB: 160,
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
      budgetKB: 180,
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
      budgetKB: 180,
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
      budgetKB: 180,
      code: `export { DataTable } from "PKG";\nexport * from "ALSO0";\nexport * from "ALSO1";`,
      present: ["buildExportTable"],
      absent: absentExcept(["buildExportTable"]),
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
    budgetKB: 220,
    code: `export { DataTable } from "PKG";\nexport * from "ALSO";`,
  };
}

export const FIXTURES = [
  ...CORE_FIXTURES,
  ...REACT_FIXTURES,
  ...adapterBaseFixtures(),
  ...presetFixtures(),
  ...featureDeltaFixtures(),
  ...combinationFixtures(),
  allFeatureFixture(),
];

/**
 * A consumer that deliberately imports a live hook into an adapter root.
 * The budget must report the leak; a green result here means the detector died.
 */
export function plantedLeakFixture(root = ROOT) {
  return {
    name: "planted leak · antd + useTableEditHistory",
    kind: "planted-leak",
    pkg: "adapter-antd",
    code: `export { DataTable } from "PKG";\nexport { useTableEditHistory } from ${JSON.stringify(
      join(root, "packages/react/dist/index.js")
    )};`,
    absent: ["useTableEditHistory"],
  };
}

/** Ceiling that is both the 80 KB hard cap and 35% under the item-1 baseline. */
export function adapterAcceptanceKB(kit) {
  const baseline = ITEM1_ADAPTER_BASELINE_KB[kit];
  return Math.min(PLAIN_ADAPTER_CEILING_KB, baseline * 0.65);
}
