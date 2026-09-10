/**
 * One source location that the v3 migration cannot rewrite safely.
 *
 * @public
 */
export interface V3MigrationIssue {
  /** One-based source line. */
  line: number;
  /** One-based source column. */
  column: number;
  /** Why the source needs a person to choose its replacement. */
  message: string;
}

/**
 * Result of applying the safe v3 source transforms.
 *
 * @public
 */
export interface V3MigrationResult {
  /** Rewritten source, or the original source when nothing was safe to change. */
  code: string;
  /** Whether `code` differs from the input. */
  changed: boolean;
  /** Number of named imports moved to `@adapttable/react/adapter`. */
  movedImports: number;
  /** Ambiguous v2 usages left untouched. */
  issues: readonly V3MigrationIssue[];
}

/**
 * Where each moved export now lives, keyed by the specifier a v2 source
 * imported it from. Generated from the repository's v3 package-split map, so
 * the codemod and the published contract cannot drift apart.
 */
const MOVED_EXPORTS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "@adapttable/core": {
    BaseDataTableProps: "@adapttable/react",
    BodyCell: "@adapttable/react/adapter",
    COLUMN_GROUP_ID_SEP: "@adapttable/react/adapter",
    COLUMN_GROUP_RENDER_PREFIX: "@adapttable/react/adapter",
    COLUMN_GROUP_STUB_PREFIX: "@adapttable/react/adapter",
    COLUMN_GROUP_STUB_WIDTH: "@adapttable/react/adapter",
    CellElementProps: "@adapttable/react",
    ChromeBodyData: "@adapttable/react",
    ColumnDef: "@adapttable/react",
    ColumnReorderKeyProps: "@adapttable/react",
    EXTRA_OVER_SPAN_ROW_STYLE: "@adapttable/react/adapter",
    EXTRA_OVER_SPAN_STYLE: "@adapttable/react/adapter",
    EXTRA_ROW_PARTS: "@adapttable/react/adapter",
    EditableCellActivateControlProps: "@adapttable/react",
    EditableCellActivateProps: "@adapttable/react/adapter",
    EditableCellButtonProps: "@adapttable/react/adapter",
    EditableCellControls: "@adapttable/react",
    EditableCellGate: "@adapttable/react",
    EditableCellGateProps: "@adapttable/react",
    EditableCellSlots: "@adapttable/react/adapter",
    ExtraEntry: "@adapttable/react/adapter",
    FeatureProps: "@adapttable/react",
    FeatureProviderContribution: "@adapttable/react",
    FeatureProviderProps: "@adapttable/react",
    FeatureRender: "@adapttable/react",
    FilterHeaderClassNames: "@adapttable/react/adapter",
    FilterHeaderRowProps: "@adapttable/react/adapter",
    FullscreenState: "@adapttable/react/adapter",
    HeaderFilterOpenProvider: "@adapttable/react",
    HeaderGroupCell: "@adapttable/react/adapter",
    HtmlGroupedHeaderCell: "@adapttable/react/adapter",
    MultiSelectEditorCheckboxProps: "@adapttable/react",
    MultiSelectEditorChrome: "@adapttable/react",
    MultiSelectEditorChromeProps: "@adapttable/react",
    MultiSelectEditorSlots: "@adapttable/react",
    NestedTable: "@adapttable/react",
    PINNED_BOTTOM_PART: "@adapttable/react/adapter",
    PINNED_TOP_PART: "@adapttable/react/adapter",
    REORDER_COLUMN_WIDTH: "@adapttable/react/adapter",
    ROW_DND_MIME: "@adapttable/react/adapter",
    RowReorderState: "@adapttable/react/adapter",
    SidePanelEntry: "@adapttable/react",
    TableChrome: "@adapttable/react",
    TableRowReorderState: "@adapttable/react",
    ToolbarSlots: "@adapttable/react",
    UseDataTableResult: "@adapttable/react",
    UseScrollToTableTopOptions: "@adapttable/react",
    UseTableDataOptions: "@adapttable/react",
    applyCollapsedColumnGroups: "@adapttable/react/adapter",
    bodyCellsHaveRowSpan: "@adapttable/react/adapter",
    cellSpanMark: "@adapttable/react/adapter",
    cellsForRow: "@adapttable/react/adapter",
    columnGroupHeaderCaption: "@adapttable/react/adapter",
    columnGroupId: "@adapttable/react/adapter",
    columnGroupPath: "@adapttable/react/adapter",
    columnGroupStubStyle: "@adapttable/react/adapter",
    columnMenuActions: "@adapttable/react/adapter",
    extraCountBeforeRowIds: "@adapttable/react/adapter",
    extraCoveredTableSlots: "@adapttable/react/adapter",
    extraHostFillStyle: "@adapttable/react/adapter",
    extraRowsForSection: "@adapttable/react/adapter",
    extraUncoveredColSpans: "@adapttable/react/adapter",
    filterColumnMenuRows: "@adapttable/react/adapter",
    flattenColumnTree: "@adapttable/react/adapter",
    groupedHeaderAlign: "@adapttable/react/adapter",
    groupedHeaderCellStyle: "@adapttable/react/adapter",
    groupedHeaderChildRule: "@adapttable/react/adapter",
    groupedHeaderLabelStyle: "@adapttable/react/adapter",
    headerFilterStickTop: "@adapttable/react",
    headerGroupRow: "@adapttable/react/adapter",
    headerGroupRows: "@adapttable/react/adapter",
    hideAllColumns: "@adapttable/react/adapter",
    htmlGroupedHeaderPlan: "@adapttable/react/adapter",
    inflateBodyCellRowSpans: "@adapttable/react/adapter",
    insertExtraRows: "@adapttable/react/adapter",
    insertExtrasBeforeRows: "@adapttable/react/adapter",
    isColumnGroupRenderKey: "@adapttable/react/adapter",
    isColumnGroupStubKey: "@adapttable/react/adapter",
    isColumnGroupSummaryKey: "@adapttable/react/adapter",
    isDeclarativeFilters: "@adapttable/react",
    isExtraEntry: "@adapttable/react/adapter",
    orderedCardEntries: "@adapttable/react/adapter",
    pinnedRowCellStyle: "@adapttable/react/adapter",
    pinnedRowPart: "@adapttable/react/adapter",
    pinnedRowSticky: "@adapttable/react/adapter",
    pinnedRowStickyStyle: "@adapttable/react/adapter",
    resetColumnLayout: "@adapttable/react/adapter",
    resolveColumnFooter: "@adapttable/react",
    resolveColumnHeader: "@adapttable/react",
    resolveRowHeight: "@adapttable/react/adapter",
    resolveRowStyle: "@adapttable/react/adapter",
    rowPinSignature: "@adapttable/react/adapter",
    rowReorderDropStyle: "@adapttable/react/adapter",
    rowReorderSignature: "@adapttable/react/adapter",
    rowSourceIndex: "@adapttable/react/adapter",
    rowSpanSignature: "@adapttable/react/adapter",
    rowStyleSignature: "@adapttable/react/adapter",
    showAllColumns: "@adapttable/react/adapter",
    toggleCollapsedColumnGroup: "@adapttable/react/adapter",
    unpinAllColumns: "@adapttable/react/adapter",
    useActiveFilterChips: "@adapttable/react",
    useBatchEditing: "@adapttable/react",
    useBooleanFilterWidget: "@adapttable/react",
    useBulkActionRunner: "@adapttable/react",
    useCellEditing: "@adapttable/react",
    useCellSaveState: "@adapttable/react",
    useChecklistFilter: "@adapttable/react",
    useChromeScrollReset: "@adapttable/react",
    useColorScheme: "@adapttable/react",
    useColumnDragState: "@adapttable/react",
    useColumnLayout: "@adapttable/react",
    useColumnLayoutStorageState: "@adapttable/react",
    useColumnLayoutUrlState: "@adapttable/react",
    useDataTable: "@adapttable/react",
    useDebounce: "@adapttable/react",
    useDensityUrlState: "@adapttable/react",
    useDirtyCells: "@adapttable/react",
    useEditConflict: "@adapttable/react",
    useEditHistory: "@adapttable/react",
    useExtraChips: "@adapttable/react",
    useFilterOptions: "@adapttable/react",
    useFilterTreeChips: "@adapttable/react",
    useFilterTriggerToggle: "@adapttable/react",
    useFindFocus: "@adapttable/react",
    useFindInTable: "@adapttable/react",
    useFrontendData: "@adapttable/react",
    useFullscreen: "@adapttable/react/adapter",
    useGridFocus: "@adapttable/react",
    useGroupCollapse: "@adapttable/react",
    useGroupCollapseUrlState: "@adapttable/react",
    useGroupPaging: "@adapttable/react",
    useHeaderFilterOverlay: "@adapttable/react",
    useHighlight: "@adapttable/react",
    useHorizontalOverflow: "@adapttable/react",
    useInfiniteScroll: "@adapttable/react",
    useIsMobile: "@adapttable/react",
    useLazyChildren: "@adapttable/react",
    useMediaQuery: "@adapttable/react",
    useOffsetHeight: "@adapttable/react/adapter",
    usePlainChromeBodyData: "@adapttable/react",
    usePointerDismiss: "@adapttable/react",
    usePrefersReducedMotion: "@adapttable/react",
    useQuerySource: "@adapttable/react",
    useRangeFilterWidget: "@adapttable/react",
    useRowEditing: "@adapttable/react",
    useRowExpansion: "@adapttable/react",
    useRowMutations: "@adapttable/react",
    useRowPinning: "@adapttable/react",
    useRowPinningUrlState: "@adapttable/react",
    useRowReorder: "@adapttable/react",
    useSavedViews: "@adapttable/react",
    useScrollToTableTop: "@adapttable/react",
    useSearchInput: "@adapttable/react",
    useSelection: "@adapttable/react",
    useServerData: "@adapttable/react",
    useShortcuts: "@adapttable/react",
    useTableChrome: "@adapttable/react",
    useTableData: "@adapttable/react",
    useTableEditHistory: "@adapttable/react",
    useTableUrlState: "@adapttable/react",
    useTableVirtualization: "@adapttable/react",
    useTextFilterWidget: "@adapttable/react",
    useTreeExpansion: "@adapttable/react",
    useVirtualChromeBodyData: "@adapttable/react",
  },
  "@adapttable/core/formula": {
    ColumnDef: "@adapttable/react/formula",
    ColumnFooterContext: "@adapttable/react/formula",
    ColumnHeaderController: "@adapttable/react/formula",
    CustomCellEditorRender: "@adapttable/react/formula",
    useFormulaUrlState: "@adapttable/react/formula",
  },
  "@adapttable/core/pdf": {
    ColumnDef: "@adapttable/react/pdf",
    ColumnFooterContext: "@adapttable/react/pdf",
    ColumnHeaderController: "@adapttable/react/pdf",
    CustomCellEditorRender: "@adapttable/react/pdf",
  },
  "@adapttable/core/pivot": {
    Aggregator: "@adapttable/react/pivot",
    ColumnDef: "@adapttable/react/pivot",
    ColumnFooterContext: "@adapttable/react/pivot",
    ColumnHeaderController: "@adapttable/react/pivot",
    CustomCellEditorRender: "@adapttable/react/pivot",
    PivotOptions: "@adapttable/react/pivot",
    PivotRow: "@adapttable/react/pivot",
    PivotTableModel: "@adapttable/react/pivot",
    PivotTableModelOptions: "@adapttable/react/pivot",
    ServerPivotOptions: "@adapttable/react/pivot",
    usePivotUrlState: "@adapttable/react/pivot",
  },
  "@adapttable/core/query": {
    Aggregator: "@adapttable/react/query",
  },
  "@adapttable/core/stream": {
    useChangedCellFlash: "@adapttable/react/stream",
    useRowPatchStream: "@adapttable/react/stream",
  },
  "@adapttable/core/xlsx": {
    ColumnDef: "@adapttable/react/xlsx",
    ColumnFooterContext: "@adapttable/react/xlsx",
    ColumnHeaderController: "@adapttable/react/xlsx",
    CustomCellEditorRender: "@adapttable/react/xlsx",
  },
};

