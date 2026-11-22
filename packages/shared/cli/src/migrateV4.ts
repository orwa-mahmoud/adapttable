import {
  type ImportMoves,
  type ImportRoute,
  type MigrationIssue,
  type MigrationResult,
  reportPatterns,
  rewriteImports,
} from "./importMigration";
import { CORE_MAIN_MOVES, REACT_MAIN_TO_ADAPTER } from "./migrateV4Moves";

/** Each bundled language's entry under `@adapttable/i18n/locales/`. */
const I18N_DICTIONARIES: Readonly<Record<string, string>> = {
  ar: "ar",
  cs: "cs",
  de: "de",
  en: "en",
  es: "es",
  fa: "fa",
  fr: "fr",
  he: "he",
  hi: "hi",
  id: "id",
  it: "it",
  ja: "ja",
  ko: "ko",
  pl: "pl",
  pt: "pt",
  ru: "ru",
  tr: "tr",
  ur: "ur",
  zh: "zh",
  zhTW: "zh-TW",
};

/** The Vue kits whose `/export-csv` entry is now `/export`. */
const VUE_KITS = [
  "element-plus",
  "naive-ui",
  "nuxt-ui",
  "quasar",
  "reka-ui",
  "shadcn-vue",
  "vue-unstyled",
  "vuetify",
] as const;

function everyTo(
  names: readonly string[],
  to: string
): Record<string, ImportRoute> {
  return Object.fromEntries(names.map((name) => [name, to]));
}

const V4_MOVES: ImportMoves = {
  redirects: {
    "@adapttable/i18n/load": "@adapttable/i18n",
    ...Object.fromEntries(
      VUE_KITS.map((kit) => [
        `@adapttable/${kit}/export-csv`,
        `@adapttable/${kit}/export`,
      ])
    ),
  },
  routes: {
    "@adapttable/core": Object.fromEntries(
      Object.entries(CORE_MAIN_MOVES).flatMap(([to, names]) =>
        names.map((name): [string, ImportRoute] => [name, to])
      )
    ),
    "@adapttable/core/binding": {
      sameRows: { to: "@adapttable/core/binding", name: "sameItems" },
    },
    "@adapttable/react": everyTo(
      REACT_MAIN_TO_ADAPTER,
      "@adapttable/react/adapter"
    ),
    "@adapttable/server": {
      splitFilterValues: { to: "@adapttable/server", name: "splitListParam" },
    },
    "@adapttable/angular/features": {
      exportPdf: "@adapttable/angular/pdf",
      exportXlsx: "@adapttable/angular/xlsx",
    },
    "@adapttable/nuxt-ui/cell-navigation": {
      columnSelectionCheckbox: "@adapttable/nuxt-ui/column-selection",
    },
    "@adapttable/i18n": {
      getLabels: "@adapttable/i18n/catalog",
      locales: "@adapttable/i18n/catalog",
      ...Object.fromEntries(
        Object.entries(I18N_DICTIONARIES).map(([name, tag]) => [
          name,
          `@adapttable/i18n/locales/${tag}`,
        ])
      ),
    },
  },
};

/** Removed label keys: a host that sets one deletes it. */
const REMOVED_LABELS = [
  "noticeReorderNested",
  "pendingProposals",
  "assistantReceipt",
  "rowMoveOptions",
  "moveToTopLevel",
  "groupingAggregateColumn",
  "groupingAggregationDefault",
] as const;

/** Table props that are options of the server source in v4. */
const SERVER_SOURCE_PROPS = [
  "total",
  "responseKey",
  "aggregates",
  "supports",
  "facetKeys",
  "facets",
] as const;

/** The same props as a Vue template binds them: camelCase or kebab-case. */
const VUE_SERVER_SOURCE_PROPS = [
  ...new Set(
    SERVER_SOURCE_PROPS.flatMap((name) => [
      name,
      name.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
    ])
  ),
];

const SERVER_SOURCE_PROP =
  "If this is a table prop: total, responseKey, aggregates, supports, facetKeys and facets are options of the server source now (useServerData, injectServerData).";

