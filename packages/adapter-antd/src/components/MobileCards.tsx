import {
  bodyRowEntries,
  type ConfirmHandler,
  type GroupedFlatEntry,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  type TableLabels,
  treeCardStyle,
  type TreeEntry,
} from "@adapttable/core";
import {
  type ColumnDef,
  type EditableCellEditing,
  type ReactMobileCardRenderer,
  type RowExpansionState,
  type UseDataTableResult,
} from "@adapttable/react";
import {
  cellFlashAttr,
  EXTRA_ROW_PARTS,
  type ExtraRow,
  insertExtraRows,
  isExtraEntry,
  orderedCardEntries,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  pinnedSummarySideFromId,
  resolveMobileLabel,
  resolveRowEditTrigger,
  resolveRowStyle,
  rowClickProps,
  rowEditingSignature,
  rowFlashSignature,
  rowIsDirty,
  rowReorderSignature,
  type RowReorderState,
  type RowStyle,
  rowStyleSignature,
  useSummaryCells,
  type VirtualTableRow,
} from "@adapttable/react/adapter";
import { Card, Checkbox, Descriptions, Space } from "antd";
import { type CSSProperties, memo, type ReactNode, useMemo } from "react";

import {
  OptionalEditableCell,
  OptionalExpandToggle,
  OptionalGroupHeaderCard,
  OptionalRowEditActions,
  OptionalRowReorderButtons,
  OptionalTreeToggle,
} from "./featureSlots";
import { ADAPTTABLE_GROUP, type AdaptTableGroupRow } from "./grouping";
import { RowActionButtons } from "./RowActionButtons";

/**
 * The mobile counterpart of the desktop footer summary: one trailing card
 * listing label → summary value for every visible column the `summaryRow`
 * result covers (absent keys render nothing — empty cells are table
 * alignment noise, not card content).
 */
function SummaryCard<TRow>({
  rows,
  columns,
  summaryRow,
}: Readonly<{
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  summaryRow: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
}>) {
  const cells = useSummaryCells(summaryRow, rows) ?? {};
  return (
    <Card size="small" data-adapttable-part="summary-card">
      <Descriptions column={1} size="small" colon={false}>
        {columns
          .filter((column) => cells[column.key] !== undefined)
          .map((column) => (
            <Descriptions.Item
              key={column.key}
              label={resolveMobileLabel(column)}
            >
              {cells[column.key]}
            </Descriptions.Item>
          ))}
      </Descriptions>
    </Card>
  );
}

/** Per-card inputs for the memoized {@link CardItemBase}. */
interface CardItemProps<TRow> {
  /** Replace the card's body — see `BaseDataTableProps.renderCard`. */
  renderCard?: ReactMobileCardRenderer<TRow>;
  /** This card's place in the tree, when the table is one. */
  treeEntry?: TreeEntry<TRow>;
  /** Open or close this node. */
  onToggleTree?: (id: string) => void;
  row: TRow;
  rowIndex: number;
  /** Stable row id (selection / expansion key). */
  id: string;
  columns: readonly ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  confirm: ConfirmHandler;
  rowActions?: readonly RowAction<TRow>[];
  rowActionsLayout?: RowActionsLayout;
  renderRowActions?: RowActionsRenderer<TRow>;
  /** Resolved `rowClassName(row, index)`, compared as a plain string. */
  className?: string;
  /** Resolved `rowStyle` + `rowHeight`. Compared via `styleSignature`. */
  style?: CSSProperties;
  styleSignature: string;
  /**
   * Flashing column keys for this card, joined. Compared instead of
   * `isCellFlashing`, which stays referentially stable while the marks move.
   */
  flashSignature: string;
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  selected: boolean;
  expanded: boolean;
  /** Selection toggle — present only when selection is enabled. */
  onToggleSelect?: (id: string) => void;
  /** Expansion toggle — present only when `renderRowDetail` is set. */
  onToggleExpand?: (id: string) => void;
  /** Detail-panel renderer — see `BaseDataTableProps.renderRowDetail`. */
  renderDetail?: (row: TRow) => ReactNode;
  /** Row activation handler — see `BaseDataTableProps.onRowClick`. */
  onRowClick?: (row: TRow) => void;
  prefetch?: (row: TRow) => void;
  /**
   * Opt-in editing bundle — uncompared. Its identity changes on every
   * keystroke anywhere in the table (it wraps the shared editing state), so
   * comparing it would re-render every card on each character typed. The
   * per-row visual churn is fingerprinted by `editingSignature` instead. A
   * held card keeps an older bundle, which is safe: the state's handlers read
   * their values through refs, so they always act on the current draft.
   */
  editing?: EditableCellEditing<TRow>;
  /** Page rows for Tab advance — uncompared (see `editing`). */
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  /** Memo digest from {@link rowEditingSignature}. */
  editingSignature: string | null;
  /** Headless reorder; uncompared — visual churn is `reorderSignature`. */
  rowReorder: RowReorderState<TRow> | undefined;
  windowStart: number;
  rowCount: number;
  reorderSignature: string | null;
}

