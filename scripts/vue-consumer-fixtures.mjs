/** Packed Vue consumers use existing comparable ceilings, never an invented baseline. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { KITS } from "./kits.mjs";
import { packageDir } from "./packages.mjs";

export const VUE_RUNTIME_EXTERNALS = [/^vue($|\/)/];

/**
 * What the application already ships: the Vue runtime and the package's peer
 * UI library. As with React's kits, the measured share is AdaptTable's own.
 */
export function vueConsumerExternals(pkg) {
  const manifest = JSON.parse(
    readFileSync(join(packageDir(pkg), "package.json"), "utf8")
  );
  const peers = Object.keys(manifest.peerDependencies ?? {}).map(
    (name) =>
      new RegExp(`^${name.replaceAll(/[.*+?^${}()|[\]\\/]/g, "\\$&")}($|/)`)
  );
  return [...VUE_RUNTIME_EXTERNALS, ...peers];
}
export const PDF_WRITER_MARKER = "function pdfWriter";
export const XLSX_WRITER_MARKER = "function xlsxWriter";
const writers = [PDF_WRITER_MARKER, XLSX_WRITER_MARKER];
const drawerStyles = ["data-adapttable-filter-dialog", "filters-backdrop"];

/** What only a table served by a server source carries. */
export const SERVER_TIER_MARKERS = [
  "useServerData",
  "createLazyServerSource",
  "serverQuery",
];

/** Runtime implementations only: shared feature keys and erased types are allowed. */
export const VUE_OPTIONAL_BASE_MARKERS = [
  "createCommandPaletteController",
  "CommandPaletteChrome",
  "createContextMenuOpenController",
  "ContextMenuChrome",
  "createSavedViewsController",
  "createSavedViewRenameController",
  "SavedViewsMenuChrome",
  "SavedViewsPanelChrome",
  "groupedEntriesForStrategy",
  "createGroupingPanelController",
  "GroupingPanelChrome",
  "createRowReorderController",
  "RowReorderChrome",
  "row-actions-trigger",
  "row-actions-menu",
  "TableAssistantChrome",
  "AgentApprovalChrome",
  "createTableAssistant",
  "tableAgent",
  "adapttable.agent.v1",
];

const nativeConsumerHosts = {
  "nuxt-ui": "nuxt-vite",
  quasar: "quasar-vite",
};

/** Styled base consumers include their actual shipped CSS and native kit graph. */
export const VUE_NATIVE_BASE_SPECS = [
  ["element-plus", "adapttable-element-plus"],
  ["naive-ui", "adapttable-naive"],
  ["nuxt-ui", "adapttable-nuxt"],
  ["shadcn-vue", "adapttable-shadcn-vue"],
  ["quasar", "adapttable-quasar"],
  ["reka-ui", "at-reka"],
  ["vuetify", "adapttable-vuetify"],
].map(([kit, css]) => ({
  name: `${kit} · table`,
  pkg: `adapter-${kit}`,
  consumerHost: nativeConsumerHosts[kit],
  hardBaseCeiling: true,
  // 2026-11-24 plus 15%. shadcn-vue would round past the 80 KiB cap.
  ceilingKB: {
    "element-plus": 67,
    "naive-ui": 65,
    "nuxt-ui": 75,
    "shadcn-vue": 80,
    quasar: 74,
    "reka-ui": 67,
    vuetify: 66,
  }[kit],
  followsLibraryLocale: true,
  code: 'export { DataTable } from "PKG";\nimport "STYLE";',
  styleEntryFile: "styles.css",
  presentCss: [css],
  functionality: `${kit} table, native controls and published adapter stylesheet`,
  present: ["DataTable"],
  absent: [
    ...writers,
    "export-progress-surface",
    ...VUE_OPTIONAL_BASE_MARKERS,
    ...SERVER_TIER_MARKERS,
  ],
  rejectOptionalAi: true,
}));

/** What only a URL-synced table carries. */
const URL_STATE_MARKERS = [
  "createTableViewStore",
  "parseTableUrlState",
  "updateTableUrlState",
  "createHistoryAdapter",
];