/**
 * Core subpaths that moved wholesale. Every export went with them, so the
 * specifier is rewritten and the named list is untouched.
 */
const REDIRECTED_SPECIFIERS: Readonly<Record<string, string>> = {
  "@adapttable/core/adapter": "@adapttable/react/adapter",
  "@adapttable/core/features": "@adapttable/react/features",
  "@adapttable/core/sparkline": "@adapttable/react/sparkline",
  "@adapttable/ai/react": "@adapttable/ai-react",
  "@adapttable/ai/assistant": "@adapttable/ai-react",
};

const REMOVED_DATA_TABLE_PROPS = [
  "pinnedRowIds",
  "onPinnedRowIdsChange",
  "getCellSpan",
  "cellSpanAppearance",
  "extraRows",
  "rowStyle",
  "rowHeight",
  "rowClassName",
  "renderRowDetail",
  "defaultExpandedRowIds",
  "nestedTable",
  "onCellEdit",
  "rowEditing",
  "onRowEdit",
  "batchEditing",
  "onBatchEdit",
  "editHistory",
  "dirtyIndicators",
  "getChildren",
  "getParentId",
  "treeColumn",
  "onLoadChildren",
  "groupBy",
  "virtualize",
  "virtualizeColumns",
  "enableColumnMenu",
  "resizableColumns",
  "collapsibleColumnGroups",
  "exportCsv",
  "cellNavigation",
  "findInTable",
  "fullscreen",
  "commandPalette",
  "contextMenu",
  "sidePanel",
  "bulkActions",
  "filters",
  "filterTypes",
  "headerFilters",
  "savedViews",
  "selectionStats",
  "densityChooser",
  "onPrint",
  "printButton",
  "statusBar",
  "undoRedoButtons",
  "multiSort",
  "fitColumns",
  "columnSelectionCheckbox",
  "onAddRow",
  "onDuplicateRow",
  "onDeleteRow",
  "confirmDeleteRow",
  "rowActions",
] as const;