/**
 * `React.memo` comparator: re-render a card only when one of its VISUAL
 * inputs changes. A search keystroke, another card's checkbox, or an edit in
 * a different row re-renders the list shell, but every unchanged card bails
 * out here (column accessors are not re-invoked). The callbacks compared
 * below must stay referentially stable across unrelated renders;
 * `selection.toggle` (whose identity tracks the selection by design) is
 * compared, so a selection change still reaches every card un-stale.
 */
function cardItemPropsEqual<TRow>(
  prev: Readonly<CardItemProps<TRow>>,
  next: Readonly<CardItemProps<TRow>>
): boolean {
  return (
    prev.row === next.row &&
    prev.rowIndex === next.rowIndex &&
    prev.id === next.id &&
    prev.columns === next.columns &&
    prev.labels === next.labels &&
    prev.confirm === next.confirm &&
    prev.rowActions === next.rowActions &&
    prev.rowActionsLayout === next.rowActionsLayout &&
    prev.renderRowActions === next.renderRowActions &&
    prev.className === next.className &&
    prev.styleSignature === next.styleSignature &&
    prev.flashSignature === next.flashSignature &&
    prev.selected === next.selected &&
    prev.expanded === next.expanded &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onToggleExpand === next.onToggleExpand &&
    prev.renderDetail === next.renderDetail &&
    prev.onRowClick === next.onRowClick &&
    prev.prefetch === next.prefetch &&
    prev.editingSignature === next.editingSignature &&
    prev.reorderSignature === next.reorderSignature &&
    prev.windowStart === next.windowStart &&
    prev.rowCount === next.rowCount &&
    prev.renderCard === next.renderCard &&
    // Or a folder opens and its own chevron never turns.
    prev.treeEntry === next.treeEntry
  );
}