/** Every published Vue kit, by its package folder suffix. */
const VUE_KITS = [
  "element-plus",
  "naive-ui",
  "nuxt-ui",
  "quasar",
  "reka-ui",
  "shadcn-vue",
  "vue-unstyled",
  "vuetify",
];

/**
 * Filters on every Vue kit, drawn with every widget and with only the text
 * widget: the fields a table never draws stay out of its bundle.
 */
export const VUE_FILTER_WIDGET_SPECS = VUE_KITS.flatMap((kit) => [
  {
    name: `${kit} · + filters`,
    pkg: `adapter-${kit}`,
    consumerHost: nativeConsumerHosts[kit],
    alsoEntryFile: "filters.js",
    comparable: "mui · + filters",
    code: 'export { DataTable } from "PKG";\nexport { filters } from "ALSO";',
    functionality: `${kit} table with filters drawn by every widget`,
    present: ["DataTable", "useTextFilter", "useRangeFilter"],
    absent: writers,
    rejectOptionalAi: true,
  },
  {
    name: `${kit} · + text filters`,
    pkg: `adapter-${kit}`,
    consumerHost: nativeConsumerHosts[kit],
    alsoEntryFile: "filters.js",
    comparable: "mui · + text filters",
    code: 'export { DataTable } from "PKG";\nexport { filtersWith, textFilterWidget } from "ALSO";',
    functionality: `${kit} table with filters drawn by the text widget only`,
    present: ["DataTable", "useTextFilter"],
    absent: [...writers, "useRangeFilter", "useBooleanFilter"],
    rejectOptionalAi: true,
  },
]);

/** A headless table that renders its header, rows and cells with Vue. */
const VUE_RENDERED_TABLE = `import { type ColumnDef, HOOK, useDataTable } from "PKG";
import { defineComponent, h, type PropType } from "vue";

interface Person {
  id: string;
  name: string;
  role: string;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "role" },
];

export const PeopleTable = defineComponent({
  props: {
    people: { type: Array as PropType<Person[]>, required: true },
  },
  setup(props) {
    const source = HOOK({ data: () => props.people, columns });
    const table = useDataTable({ source, columns, rowKey: (row) => row.id });
    type Column = (typeof table.columns.value)[number];
    const header = (column: Column) =>
      h("th", { key: column.key, ...table.headerCellAttrs(column) }, [
        column.sortable
          ? h("button", table.sortButtonAttrs(column), column.header)
          : column.header,
      ]);
    const row = (item: Person, index: number) =>
      h(
        "tr",
        { key: table.rowKey(item), ...table.rowAttrs(item, index) },
        table.columns.value.map((column) =>
          h(
            "td",
            { key: column.key, ...table.cellAttrs(column) },
            String(table.cellValue(column, item) ?? "")
          )
        )
      );
    return () =>
      h("div", [
        h("input", table.searchInputAttrs()),
        h("table", table.tableAttrs(), [
          h("thead", [h("tr", table.headerRowAttrs(), table.columns.value.map(header))]),
          h("tbody", table.rows.value.map(row)),
        ]),
      ]);
  },
});`;