const ADAPTTABLE_IMPORT =
  /(import|export)\s+(type\s+)?\{([^{}]*)\}\s+from\s+(["'])(@adapttable\/[a-z0-9/-]+)\4[ \t]*;?/g;
const IMPORT_SPECIFIER =
  /^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+[A-Za-z_$][\w$]*)?$/;

function locationAt(
  source: string,
  index: number
): Pick<V3MigrationIssue, "line" | "column"> {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n");
  return { line, column: index - lineStart };
}

function issueAt(
  source: string,
  index: number,
  message: string
): V3MigrationIssue {
  return { ...locationAt(source, index), message };
}

function formatImport(
  keyword: string,
  typeOnly: boolean,
  specifiers: readonly string[],
  quote: string,
  source: string
): string {
  return `${keyword}${typeOnly ? " type" : ""} { ${specifiers.join(
    ", "
  )} } from ${quote}${source}${quote};`;
}

function rewriteCoreImports(source: string): {
  code: string;
  movedImports: number;
  issues: V3MigrationIssue[];
} {
  let code = "";
  let cursor = 0;
  let movedImports = 0;
  const issues: V3MigrationIssue[] = [];

  for (const match of source.matchAll(ADAPTTABLE_IMPORT)) {
    const index = match.index;
    const [
      declaration,
      keyword = "import",
      typeKeyword = "",
      body = "",
      quote = '"',
      from = "",
    ] = match;
    code += source.slice(cursor, index);
    cursor = index + declaration.length;

    const redirect = REDIRECTED_SPECIFIERS[from];
    const routes = MOVED_EXPORTS[from];
    if (!redirect && !routes) {
      code += declaration;
      continue;
    }

    const specifiers = body
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const parsed = specifiers.map((specifier) =>
      IMPORT_SPECIFIER.exec(specifier)
    );
    if (specifiers.length === 0 || parsed.includes(null)) {
      code += declaration;
      issues.push(
        issueAt(
          source,
          index,
          `Complex ${from} import left unchanged; split or comment-preserving migration requires review.`
        )
      );
      continue;
    }

    const typeOnly = typeKeyword.length > 0;
    if (redirect) {
      // The whole subpath moved, so the names are untouched and only the
      // specifier changes.
      code += formatImport(keyword, typeOnly, specifiers, quote, redirect);
      movedImports += specifiers.length;
      continue;
    }

    // Group by destination so a mixed import becomes one declaration per
    // package it now spans, in a stable order.
    const kept: string[] = [];
    const byDestination = new Map<string, string[]>();
    specifiers.forEach((specifier, specifierIndex) => {
      const importedName = parsed[specifierIndex]?.[1] ?? "";
      const destination = routes?.[importedName];
      if (destination === undefined) {
        kept.push(specifier);
        return;
      }
      const bucket = byDestination.get(destination) ?? [];
      bucket.push(specifier);
      byDestination.set(destination, bucket);
    });

    if (byDestination.size === 0) {
      code += declaration;
      continue;
    }

    const declarations: string[] = [];
    if (kept.length > 0) {
      declarations.push(formatImport(keyword, typeOnly, kept, quote, from));
    }
    const destinations = [...byDestination.keys()].sort((left, right) =>
      left.localeCompare(right)
    );
    for (const destination of destinations) {
      const names = byDestination.get(destination) ?? [];
      declarations.push(
        formatImport(keyword, typeOnly, names, quote, destination)
      );
      movedImports += names.length;
    }
    code += declarations.join("\n");
  }

  code += source.slice(cursor);
  return { code, movedImports, issues };
}

/** Next index after a quoted JSX attribute, or -1 when the quote never closes. */
function skipQuoted(source: string, from: number, quote: string): number {
  let i = from + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\" && quote !== "`") {
      i += 2;
      continue;
    }
    if (ch === quote) return i + 1;
    i += 1;
  }
  return -1;
}

/**
 * Index of the `>` that ends an opening JSX tag, counting `{…}` so a `>`
 * inside `rowKey={(row) => row.id}` is not treated as the tag closer.
 */
function openingTagEnd(source: string, afterName: number): number {
  let i = afterName;
  let depth = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipQuoted(source, i, ch);
      if (i < 0) return -1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === ">" && depth === 0) return i;
    i += 1;
  }
  return -1;
}

/**
 * Opening `<DataTable …>` / `<DataTable …/>` spans, including props whose
 * values contain `=>` or nested `>`.
 */
function eachDataTableOpeningTag(
  source: string,
  visit: (text: string, index: number) => void
): void {
  const start = /<(?:[A-Za-z_$][\w$]*\.)*DataTable\b/g;
  for (const match of source.matchAll(start)) {
    const from = match.index;
    const end = openingTagEnd(source, from + match[0].length);
    if (end >= 0) visit(source.slice(from, end + 1), from);
  }
}

function reportAmbiguousUsages(
  source: string,
  issues: V3MigrationIssue[]
): void {
  eachDataTableOpeningTag(source, (text, tagIndex) => {
    for (const prop of REMOVED_DATA_TABLE_PROPS) {
      const propMatch = new RegExp(
        String.raw`(?:^|\s)(${prop})(?=\s*(?:=|\s|/?>))`
      ).exec(text);
      if (!propMatch) continue;
      const propOffset = propMatch.index + propMatch[0].indexOf(prop);
      issues.push(
        issueAt(
          source,
          tagIndex + propOffset,
          `DataTable.${prop} needs a feature-factory migration; left unchanged.`
        )
      );
    }
  });

  const ambiguousPatterns: readonly [RegExp, string][] = [
    [
      /\bFilterTypeRegistry\.(?:register|extend)\b/g,
      "FilterTypeRegistry registration needs a TableFeatureHost migration; left unchanged.",
    ],
    [
      /\buseChromeBodyData\b/g,
      "useChromeBodyData must be replaced with the plain or virtual hook explicitly; left unchanged.",
    ],
    [
      /<(?:[A-Za-z_$][\w$]*\.)*DataTable\b[^>]*\bsize\s*=/g,
      "MUI DataTable.size needs an explicit density mapping; left unchanged.",
    ],
  ];

  for (const [pattern, message] of ambiguousPatterns) {
    for (const match of source.matchAll(pattern)) {
      issues.push(issueAt(source, match.index, message));
    }
  }
}

/**
 * Apply only v3 migrations that preserve meaning mechanically.
 *
 * Named adapter-contract imports move from `@adapttable/core` to
 * `@adapttable/react/adapter`. Enabling props and behavior-dependent APIs are
 * reported for manual migration and left byte-for-byte unchanged.
 *
 * @public
 */
export function migrateV3Source(source: string): V3MigrationResult {
  const rewritten = rewriteCoreImports(source);
  reportAmbiguousUsages(rewritten.code, rewritten.issues);
  return {
    code: rewritten.code,
    changed: rewritten.code !== source,
    movedImports: rewritten.movedImports,
    issues: rewritten.issues,
  };
}