/** One card. Memoized by {@link cardItemPropsEqual} at the call site. */
function CardItemBase<TRow>(props: Readonly<CardItemProps<TRow>>) {
  const {
    row,
    rowIndex,
    id,
    columns,
    labels,
    confirm,
    rowActions,
    rowActionsLayout,
    renderRowActions,
    className,
    style,
    isCellFlashing,
    selected,
    expanded,
    onToggleSelect,
    onToggleExpand,
    renderDetail,
    onRowClick,
    prefetch,
    editing,
    rows,
    getRowId,
    treeEntry,
    onToggleTree,
    rowReorder,
    windowStart,
    rowCount,
    renderCard,
  } = props;
  const rowEdit = resolveRowEditTrigger(
    rowActions,
    editing?.rowEditing,
    row,
    id
  );
  const actions = rowEdit.actions.length > 0 ? rowEdit.actions : null;
  // Built once and used by both paths, so a custom card shows the very same
  // value node the built-in would have — cell renderers and editors included.
  const fields = columns.map((column) => ({
    column,
    label: resolveMobileLabel(column),
    value: (
      <OptionalEditableCell
        // Built inside the map, so it needs its own key: React reads these
        // as a list even though a card renders them one at a time.
        key={column.key}
        editing={editing}
        row={row}
        column={column}
        rowId={id}
        rowIndex={rowIndex}
        rows={rows}
        columns={columns}
        rowKey={getRowId}
        editLabel={labels.editCell}
        undoLabel={labels.undoEdit}
      />
    ),
  }));
  return (
    <Card
      size="small"
      className={className}
      style={style}
      data-stagger=""
      data-selected={selected ? "" : undefined}
      data-dirty={rowIsDirty(editing, id) ? "" : undefined}
      {...rowClickProps(row, onRowClick, rowIndex)}
      onMouseEnter={prefetch ? () => prefetch(row) : undefined}
      title={
        (treeEntry ?? onToggleSelect) ? (
          <Space size="small">
            {treeEntry && (
              <OptionalTreeToggle
                entry={treeEntry}
                labels={labels}
                onToggle={onToggleTree ?? (() => undefined)}
              />
            )}
            {onToggleSelect && (
              <Checkbox
                checked={selected}
                aria-label={labels.selectRow}
                onChange={() => onToggleSelect(id)}
              />
            )}
          </Space>
        ) : undefined
      }
      extra={
        (onToggleExpand ?? actions ?? editing?.rowEditing) ? (
          <Space size="small">
            {onToggleExpand && (
              <OptionalExpandToggle
                id={id}
                expanded={Boolean(expanded)}
                onToggle={onToggleExpand}
                expandLabel={labels.expandRow}
                collapseLabel={labels.collapseRow}
              />
            )}
            {editing?.rowEditing && (
              <OptionalRowEditActions
                rowEditing={editing.rowEditing}
                row={row}
                rowId={id}
                showBegin={rowEdit.showBegin}
                labels={labels}
              />
            )}
            {actions && (
              <RowActionButtons
                row={row}
                actions={actions}
                confirm={confirm}
                labels={labels}
                layout={rowActionsLayout}
                render={renderRowActions}
              />
            )}
          </Space>
        ) : undefined
      }
    >
      {renderCard ? (
        renderCard(row, { index: rowIndex, fields, selected, expanded })
      ) : (
        // The whole `Descriptions` goes, not just its items: a
        // `Descriptions.Item` only means anything inside one.
        <Descriptions column={1} size="small" colon={false}>
          {fields.map(({ column, label, value }) => (
            <Descriptions.Item key={column.key} label={label}>
              <span
                data-adapttable-part="card-value"
                data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
              >
                {value}
              </span>
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}
      {rowReorder && (
        <OptionalRowReorderButtons
          reorder={rowReorder}
          labels={labels}
          localIndex={rowIndex}
          row={row}
          windowStart={windowStart}
          rowCount={rowCount}
        />
      )}
      {expanded && renderDetail ? (
        <div data-adapttable-part="card-detail" style={{ marginTop: 8 }}>
          {renderDetail(row)}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Mobile layout: one antd `Card` per row with an antd `Descriptions`
 * label/value list, an optional selection checkbox, an optional expandable
 * detail section, and row actions. Shown instead of the table on narrow
 * viewports so columns never get cramped. Each card is memoized on its own
 * inputs, so a toolbar re-render (e.g. a search keystroke) re-renders no
 * unchanged card.
 */
function summaryCardInteractive(
  side: ReturnType<typeof pinnedSummarySideFromId>,
  selection:
    | { isSelected: (id: string) => boolean; toggle: (id: string) => void }
    | null
    | undefined,
  expansion: RowExpansionState | undefined,
  id: string
): {
  selected: boolean;
  expanded: boolean;
  onToggleSelect: ((id: string) => void) | undefined;
  onToggleExpand: ((id: string) => void) | undefined;
} {
  if (side) {
    return {
      selected: false,
      expanded: false,
      onToggleSelect: undefined,
      onToggleExpand: undefined,
    };
  }
  return {
    selected: Boolean(selection?.isSelected(id)),
    expanded: Boolean(expansion?.isExpanded(id)),
    onToggleSelect: selection?.toggle,
    onToggleExpand: expansion?.toggle,
  };
}

/**
 * @typeParam TRow - The row type.
 */
export function MobileCards<TRow>({
  table,
  cardClassName,
  rows,
  rowActions,
  rowActionsLayout,
  renderRowActions,
  confirm,
  getRowId,
  prefetch,
  onRowClick,
  rowClassName,
  isCellFlashing,
  rowStyle,
  rowHeight,
  tableLabel,
  compact = false,
  expansion,
  renderRowDetail,
  summaryRow,
  editing,
  grouping,
  tree,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
  rowReorder,
  windowStart = 0,
  cardSetSize = 0,
  pinnedTopRows = [],
  pinnedBottomRows = [],
  pinnedSummaryTop = [],
  pinnedSummaryBottom = [],
  extraRows,
  renderCard,
  listRef,
  listStyle,
}: Readonly<{
  table: UseDataTableResult<TRow>;
  /** Class applied to every card (merged before `rowClassName`). */
  cardClassName?: string;
  rows: readonly TRow[];
  rowActions?: readonly RowAction<TRow>[];
  rowActionsLayout?: RowActionsLayout;
  renderRowActions?: RowActionsRenderer<TRow>;
  confirm: ConfirmHandler;
  getRowId: (row: TRow) => string;
  prefetch?: (row: TRow) => void;
  /** Row activation handler — see `BaseDataTableProps.onRowClick`. */
  onRowClick?: (row: TRow) => void;
  /** Conditional per-row class — see `BaseDataTableProps.rowClassName`. */
  rowClassName?: (row: TRow, index: number) => string | undefined;
  /**
   * Mark cells a patch just changed — `data-flash` on the card value. Omit
   * and nothing is marked.
   */
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  /** Conditional per-row style — see `BaseDataTableProps.rowStyle`. */
  rowStyle?: RowStyle<TRow>;
  /** Per-row height — see `BaseDataTableProps.rowHeight`. */
  rowHeight?: number | ((row: TRow, index: number) => number);
  tableLabel?: string;
  /** Tighter card rhythm for the `"compact"` density. */
  compact?: boolean;
  /** Row-expansion state — present only when `renderRowDetail` is set. */
  expansion?: RowExpansionState;
  /** Detail-panel renderer — see `BaseDataTableProps.renderRowDetail`. */
  renderRowDetail?: (row: TRow) => ReactNode;
  /** Replace each card's body — see `BaseDataTableProps.renderCard`. */
  renderCard?: ReactMobileCardRenderer<TRow>;
  /** Footer summary builder — see `BaseDataTableProps.summaryRow`. */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
  /** Opt-in editing bundle — omit and cells stay display-only. */
  editing?: EditableCellEditing<TRow>;
  /**
   * Opt-in grouping bundle — when set, cards iterate flat group/leaf entries
   * instead of the leaf-only virtual window.
   */
  /** Hierarchy, when the host declared one. */
  tree?: {
    entries: readonly TreeEntry<TRow>[];
    expansion: { toggle: (id: string) => void };
  };
  grouping?: {
    collapsed: { toggle: (key: string) => void };
    entries: readonly GroupedFlatEntry<TRow>[];
    /** Reveal the next page of groups, or of one group's rows. */
    showMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  };
  /**
   * Windowed entries to render — the virtual slice when virtualization is on,
   * `undefined` to render every source row (the non-windowed default).
   */
  rowEntries?: readonly VirtualTableRow<TRow>[];
  /** Spacer height (px) reserving the rows scrolled off the top. */
  paddingTop?: number;
  /** Spacer height (px) reserving the rows still below the window. */
  paddingBottom?: number;
  /** Card measurement callback for the virtual window. */
  measureElement?: (node: Element | null) => void;
  rowReorder?: RowReorderState<TRow>;
  windowStart?: number;
  /** Rows in the whole dataset, for the cards' `aria-setsize`. */
  cardSetSize?: number;
  pinnedTopRows?: readonly TRow[];
  pinnedBottomRows?: readonly TRow[];
  pinnedSummaryTop?: readonly TRow[];
  pinnedSummaryBottom?: readonly TRow[];
  extraRows?: readonly ExtraRow[];
  /** Attach the virtualizer to this list (window or maxHeight box). */
  listRef?: (node: HTMLElement | null) => void;
  /** Clip style when the host passed `maxHeight`. */
  listStyle?: CSSProperties;
}>) {
  const { labels, selection, columns } = table;
  // Either the virtual slice or every source row, resolved to render entries
  // with their ORIGINAL index (so cells and classes see the true row index).
  // Pinned rows lead / trail the list; cards have no sticky chrome.
  const entries = orderedCardEntries(
    rows,
    getRowId,
    rowEntries,
    pinnedTopRows,
    pinnedBottomRows,
    pinnedSummaryTop,
    pinnedSummaryBottom
  );

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () => memo(CardItemBase<TRow>, cardItemPropsEqual),
    []
  );

  const renderLeafCard = (
    row: TRow,
    index: number,
    key: string,
    treeEntry?: TreeEntry<TRow>
  ) => {
    const side = pinnedSummarySideFromId(key);
    const id = side ? key : getRowId(row);
    const interactive = summaryCardInteractive(side, selection, expansion, id);
    return (
      <li
        key={key}
        ref={measureElement}
        data-index={index}
        // A windowed list has only a slice of its items in the DOM, so each
        // one states where it sits and how many there are; a complete list
        // needs neither, because assistive tech can simply count.
        aria-posinset={
          cardSetSize > rows.length ? windowStart + index + 1 : undefined
        }
        aria-setsize={cardSetSize > rows.length ? cardSetSize : undefined}
        data-adapttable-part={side ? pinnedSummaryPart(side) : "card"}
        aria-label={side ? labels.pinnedSummaryRow : undefined}
        style={{
          ...treeCardStyle(treeEntry?.level ?? 0),
          ...resolveRowStyle(rowStyle, rowHeight, row, index),
        }}
      >
        <CardItem
          row={row}
          rowIndex={index}
          id={id}
          columns={columns}
          labels={labels}
          confirm={confirm}
          rowActions={side ? undefined : rowActions}
          rowActionsLayout={rowActionsLayout}
          renderRowActions={side ? undefined : renderRowActions}
          className={
            [cardClassName, rowClassName?.(row, index)]
              .filter(Boolean)
              .join(" ") || undefined
          }
          style={resolveRowStyle(rowStyle, rowHeight, row, index)}
          styleSignature={rowStyleSignature(
            resolveRowStyle(rowStyle, rowHeight, row, index)
          )}
          flashSignature={rowFlashSignature(isCellFlashing, id, columns)}
          isCellFlashing={isCellFlashing}
          selected={interactive.selected}
          expanded={interactive.expanded}
          onToggleSelect={interactive.onToggleSelect}
          onToggleExpand={interactive.onToggleExpand}
          renderDetail={side ? undefined : renderRowDetail}
          onRowClick={side ? undefined : onRowClick}
          prefetch={prefetch}
          editing={editing}
          rows={rows}
          getRowId={getRowId}
          editingSignature={rowEditingSignature(editing, id)}
          treeEntry={side ? undefined : treeEntry}
          onToggleTree={side ? undefined : tree?.expansion.toggle}
          rowReorder={side ? undefined : rowReorder}
          windowStart={windowStart}
          rowCount={rows.length}
          reorderSignature={rowReorderSignature(rowReorder, id, index)}
          renderCard={side ? undefined : renderCard}
        />
      </li>
    );
  };

  const toGroupRow = (
    entry: Extract<
      GroupedFlatEntry<TRow>,
      { kind: "group" | "groupFooter" | "groupMore" }
    >
  ): AdaptTableGroupRow => ({
    [ADAPTTABLE_GROUP]: true,
    key: entry.key,
    label: entry.label,
    level: entry.level,
    footer: entry.kind === "groupFooter",
    more:
      entry.kind === "groupMore"
        ? {
            scope: entry.scope,
            groupKey: entry.groupKey,
            remaining: entry.remaining,
          }
        : undefined,
    count:
      (entry.kind === "group" ? entry.serverCount : undefined) ??
      entry.leafIds.length,
    leafIds: entry.leafIds,
    aggregateCells:
      entry.kind === "groupMore"
        ? undefined
        : (entry.aggregateCells as Partial<Record<string, ReactNode>>),
    collapsed: entry.kind === "group" && entry.collapsed,
  });

  return (
    <ul
      ref={listRef}
      data-adapttable-part="cards"
      aria-label={tableLabel}
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 4 : 8,
        ...listStyle,
      }}
    >
      {paddingTop > 0 && <li aria-hidden style={{ height: paddingTop }} />}
      {grouping
        ? pinnedSummaryTop.map((row, index) =>
            renderLeafCard(row, index, pinnedSummaryRowId("top", index))
          )
        : null}
      {grouping
        ? grouping.entries.map((entry) => {
            if (isExtraEntry(entry)) {
              return (
                <li
                  key={entry.key}
                  data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].row}
                  role={entry.kind === "separator" ? "separator" : undefined}
                  aria-label={
                    entry.kind === "separator" ? labels.rowSeparator : undefined
                  }
                >
                  <div data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].cell}>
                    {entry.kind === "fullWidth"
                      ? (entry.render?.() as ReactNode)
                      : null}
                  </div>
                </li>
              );
            }
            if (
              entry.kind === "group" ||
              entry.kind === "groupFooter" ||
              entry.kind === "groupMore"
            ) {
              return (
                <li key={entry.key} ref={measureElement}>
                  <OptionalGroupHeaderCard
                    group={toGroupRow(entry)}
                    labels={labels}
                    onToggle={() => grouping.collapsed.toggle(entry.key)}
                    selection={selection ?? undefined}
                    onShowMore={grouping.showMore}
                    aggregateNodes={
                      entry.kind !== "groupMore" && entry.aggregateCells
                        ? Object.entries(entry.aggregateCells).map(
                            ([colKey, node]) => (
                              <span key={colKey} data-column={colKey}>
                                {node as ReactNode}
                              </span>
                            )
                          )
                        : undefined
                    }
                  />
                </li>
              );
            }
            return renderLeafCard(entry.row, entry.index, entry.key);
          })
        : insertExtraRows(
            bodyRowEntries(entries, tree),
            extraRows,
            (e) => e.key
          ).map((slot) =>
            "kind" in slot ? (
              <li
                key={slot.key}
                data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].row}
                role={slot.kind === "separator" ? "separator" : undefined}
                aria-label={
                  slot.kind === "separator" ? labels.rowSeparator : undefined
                }
              >
                <div data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].cell}>
                  {slot.kind === "fullWidth"
                    ? (slot.render?.() as ReactNode)
                    : null}
                </div>
              </li>
            ) : (
              renderLeafCard(slot.row, slot.index, slot.key, slot.treeEntry)
            )
          )}
      {grouping
        ? pinnedSummaryBottom.map((row, index) =>
            renderLeafCard(row, index, pinnedSummaryRowId("bottom", index))
          )
        : null}
      {summaryRow && (
        <li>
          <SummaryCard rows={rows} columns={columns} summaryRow={summaryRow} />
        </li>
      )}
      {paddingBottom > 0 && (
        <li aria-hidden style={{ height: paddingBottom }} />
      )}
    </ul>
  );
}