/** Each row names the actual published entries and functionality being measured. */
export const VUE_CONSUMER_SPECS = [
  {
    name: "vue · simple table",
    pkg: "vue",
    comparable: "react · simple table",
    code: 'export { useFrontendData, useDataTable } from "PKG";',
    functionality: "Source composable and headless table model",
    present: ["useFrontendData", "useDataTable", "resolveTableLabels"],
    absent: [...writers, "DataTableSurfaceChrome", "defaultLabels"],
  },
  {
    name: "vue · local table",
    pkg: "vue",
    comparable: "react · simple table",
    code: 'export { useLocalFrontendData, useDataTable } from "PKG";',
    functionality: "In-memory source composable without URL sync",
    present: [
      "useLocalFrontendData",
      "useDataTable",
      "createLocalTableViewStore",
    ],
    absent: [
      ...writers,
      "DataTableSurfaceChrome",
      "defaultLabels",
      "createTableViewStore",
      "parseTableUrlState",
      "updateTableUrlState",
      "createHistoryAdapter",
    ],
  },
  // An application that renders the table it builds: header buttons, rows
  // and cells from a render function.
  ...[
    ["rendered table", "useFrontendData", "createTableViewStore"],
    [
      "rendered local table",
      "useLocalFrontendData",
      "createLocalTableViewStore",
    ],
  ].map(([name, hook, store]) => ({
    name: `vue · ${name}`,
    pkg: "vue",
    comparable: `react · ${name}`,
    typescript: true,
    code: VUE_RENDERED_TABLE.replaceAll("HOOK", hook),
    functionality: `Headless table rendered by the application, ${hook}`,
    present: ["useDataTable", hook, store],
    absent: [
      ...writers,
      "DataTableSurfaceChrome",
      "defaultLabels",
      ...(store === "createLocalTableViewStore" ? URL_STATE_MARKERS : []),
    ],
  })),
  {
    name: "vue-unstyled · table",
    pkg: "adapter-vue-unstyled",
    hardBaseCeiling: true,
    ceilingKB: 60,
    code: 'export { DataTable } from "PKG";',
    functionality: "Native table without optional features",
    present: ["DataTable"],
    absent: [...writers, "export-progress-surface"],
  },
  ...[
    ["density", "densityChooser", "density-toggle"],
    ["fullscreen", "fullscreen", "fullscreen-toggle"],
  ].map(([entry, factory, marker]) => ({
    name: `vue-unstyled · + ${entry}`,
    pkg: "adapter-vue-unstyled",
    alsoEntryFile: `${entry}.js`,
    comparable: `mui · + ${entry}`,
    code: `export { DataTable } from "PKG";\nexport { ${factory} } from "ALSO";`,
    functionality: `Native table with the ${factory} control`,
    present: ["DataTable", factory, marker],
    absent: [
      ...writers,
      "tableAgent",
      "createTableAssistant",
      "adapttable.agent.v1",
    ],
    rejectOptionalAi: true,
  })),
  {
    name: "vue-unstyled · preset",
    pkg: "adapter-vue-unstyled",
    entryFile: "preset.js",
    comparable: "mui · preset",
    code: 'export { standardFeatures } from "PKG";\nimport "STYLE";',
    styleEntryFile: "styles.css",
    presentCss: drawerStyles,
    functionality:
      "All standard preset factories and conditional configured members",
    present: ["standardFeatures", "export-progress-surface"],
    absent: writers,
  },
  {
    name: "vue-unstyled · table + preset",
    pkg: "adapter-vue-unstyled",
    alsoEntryFile: "preset.js",
    comparable: "mui · table + preset",
    ceilingKB: 130,
    code: 'export { DataTable } from "PKG";\nexport { standardFeatures } from "ALSO";\nimport "STYLE";',
    styleEntryFile: "styles.css",
    presentCss: drawerStyles,
    functionality: "Native table and standard preset",
    present: ["DataTable", "standardFeatures", "export-progress-surface"],
    absent: writers,
  },
  ...[
    ["export", "exportCsv", [], writers],
    ["export-pdf", "exportPdf", [PDF_WRITER_MARKER], [XLSX_WRITER_MARKER]],
    ["export-xlsx", "exportXlsx", [XLSX_WRITER_MARKER], [PDF_WRITER_MARKER]],
  ].map(([entry, factory, present, absent]) => ({
    name: `vue-unstyled · + ${entry}`,
    pkg: "adapter-vue-unstyled",
    alsoEntryFile: `${entry}.js`,
    comparable: "mui · + export",
    code: `export { DataTable } from "PKG";\nexport { ${factory} } from "ALSO";`,
    functionality: `Native table, ${factory}, export controller and native progress controls`,
    present: ["DataTable", "export-progress-surface", ...present],
    absent,
  })),
  {
    name: "vue-unstyled · grouping + aggregation",
    pkg: "adapter-vue-unstyled",
    alsoEntryFile: "grouping.js",
    comparable: "mui · grouping + aggregation",
    code: 'export { DataTable } from "PKG";\nexport { grouping } from "ALSO";\nexport { aggregate } from "@adapttable/vue";',
    functionality: "Native table, row grouping and the aggregate factory",
    present: ["DataTable", "groupedEntriesForStrategy", "aggregate"],
    absent: [...writers, "tableAgent", "createTableAssistant"],
    rejectOptionalAi: true,
  },
  {
    name: "vue-unstyled · features barrel",
    pkg: "adapter-vue-unstyled",
    comparable: "mui · features barrel",
    code: 'export { DataTable } from "PKG";\nexport * from "@adapttable/vue/features";\nimport "STYLE";',
    styleEntryFile: "styles.css",
    presentCss: drawerStyles,
    functionality:
      "Native table and every headless factory from the binding features entry",
    present: ["DataTable", "exportCsv", "grouping"],
    absent: writers,
  },
  ...VUE_NATIVE_BASE_SPECS,
  ...VUE_NATIVE_BASE_SPECS.map((spec) => ({
    name: `${spec.name.replace(" · table", "")} · table + preset`,
    pkg: spec.pkg,
    consumerHost: spec.consumerHost,
    alsoEntryFile: "preset.js",
    // Packed 2026-11-24, initial gzip plus 15%. Locale chunk sits in the total.
    ceilingKB: {
      "element-plus": 132,
      "naive-ui": 129,
      "nuxt-ui": 146,
      "shadcn-vue": 156,
      quasar: 149,
      "reka-ui": 131,
      vuetify: 132,
    }[spec.name.replace(" · table", "")],
    followsLibraryLocale: true,
    code: 'export { DataTable } from "PKG";\nexport { standardFeatures } from "ALSO";\nimport "STYLE";',
    styleEntryFile: "styles.css",
    presentCss: spec.presentCss,
    functionality: `${spec.pkg.replace("adapter-", "")} table and standard preset`,
    present: ["DataTable", "standardFeatures", "export-progress-surface"],
    absent: writers,
  })),
  ...VUE_FILTER_WIDGET_SPECS,
];

