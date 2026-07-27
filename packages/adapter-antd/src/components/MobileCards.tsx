import {
  type ColumnDef,
  type ConfirmHandler,
  type EditableCellEditing,
  type GroupedFlatEntry,
  resolveDisabledReason,
  resolveVirtualRows,
  type RowAction,
  rowClickProps,
  rowEditingSignature,
  type RowExpansionState,
  runRowAction,
  type TableLabels,
  type UseDataTableResult,
  useSummaryCells,
  type VirtualTableRow,
} from "@adapttable/core";
import { Button, Card, Checkbox, Descriptions, Space } from "antd";
import { memo, type ReactNode, useMemo } from "react";

import { isDangerColor } from "../colors";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import {
  ADAPTTABLE_GROUP,
  type AdaptTableGroupRow,
  GroupHeaderCard,
} from "./grouping";

/** The mobile-card label for a column: explicit `mobileLabel`, else a string
 * `header`, else the column key. */
function cardLabel<TRow>(column: ColumnDef<TRow>): string {
  if (column.mobileLabel) return column.mobileLabel;
  return typeof column.header === "string" ? column.header : column.key;
}

/** Row-action buttons for a single card. */
function CardActions<TRow>({
  row,
  rowActions,
  confirm,
  labels,
}: Readonly<{
  row: TRow;
  rowActions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
}>) {
  return (
    <Space size="small" wrap>
      {rowActions.map((action) => {
        if (action.isHidden?.(row)) return null;
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        return (
          <Button
            key={action.key}
            size="small"
            danger={isDangerColor(action.color)}
            disabled={disabled}
            title={reason}
            aria-label={action.label}
            // The disabled attribute already blocks activation, so attach
            // the handler only when the action can run.
            onClick={
              disabled
                ? undefined
                : () => runRowAction(action, row, confirm, labels.cancel)
            }
          >
            {action.icon ?? action.label}
          </Button>
        );
      })}
    </Space>
  );
}

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
  columns: ColumnDef<TRow>[];
  summaryRow: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
}>) {
  const cells = useSummaryCells(summaryRow, rows) ?? {};
  return (
    <Card size="small" data-adapttable-part="summary-card">
      <Descriptions column={1} size="small" colon={false}>
        {columns
          .filter((column) => cells[column.key] !== undefined)
          .map((column) => (
            <Descriptions.Item key={column.key} label={cardLabel(column)}>
              {cells[column.key]}
            </Descriptions.Item>
          ))}
      </Descriptions>
    </Card>
  );
}

