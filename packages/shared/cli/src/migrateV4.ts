import {
  type ImportMoves,
  type ImportRoute,
  issueAt,
  type MigrationIssue,
  type MigrationResult,
  reportPatterns,
  rewriteImports,
} from "./importMigration";
import {
  KIT_FEATURE_BARREL_REDIRECTS,
  KIT_FEATURE_BARREL_ROUTES,
} from "./kitFeatureBarrelMoves";
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
    ...KIT_FEATURE_BARREL_REDIRECTS,
  },
  routes: {
    "@adapttable/core": Object.fromEntries(
      Object.entries(CORE_MAIN_MOVES).flatMap(([to, names]) =>
        names.map((name): [string, ImportRoute] => [name, to])
      )
    ),
    "@adapttable/core/binding": {
      sameRows: { to: "@adapttable/core/binding", name: "sameItems" },
      ...everyTo(
        [
          "aggregate",
          "approvalArgumentPairs",
          "approvalValueText",
          "autoSizeColumns",
          "cellValue",
          "computedAggregateKeys",
          "conditionToExtra",
          "declaredAggregates",
          "filterLabel",
          "sourceCapabilities",
          "treeColumnKey",
          "visibleColumns",
        ],
        "@adapttable/core"
      ),
    },
    "@adapttable/react": everyTo(
      REACT_MAIN_TO_ADAPTER,
      "@adapttable/react/adapter"
    ),
    "@adapttable/react/adapter": {
      applyTableFeatures: "@adapttable/react/features",
    },
    "@adapttable/react/features": {
      useTableFeatures: "@adapttable/react/adapter",
    },
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
    ...KIT_FEATURE_BARREL_ROUTES,
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
    /\b(?:selectedIds|onSelectionChange|selectionGetId)=\{/g,
    "Selection is a feature: compose selection({ selectedIds, onSelectionChange, getId }) from @adapttable/<kit>/selection and delete the table prop.",
  ],
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
    /\b(?:v|view\(\))\.(?:commandPalette|contextMenu|rowMutations)\(\)/g,
    "The Angular view's commandPalette, contextMenu and rowMutations are undefined unless their feature is composed: draw them behind @if (v.commandPalette; as commandPalette), or read v.rowMutations?.(). A kit's own palette and menu features wrap the binding's with withCommandPaletteView and withContextMenuView.",
  ],
  [
    /\bchrome\.(?:mergedChips|activeFilterCount|filterDefs|filterRegistry)\b/g,
    "The table chrome no longer carries the filter chips: the filters feature publishes FILTER_CHIPS_STATE ({ chips, activeFilterCount }); read it with useFeatureState.",
  ],
  [
    /\bchrome\.(?:editing|editHistory|detail|rowMutations|rowActions|hasRowActions|rowPinning|groupingPanel|grouping|tree|groupingArmed|treeShaped|autoSizeColumns|autoSizeColumn|columnLayoutLive|hasRowReorder|rowReorder)\b/g,
    "The table chrome no longer carries feature state: read EDITING_STATE, EDIT_HISTORY_STATE, ROW_DETAIL_STATE, ROW_ACTIONS_STATE, ROW_PINNING_STATE, GROUPING_STATE, GROUPING_PANEL_VIEW_STATE, TREE_STATE, COLUMN_SIZING_STATE or ROW_REORDER with useFeatureState, or the finished shell's tableProps and hasRowReorder.",
  ],
  [
    /\b(?:groupingPanelProps|DataTableShellGroupingPanelProps)\b/g,
    "The shell no longer carries the grouping panel's props: the panel's state is the finished shell's tableProps.groupingPanel (GROUPING_PANEL_VIEW_STATE), and the strip's props are GroupingPanelSlotProps.",
  ],
  [
    /\.onDispose\(/g,
    "A feature's setup only registers: move what onDispose released into the feature's mount(context) and return the cleanup there. An ordinary option change keeps the mounted resource; change its dependencies or id to replace it.",
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
const TABLE_BINDINGS: readonly (readonly [RegExp, string])[] = [
  [
    /v-model:selected-ids\b|v-model:selectedIds\b/g,
    "Vue selected ids are a feature: compose selection({ selectedIds, onSelectionChange }) from the kit's selection entry. v-model:selected-ids is reported and left in place, because the host owns the ref.",
  ],
  [
    /\[(?:selectedIds|selectionGetId)\]|\((?:selectionChange|selectedIdsChange)\)/g,
    "Angular selection bindings are a feature: compose selection({ selectedIds, onSelectionChange, getId }) from the kit's selection entry. [selectedIds] and (selectionChange) are reported and left in place, because the host owns the signal and the callback.",
  ],
  [
    /\bfiltersMode\s*=|\[filtersMode\]|\[filterFields\]|\[closeHeaderFilterOnSelect\]|\[extraChips\]/g,
    'Filter placement is a feature option: filters(defs, { mode: "drawer", fields: false }) and headerFilters({ closeOnSelect: true }). The table prop is reported and left in place.',
  ],
  [
    /\[onColumnRename\]|\bonColumnRename\s*=/g,
    "Column rename is columnMenu({ onRename }). The table prop is reported and left in place.",
  ],
  [
    /\[(?:onCellCut|rowVersion|editConflictPolicy|onEditConflict|editActivation)\]/g,
    "Editing and grid options belong on editing() and cellNavigation(). The table binding is reported and left in place, because the host owns the callback.",
  ],
];

function isAdaptTableElement(name: string): boolean {
  if (name === "DataTable" || name === "AdaptDataTable") return true;
  return /^adapt(?:-[a-z0-9]+)*-table$/i.test(name);
}

function tagEnd(source: string, start: number): number {
  let quote = "";
  for (let index = start; index < source.length; index += 1) {
    const current = source[index];
    if (quote) {
      if (current === "\\") {
        index += 1;
        continue;
      }
      if (current === quote) quote = "";
      continue;
    }
    if (current === "'" || current === '"' || current === "`") {
      quote = current;
      continue;
    }
    if (current === ">") return index + 1;
  }
  return source.length;
}

/** Report removed bindings on an AdaptTable element, not on another component. */
export function reportTableBindings(
  source: string,
  issues: MigrationIssue[]
): void {
  let index = 0;
  while (index < source.length) {
    const open =
      source[index] === "<" &&
      source[index + 1] !== "/" &&
      source[index + 1] !== "!";
    const name = open
      ? /^<([A-Za-z][\w.-]*)/.exec(source.slice(index))?.[1]
      : undefined;
    if (!name) {
      index += 1;
      continue;
    }
    const end = tagEnd(source, index);
    if (isAdaptTableElement(name)) {
      const tag = source.slice(index, end);
      for (const [pattern, message] of TABLE_BINDINGS) {
        for (const match of tag.matchAll(pattern)) {
          issues.push(issueAt(source, index + (match.index ?? 0), message));
        }
      }
    }
    index = Math.max(end, index + 1);
  }
}

/**
 * Rewrite one script block and keep diagnostics on the surrounding file.
 */
function migrateBlock(
  source: string,
  block: string,
  blockStart: number
): MigrationResult {
  const result = migrateV4Source(block);
  const lineOffset = source.slice(0, blockStart).split("\n").length - 1;
  return {
    ...result,
    issues: result.issues.map((issue) => ({
      ...issue,
      line: issue.line + lineOffset,
    })),
  };
}

/**
 * Vue SFCs: rewrite imports in script blocks, and report table bindings in
 * the template. Angular templates report bindings and are not rewritten.
 */
export function migrateV4File(
  source: string,
  filename: string
): MigrationResult {
  if (filename.endsWith(".html")) {
    const issues: MigrationIssue[] = [];
    reportTableBindings(source, issues);
    return { code: source, changed: false, movedImports: 0, issues };
  }
  if (!filename.endsWith(".vue")) return migrateV4Source(source);
  const issues: MigrationIssue[] = [];
  reportTableBindings(source, issues);
  let code = "";
  let cursor = 0;
  let movedImports = 0;
  const scripts = source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g);
  for (const match of scripts) {
    const body = match[1] ?? "";
    const bodyStart = (match.index ?? 0) + match[0].indexOf(body);
    code += source.slice(cursor, bodyStart);
    const rewritten = migrateBlock(source, body, bodyStart);
    code += rewritten.code;
    cursor = bodyStart + body.length;
    movedImports += rewritten.movedImports;
    for (const issue of rewritten.issues) {
      if (
        !issues.some(
          (existing) =>
            existing.line === issue.line && existing.message === issue.message
        )
      ) {
        issues.push(issue);
      }
    }
  }
  code += source.slice(cursor);
  return {
    code,
    changed: code !== source,
    movedImports,
    issues,
  };
}

export function migrateV4Source(source: string): MigrationResult {
  const issues: MigrationIssue[] = [];
  reportTableBindings(source, issues);
  reportPatterns(source, MANUAL, issues);
  const rewritten = rewriteImports(source, V4_MOVES);
  issues.push(...rewritten.issues);
  return {
    code: rewritten.code,
    changed: rewritten.code !== source,
    movedImports: rewritten.movedImports,
    issues,
  };
}