/** Optional rendering is checked independently from the existing size budgets. */
export const VUE_LAYOUT_GRAPH_SPECS = [
  ...VUE_NATIVE_BASE_SPECS.filter((spec) =>
    [
      "adapter-element-plus",
      "adapter-naive-ui",
      "adapter-nuxt-ui",
      "adapter-quasar",
      "adapter-vuetify",
    ].includes(spec.pkg)
  ).map((spec) => ({
    name: `${spec.pkg.slice("adapter-".length)} · features barrel`,
    pkg: spec.pkg,
    consumerHost: spec.consumerHost,
    code: 'export { DataTable } from "PKG";\nexport * from "@adapttable/vue/features";\nimport "STYLE";',
    styleEntryFile: spec.styleEntryFile,
    presentCss: spec.presentCss,
    functionality: "Native table and combined native feature factories",
    present: ["DataTable", "editing", "filters", "rowActions", "savedViews"],
    absent: [],
    rejectOptionalAi: true,
  })),
  {
    name: "vue · headless adapter shell",
    pkg: "vue",
    entryFile: "adapter.js",
    code: 'export { useDataTableShell } from "PKG";',
    present: ["useDataTableShell"],
    absent: [...writers, "DataTableSurfaceChrome"],
  },
  {
    name: "vue · optional table surface",
    pkg: "vue",
    entryFile: "adapter.js",
    code: 'export { DataTableSurfaceChrome } from "PKG";',
    present: ["DataTableSurfaceChrome"],
    absent: writers,
  },
];

export function vueConsumerFixtures(
  comparables,
  hardBaseCeiling,
  lazyLocaleKB = 0
) {
  return VUE_CONSUMER_SPECS.map((spec) => {
    const comparable = comparables.find(
      (fixture) => fixture.name === spec.comparable
    );
    if (
      !spec.hardBaseCeiling &&
      spec.ceilingKB === undefined &&
      !comparable
    )
      throw new Error(`Missing comparable Vue budget: ${spec.comparable}`);
    // These ceilings have always held every emitted file, so they are total
    // ceilings; the initial share is a subset held to the same number. A kit
    // that follows its library's locale may also load one language preset.
    const ceilingKB =
      spec.ceilingKB ??
      (spec.hardBaseCeiling ? hardBaseCeiling : comparable.initialKB);
    const totalCeilingKB =
      ceilingKB + (spec.followsLibraryLocale ? lazyLocaleKB : 0);
    return {
      ...spec,
      framework: "vue",
      kind: "vue-consumer",
      kit: spec.pkg === "vue" ? undefined : spec.pkg.replace(/^adapter-/, ""),
      initialKB: ceilingKB,
      totalKB: totalCeilingKB,
    };
  });
}

