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
  /** Number of named imports moved to `@adapttable/core/adapter`. */
  movedImports: number;
  /** Ambiguous v2 usages left untouched. */
  issues: readonly V3MigrationIssue[];
}

const MOVED_CORE_EXPORTS = new Set([
  "COLUMN_GROUP_ID_SEP",
  "COLUMN_GROUP_RENDER_PREFIX",
  "COLUMN_GROUP_STUB_PREFIX",
  "COLUMN_GROUP_STUB_WIDTH",
  "columnGroupHeaderCaption",
  "columnGroupId",
  "columnGroupPath",
  "columnGroupStubStyle",
  "groupedHeaderAlign",
  "groupedHeaderCellStyle",
  "groupedHeaderChildRule",
  "groupedHeaderLabelStyle",
  "HeaderGroupCell",
  "headerGroupRow",
  "headerGroupRows",
  "HtmlGroupedHeaderCell",
  "htmlGroupedHeaderPlan",
  "isColumnGroupRenderKey",
  "isColumnGroupStubKey",
  "isColumnGroupSummaryKey",
  "toggleCollapsedColumnGroup",
  "EXTRA_OVER_SPAN_ROW_STYLE",
  "EXTRA_OVER_SPAN_STYLE",
  "EXTRA_ROW_PARTS",
  "extraCountBeforeRowIds",
  "extraCoveredTableSlots",
  "ExtraEntry",
  "extraHostFillStyle",
  "extraRowsForSection",
  "extraUncoveredColSpans",
  "inflateBodyCellRowSpans",
  "insertExtraRows",
  "insertExtrasBeforeRows",
  "isExtraEntry",
  "orderedCardEntries",
  "PINNED_BOTTOM_PART",
  "PINNED_TOP_PART",
  "pinnedRowCellStyle",
  "pinnedRowPart",
  "pinnedRowSticky",
  "pinnedRowStickyStyle",
  "useOffsetHeight",
  "columnMenuActions",
  "filterColumnMenuRows",
  "hideAllColumns",
  "resetColumnLayout",
  "showAllColumns",
  "unpinAllColumns",
  "BodyCell",
  "bodyCellsHaveRowSpan",
  "cellsForRow",
  "cellSpanMark",
  "rowSpanSignature",
  "REORDER_COLUMN_WIDTH",
  "ROW_DND_MIME",
  "rowReorderDropStyle",
  "rowReorderSignature",
  "RowReorderState",
  "resolveRowHeight",
  "resolveRowStyle",
  "rowStyleSignature",
  "EditableCellActivateProps",
  "EditableCellButtonProps",
  "EditableCellSlots",
  "FilterHeaderClassNames",
  "FilterHeaderRowProps",
  "applyCollapsedColumnGroups",
  "flattenColumnTree",
  "FullscreenState",
  "useFullscreen",
  "rowPinSignature",
  "rowSourceIndex",
]);

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

const CORE_IMPORT =
  /import\s+(type\s+)?\{([^{}]*)\}\s+from\s+(["'])@adapttable\/core\3[ \t]*;?/g;
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
  typeOnly: boolean,
  specifiers: readonly string[],
  quote: string,
  source: string
): string {
  return `import${typeOnly ? " type" : ""} { ${specifiers.join(
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

  for (const match of source.matchAll(CORE_IMPORT)) {
    const index = match.index;
    const [declaration, typeKeyword = "", body = "", quote = '"'] = match;
    const specifiers = body
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const parsed = specifiers.map((specifier) =>
      IMPORT_SPECIFIER.exec(specifier)
    );

    code += source.slice(cursor, index);
    cursor = index + declaration.length;

    if (specifiers.length === 0 || parsed.includes(null)) {
      code += declaration;
      issues.push(
        issueAt(
          source,
          index,
          "Complex @adapttable/core import left unchanged; split or comment-preserving migration requires review."
        )
      );
      continue;
    }

    const moved: string[] = [];
    const kept: string[] = [];
    specifiers.forEach((specifier, specifierIndex) => {
      const importedName = parsed[specifierIndex]?.[1];
      if (importedName && MOVED_CORE_EXPORTS.has(importedName)) {
        moved.push(specifier);
      } else {
        kept.push(specifier);
      }
    });

    if (moved.length === 0) {
      code += declaration;
      continue;
    }

    const typeOnly = typeKeyword.length > 0;
    const declarations: string[] = [];
    if (kept.length > 0) {
      declarations.push(
        formatImport(typeOnly, kept, quote, "@adapttable/core")
      );
    }
    declarations.push(
      formatImport(typeOnly, moved, quote, "@adapttable/core/adapter")
    );
    code += declarations.join("\n");
    movedImports += moved.length;
  }

  code += source.slice(cursor);
  return { code, movedImports, issues };
}

/**
 * Opening `<DataTable …>` / `<DataTable …/>` spans, including props whose
 * values contain `=>` or nested `>`. A naive `[\s\S]*?>` stops at the first
 * `>` inside `rowKey={(row) => row.id}` and misses every enabling prop after
 * it.
 */
function eachDataTableOpeningTag(
  source: string,
  visit: (text: string, index: number) => void
): void {
  const start = /<(?:[A-Za-z_$][\w$]*\.)*DataTable\b/g;
  for (const match of source.matchAll(start)) {
    const from = match.index;
    let i = from + match[0].length;
    let depth = 0;
    let quote: string | null = null;
    while (i < source.length) {
      const ch = source[i];
      if (quote) {
        if (ch === "\\" && quote !== "`") {
          i += 2;
          continue;
        }
        if (ch === quote) quote = null;
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        i += 1;
        continue;
      }
      if (ch === "{") {
        depth += 1;
        i += 1;
        continue;
      }
      if (ch === "}") {
        depth = Math.max(0, depth - 1);
        i += 1;
        continue;
      }
      if (ch === ">" && depth === 0) {
        visit(source.slice(from, i + 1), from);
        break;
      }
      i += 1;
    }
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
 * `@adapttable/core/adapter`. Enabling props and behavior-dependent APIs are
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