/** Per-card inputs for the memoized {@link CardItemBase}. */
interface CardItemProps<TRow> {
  row: TRow;
  rowIndex: number;
  /** Stable row id (selection / expansion key). */
  id: string;
  columns: ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  confirm: ConfirmHandler;
  rowActions?: readonly RowAction<TRow>[];
  /** Resolved `rowClassName(row, index)`, compared as a plain string. */
  className?: string;
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
    prev.className === next.className &&
    prev.selected === next.selected &&
    prev.expanded === next.expanded &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onToggleExpand === next.onToggleExpand &&
    prev.renderDetail === next.renderDetail &&
    prev.onRowClick === next.onRowClick &&
    prev.prefetch === next.prefetch &&
    prev.editingSignature === next.editingSignature
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
    className,
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
  } = props;
  const actions = rowActions && rowActions.length > 0 ? rowActions : null;
  return (
    <Card
      size="small"
      className={className}
      data-stagger=""
      {...rowClickProps(row, onRowClick)}
      onMouseEnter={prefetch ? () => prefetch(row) : undefined}
      title={
        onToggleSelect ? (
          <Checkbox
            checked={selected}
            aria-label={labels.selectRow}
            onChange={() => onToggleSelect(id)}
          />
        ) : undefined
      }
      extra={
        (onToggleExpand ?? actions) ? (
          <Space size="small">
            {onToggleExpand && (
              <ExpandToggle
                expanded={expanded}
                labels={labels}
                onClick={() => onToggleExpand(id)}
              />
            )}
            {actions && (
              <CardActions
                row={row}
                rowActions={actions}
                confirm={confirm}
                labels={labels}
              />
            )}
          </Space>
        ) : undefined
      }
    >
      <Descriptions column={1} size="small" colon={false}>
        {columns.map((column) => (
          <Descriptions.Item key={column.key} label={cardLabel(column)}>
            <EditableDataCell
              editing={editing}
              row={row}
              column={column}
              rowId={id}
              rowIndex={rowIndex}
              rows={rows}
              columns={columns}
              rowKey={getRowId}
              editLabel={labels.editCell}
            />
          </Descriptions.Item>
        ))}
      </Descriptions>
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
 *
 * @typeParam TRow - The row type.
 */
export function MobileCards<TRow>({
  table,
  cardClassName,
  rows,
  rowActions,
  confirm,
  getRowId,
  prefetch,
  onRowClick,
  rowClassName,
  tableLabel,
  compact = false,
  expansion,
  renderRowDetail,
  summaryRow,
  editing,
  grouping,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
}: Readonly<{
  table: UseDataTableResult<TRow>;
  /** Class applied to every card (merged before `rowClassName`). */
  cardClassName?: string;
  rows: readonly TRow[];
  rowActions?: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  getRowId: (row: TRow) => string;
  prefetch?: (row: TRow) => void;
  /** Row activation handler — see `BaseDataTableProps.onRowClick`. */
  onRowClick?: (row: TRow) => void;
  /** Conditional per-row class — see `BaseDataTableProps.rowClassName`. */
  rowClassName?: (row: TRow, index: number) => string | undefined;
  tableLabel?: string;
  /** Tighter card rhythm for the `"compact"` density. */
  compact?: boolean;
  /** Row-expansion state — present only when `renderRowDetail` is set. */
  expansion?: RowExpansionState;
  /** Detail-panel renderer — see `BaseDataTableProps.renderRowDetail`. */
  renderRowDetail?: (row: TRow) => ReactNode;
  /** Footer summary builder — see `BaseDataTableProps.summaryRow`. */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
  /** Opt-in editing bundle — omit and cells stay display-only. */
  editing?: EditableCellEditing<TRow>;
  /**
   * Opt-in grouping bundle — when set, cards iterate flat group/leaf entries
   * instead of the leaf-only virtual window.
   */
  grouping?: {
    collapsed: { toggle: (key: string) => void };
    entries: readonly GroupedFlatEntry<TRow>[];
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
}>) {
  const { labels, selection, columns } = table;
  // Either the virtual slice or every source row, resolved to render entries
  // with their ORIGINAL index (so cells and classes see the true row index).
  const entries = resolveVirtualRows(rows, getRowId, rowEntries);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () => memo(CardItemBase<TRow>, cardItemPropsEqual),
    []
  );

  const renderLeafCard = (row: TRow, index: number, key: string) => {
    const id = getRowId(row);
    return (
      <li key={key} ref={measureElement} data-index={index}>
        <CardItem
          row={row}
          rowIndex={index}
          id={id}
          columns={columns}
          labels={labels}
          confirm={confirm}
          rowActions={rowActions}
          className={
            [cardClassName, rowClassName?.(row, index)]
              .filter(Boolean)
              .join(" ") || undefined
          }
          selected={selection ? selection.isSelected(id) : false}
          expanded={expansion ? expansion.isExpanded(id) : false}
          onToggleSelect={selection ? selection.toggle : undefined}
          onToggleExpand={expansion ? expansion.toggle : undefined}
          renderDetail={renderRowDetail}
          onRowClick={onRowClick}
          prefetch={prefetch}
          editing={editing}
          rows={rows}
          getRowId={getRowId}
          editingSignature={rowEditingSignature(editing, id)}
        />
      </li>
    );
  };

  const toGroupRow = (
    entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>
  ): AdaptTableGroupRow => ({
    [ADAPTTABLE_GROUP]: true,
    key: entry.key,
    label: entry.label,
    leafIds: entry.leafIds,
    aggregateCells: entry.aggregateCells,
    collapsed: entry.collapsed,
  });

  return (
    <ul
      data-adapttable-part="cards"
      aria-label={tableLabel}
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 4 : 8,
      }}
    >
      {paddingTop > 0 && <li aria-hidden style={{ height: paddingTop }} />}
      {grouping
        ? grouping.entries.map((entry) => {
            if (entry.kind === "group") {
              return (
                <li key={entry.key} ref={measureElement}>
                  <GroupHeaderCard
                    group={toGroupRow(entry)}
                    labels={labels}
                    onToggle={() => grouping.collapsed.toggle(entry.key)}
                    selection={selection ?? undefined}
                    aggregateNodes={
                      entry.aggregateCells
                        ? Object.entries(entry.aggregateCells).map(
                            ([colKey, node]) => (
                              <span key={colKey} data-column={colKey}>
                                {node}
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
        : entries.map(({ row, index, key }) => renderLeafCard(row, index, key))}
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