/** Usages v4 changed in meaning or shape: reported, never rewritten. */
const MANUAL: readonly (readonly [RegExp, string])[] = [
  [
    /\bmobileIdentityColumns\b/g,
    "mobileIdentityColumns was removed; hideOnMobile on each column decides what a card shows. Delete the prop.",
  ],
  [
    /\bgroupRowSlotKey\s*\(/g,
    "groupRowSlotKey() was removed; use GROUP_ROW from @adapttable/vue/adapter.",
  ],
  [
    new RegExp(String.raw`\b(?:${REMOVED_LABELS.join("|")})\b`, "g"),
    "This label was removed from TableLabels; delete the key.",
  ],
  [
    /\bsortRows(?:Multi)?\b/g,
    "sortRows and sortRowsMulti were removed; sort through the table, or compare with compareValues.",
  ],
  [
    /\b(?:SHELL_LIVE_STAGE_ORDER|ShellLiveStageId)\b/g,
    "The fixed live-stage order was removed; name a stage's reads and writes with liveStageKey and collect stages with liveStagesOf.",
  ],
  [
    /\bdefaultPendingRows\b/g,
    "defaultPendingRows was removed; read labels.pendingRows from the resolved labels.",
  ],
  [
    /\bcapabilityReason\s*\(/g,
    'capabilityReason takes (capability, labels) and answers for "grouping" and "exportScope".',
  ],
  [
    /\b(?:collectFeatureNotices|chromeFeatureNotices|resolveExportDisabledReason)\s*\(/g,
    "Notices and the export disabled reason read their text from resolved labels; pass them.",
  ],
  [
    /\buseExportHandler\s*\(/g,
    "useExportHandler(handler, labels) takes the table's resolved labels as its second argument.",
  ],
  [
    /\busePublishTableRuntime\s*\(/g,
    "usePublishTableRuntime takes a TableRuntimeReader: { rows(), labels(), view() }.",
  ],
  [
    /\bTableRuntimePublisher\b/g,
    "TableRuntimePublisher stages a render with stage(chrome, actions) and builds the view on view().",
  ],
  [
    /\bcreateEditConflictStore\b/g,
    "createEditConflictStore was replaced by createDeferredEditConflictStore and loadEditConflictStore.",
  ],
  [
    /\bstandardPreset\b/g,
    "Angular's standardPreset was replaced by standardFeatures from @adapttable/angular/features.",
  ],
  [
    /\browAction\s*:/g,
    "If this is a Vue classNames key: rowAction was removed; use actionButton.",
  ],
  [
    /(?:\bmode=["'](?:server|frontend)["']|\[mode\]=)/g,
    'A table takes no mode: pass data, or a source (a server source from useServerData or injectServerData). With mode="frontend", rename the table\'s onQueryChange to onViewChange.',
  ],
  [
    /(?:\bonQueryChange=\{|\[onQueryChange\]=|@query-change=|:on-?[qQ]uery-?[cC]hange=)/g,
    "A table's onQueryChange moved: a server table builds useServerData({ rows, total, onQueryChange }) (Angular: injectServerData) and passes it as source; a table that keeps its rows and only listens uses onViewChange.",
  ],
  [
    new RegExp(String.raw`\b(?:${SERVER_SOURCE_PROPS.join("|")})=\{`, "g"),
    SERVER_SOURCE_PROP,
  ],
  [
    new RegExp(String.raw`\[(?:${SERVER_SOURCE_PROPS.join("|")})\]=`, "g"),
    SERVER_SOURCE_PROP,
  ],
  [
    new RegExp(String.raw`:(?:${VUE_SERVER_SOURCE_PROPS.join("|")})=`, "g"),
    SERVER_SOURCE_PROP,
  ],
  [
    /\bToolbarExtrasSlotProps\b/g,
    "ToolbarExtrasSlotProps was replaced by ToolbarEntrySlotProps (labels, class map); each toolbar control reads its feature's state. React: useFeatureState with EDIT_HISTORY_STATE, EXPORT_STATE, FULLSCREEN_STATE, TABLE_PROPS_STATE. Vue: UndoRedoControlProps for the undo/redo control, toolbarEntry for a feature's control. Angular: injectDensityToolbar, injectFullscreenToolbar, injectExportToolbar, injectPrintToolbar, injectUndoRedoToolbar.",
  ],
  [
    /\.(?:toolbarExtras|columnMenuProps)\b|\bv\.(?:savedViews|columnMenu)\b/g,
    "The Angular table view draws one toolbar outlet with v.toolbarEntry(); controls read their feature's state (injectExportToolbar and the rest), and a kit adds SAVED_VIEWS_ENTRY and COLUMN_MENU_ENTRY beside its menus.",
  ],
  [
    /\bchrome\.(?:mergedChips|activeFilterCount|filterDefs|filterRegistry)\b/g,
    "The table chrome no longer carries the filter chips: the filters feature publishes FILTER_CHIPS_STATE ({ chips, activeFilterCount }); read it with useFeatureState.",
  ],
  [
    /\bchrome\.(?:editing|editHistory)\b/g,
    "The table chrome no longer carries editing or the edit history: read EDITING_STATE or EDIT_HISTORY_STATE with useFeatureState, or the finished shell's tableProps.editing.",
  ],
  [
    /\buseChromeScrollReset\(\s*\w+\s*,\s*\w+\s*,/g,
    "useChromeScrollReset(ref, props) takes the root and the props; drop the chrome argument.",
  ],
  [
    /\bToolbarChromeProps\b/g,
    "ToolbarChromeProps was removed: undoRedoToolbar returns UndoRedoToolbarProps, and the binding draws every kit's toolbar.",
  ],
  [
    /\bsavedViewsMenu\b|\.columnMenu\b(?!\s*\()/g,
    "A kit toolbar no longer receives savedViewsMenu or columnMenu: the saved-views and column-menu features add toolbar entries, drawn in TOOLBAR_EXTRAS right after Filters.",
  ],
  [
    /\b(?:toolbarExtrasProps|hasActionToolbar)\b/g,
    "The Vue shell's toolbarExtrasProps and hasActionToolbar were removed; each feature draws its own toolbar entry (toolbarEntry), and the toolbar shows when an entry draws.",
  ],
  [
    /\b(?:FIND_LIVE|CELL_NAV_LIVE|EXPORT_LIVE|FULLSCREEN_LIVE|SELECTION_STATS_LIVE|FindLiveDraw|CellNavLiveDraw|ExportLiveDraw|FullscreenLiveDraw|SelectionStatsLiveDraw)\b/g,
    "The per-feature live slots were removed; each feature runs its hook from its own live stage (liveStageKey).",
  ],
  [
    /\bOptionalEditableCell\b/g,
    "OptionalEditableCell was renamed CellContent.",
  ],
  [
    /\bOptional(?:TreeCell|TreeToggle|FillHandle|ExpandToggle|FilterHeader|RowEditActions|RowReorderHandle|RowReorderButtons|ColumnGroupToggle|ColumnHeaderRename|ColumnSelect|GroupHeaderRow|GroupHeaderCard)\b/g,
    "The Optional* cell wrappers were removed; draw the position with <FeatureSlot slot={…} props={…} fallback={…} /> and its slot key.",
  ],
  [
    /\bCHROME_EXTRA_SLOT_ORDER\b/g,
    'CHROME_EXTRA_SLOT_ORDER was removed; chrome stages declare what they read and write, and liveStagesOf(features, "chrome") orders them.',
  ],
  [
    /\b(?:HistoryLiveGate|EDIT_HISTORY_LIVE|EditHistoryLiveSlotProps|EditHistoryLiveDraw)\b/g,
    "Edit history is the EDIT_HISTORY_STAGE chrome stage, which ChromeExtrasGate runs; the history gate and its slot were removed.",
  ],
  [
    /\bDataModeProps\b/g,
    "DataModeProps was removed; DataTableProps is DataTablePropsBase.",
  ],
];

/**
 * Apply only the v4 migrations that preserve meaning mechanically.
 *
 * Names that left a main entry move to the entry that serves them, renamed
 * exports keep the local name through an alias, and moved subpaths redirect.
 * Usages whose meaning or shape changed are reported and left untouched.
 *
 * @param source - A source file's text.
 * @returns The rewritten text, how many imports moved, and what needs a person.
 */
export function migrateV4Source(source: string): MigrationResult {
  const rewritten = rewriteImports(source, V4_MOVES);
  const issues: MigrationIssue[] = rewritten.issues;
  reportPatterns(rewritten.code, MANUAL, issues);
  return {
    code: rewritten.code,
    changed: rewritten.code !== source,
    movedImports: rewritten.movedImports,
    issues,
  };
}