/** Registry membership must not silently bypass packed-consumer coverage. */
export function vueConsumerCoverageProblems(fixtures, kits = KITS) {
  const problems = [];
  for (const spec of VUE_CONSUMER_SPECS) {
    if (
      fixtures.filter(
        (fixture) => fixture.name === spec.name && fixture.framework === "vue"
      ).length !== 1
    )
      problems.push(`Expected exactly one packed Vue consumer: ${spec.name}`);
  }
  for (const kit of kits.filter(
    (kit) => kit.framework === "vue" && kit.role !== "private"
  )) {
    if (
      !fixtures.some(
        (fixture) =>
          fixture.framework === "vue" &&
          fixture.pkg === kit.name &&
          fixture.hardBaseCeiling
      )
    )
      problems.push(`Missing Vue kit base consumer: ${kit.name}`);
  }
  return problems;
}

function kitForImport(source, kits) {
  return kits.find((kit) => {
    const name = `@adapttable/${kit.name.replace(/^adapter-/, "")}`;
    return (
      source === name ||
      source.startsWith(`${name}/`) ||
      source.includes(`/packages/${kit.framework}/${kit.name}/`)
    );
  });
}

export function vueForeignImport(source, fixture, kits = KITS) {
  const imported = source.replaceAll("\\", "/");
  const kit = kitForImport(imported, kits);
  if (kit && kit.name !== fixture.pkg) return `another kit ${kit.name}`;
  if (
    /^(?:react(?:-dom|-compiler-runtime)?)(?:$|\/)/.test(imported) ||
    /^@angular\//.test(imported) ||
    /^@adapttable\/(?:react|angular|ai-react|ai-angular)(?:$|\/)/.test(
      imported
    ) ||
    /\/packages\/(?:react|angular)\//.test(imported)
  )
    return `another framework ${source}`;
  return undefined;
}

/** Read emitted CSS assets, never a matching string in a JavaScript chunk. */
export function vueEmittedCss(output) {
  return output
    .filter((file) => file.type === "asset" && file.fileName.endsWith(".css"))
    .map((file) =>
      typeof file.source === "string"
        ? file.source
        : new TextDecoder().decode(file.source)
    )
    .join("\n");
}

export function vueMissingCss(fixture, css) {
  return (fixture.presentCss ?? []).filter((marker) => !css.includes(marker));
}

export function vueGraphProblems(fixture, { code, imports, css = "" }) {
  const failures = [];
  for (const marker of fixture.present ?? [])
    if (!new RegExp(`\\b${marker}\\b`).test(code))
      failures.push(`${fixture.name}: missing ${marker}`);
  for (const marker of fixture.absent ?? [])
    if (new RegExp(`\\b${marker}\\b`).test(code))
      failures.push(`${fixture.name}: leaked ${marker}`);
  for (const marker of vueMissingCss(fixture, css))
    failures.push(`${fixture.name}: missing CSS ${marker}`);
  for (const source of imports) {
    const foreign = vueForeignImport(source, fixture);
    if (foreign) failures.push(`${fixture.name}: reached ${foreign}`);
    const imported = source.replaceAll("\\", "/");
    if (
      fixture.rejectOptionalAi &&
      (/(?:^|\/node_modules\/)@adapttable\/ai(?:-vue)?(?:$|\/)/.test(
        imported
      ) ||
        /\/packages\/(?:shared\/ai|vue\/ai-vue)\//.test(imported))
    )
      failures.push(`${fixture.name}: reached optional AI runtime ${source}`);
  }
  return failures;
}
