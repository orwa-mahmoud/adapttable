/** The card list rendered in place of the table on narrow screens. */
import {
  bodyRowEntries,
  type ColumnDef,
  type ConfirmHandler,
  type EditableCellEditing,
  type MobileCardRenderer,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  type TableLabels,
  treeCardStyle,
  type TreeEntry,
} from "@adapttable/core";
import {
  cellFlashAttr,
  EXTRA_ROW_PARTS,
  insertExtraRows,
  isExtraEntry,
  mobileCardListStyle,
  orderedCardEntries,
  resolveMobileLabel,
  resolveRowStyle,
  rowClickProps,
  rowEditingSignature,
  rowFlashSignature,
  rowIsDirty,
  rowReorderSignature,
  rowStyleSignature,
  useSummaryCells,
} from "@adapttable/core/adapter";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Stack,
  Typography,
} from "@mui/material";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { memo, useMemo } from "react";

import { type SharedProps } from "./DesktopTable";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import { GroupHeaderCard } from "./GroupHeader";
import { RowEditActions, RowReorderButtons, TreeToggle } from "./kitControls";
import { RowActionButtons } from "./RowActionButtons";

/** Per-card inputs for the memoized {@link MobileCardBase}. */
interface MobileCardProps<TRow> {
  /** Replace the card's body — see `BaseDataTableProps.renderCard`. */
  renderCard?: MobileCardRenderer<TRow>;
  /** This card's place in the tree, when the table is one. */
  treeEntry?: TreeEntry<TRow>;
  /** Open or close this node. */
  onToggleTree?: (id: string) => void;
  row: TRow;
  index: number;
  /** Stable row id (selection / expansion key). */
  id: string;
  columns: readonly ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  confirm: ConfirmHandler;
  rowActions?: RowAction<TRow>[];
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
  renderDetail?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  measureElement?: (node: Element | null) => void;
  compact: boolean;
  dir?: "ltr" | "rtl";
  /**
   * Opt-in editing bundle — uncompared. Its identity changes on every
   * keystroke anywhere in the table; the per-row visual churn is
   * fingerprinted by `editingSignature` instead. A held card keeps an
   * older bundle safely: its handlers read live state through refs.
   */
  editing?: EditableCellEditing<TRow>;
  /** Page rows for Tab advance — uncompared (see `editing`). */
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  /** Memo digest from {@link rowEditingSignature}. */
  editingSignature: string | null;
  /** Headless reorder; uncompared — visual churn is `reorderSignature`. */
  rowReorder: SharedProps<TRow>["rowReorder"];
  windowStart: number;
  rowCount: number;
  reorderSignature: string | null;
}

/** The card props the memo comparator deliberately skips (see `editing`). */
type UncomparedCardProp =
  | "editing"
  | "rows"
  | "getRowId"
  | "rowReorder"
  | "style"
  | "isCellFlashing";

/** Every card prop the memo comparator checks with `Object.is`. */
const COMPARED_CARD_PROPS: readonly Exclude<
  keyof MobileCardProps<unknown>,
  UncomparedCardProp
>[] = [
  "row",
  "index",
  "id",
  "columns",
  "labels",
  "confirm",
  "rowActions",
  "rowActionsLayout",
  "renderRowActions",
  "className",
  "styleSignature",
  "flashSignature",
  "selected",
  "expanded",
  "onToggleSelect",
  "onToggleExpand",
  "renderDetail",
  "onRowClick",
  "measureElement",
  "compact",
  "dir",
  "editingSignature",
  "reorderSignature",
  "windowStart",
  "rowCount",
  // Or a folder opens and its own chevron never turns.
  "treeEntry",
];

/**
 * `React.memo` comparator: re-render a card only when one of its VISUAL
 * inputs changes — a search keystroke or another card's checkbox re-renders
 * the list shell, but every unchanged card bails out here.
 */
function mobileCardPropsEqual<TRow>(
  prev: Readonly<MobileCardProps<TRow>>,
  next: Readonly<MobileCardProps<TRow>>
): boolean {
  return COMPARED_CARD_PROPS.every((key) => Object.is(prev[key], next[key]));
}

/** One card. Memoized by {@link mobileCardPropsEqual} at the call site. */
function MobileCardBase<TRow>({
  row,
  index,
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
  measureElement,
  compact,
  dir,
  editing,
  rows,
  getRowId,
  treeEntry,
  onToggleTree,
  rowReorder,
  windowStart,
  rowCount,
  renderCard,
}: Readonly<MobileCardProps<TRow>>) {
  // Built once and used by both paths, so a custom card shows the very
  // same value node the built-in would have — cell renderers and editors
  // included.
  const fields = columns.map((column) => ({
    column,
    label: resolveMobileLabel(column),
    value: (
      <EditableDataCell
        editing={editing}
        row={row}
        column={column}
        rowId={id}
        rowIndex={index}
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
      ref={measureElement}
      data-index={index}
      data-adapttable-part="card"
      data-stagger=""
      data-selected={selected ? "" : undefined}
      data-dirty={rowIsDirty(editing, id) ? "" : undefined}
      variant="outlined"
      role="listitem"
      className={className}
      {...rowClickProps(row, onRowClick, index)}
      style={{ ...treeCardStyle(treeEntry?.level ?? 0), ...style }}
    >
      <CardContent
        sx={compact ? { p: 1.25, "&:last-child": { pb: 1.25 } } : undefined}
      >
        {treeEntry && (
          <TreeToggle
            entry={treeEntry}
            labels={labels}
            onToggle={onToggleTree ?? (() => undefined)}
          />
        )}
        {onToggleSelect && (
          <Checkbox
            slotProps={{ input: { "aria-label": labels.selectRow } }}
            checked={selected}
            onChange={() => onToggleSelect(id)}
          />
        )}
        {onToggleExpand && (
          <ExpandToggle
            id={id}
            expanded={expanded}
            onToggle={onToggleExpand}
            dir={dir}
            expandLabel={labels.expandRow}
            collapseLabel={labels.collapseRow}
          />
        )}
        {renderCard
          ? renderCard(row, { index, fields, selected, expanded })
          : fields.map(({ column, label, value }) => (
              <Box key={column.key} sx={{ mb: compact ? 0.5 : 1 }}>
                {label && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {label}
                  </Typography>
                )}
                {/* Cells are arbitrary ReactNode (often block elements) —
                a <p> wrapper would be invalid HTML. */}
                <Typography
                  component="div"
                  variant="body2"
                  data-adapttable-part="card-value"
                  data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                >
                  {value}
                </Typography>
              </Box>
            ))}
        {rowReorder && (
          <RowReorderButtons
            reorder={rowReorder}
            labels={labels}
            localIndex={index}
            row={row}
            windowStart={windowStart}
            rowCount={rowCount}
          />
        )}
        {editing?.rowEditing && (
          <RowEditActions
            rowEditing={editing.rowEditing}
            row={row}
            rowId={id}
            labels={labels}
          />
        )}
        {rowActions && rowActions.length > 0 && (
          <RowActionButtons
            row={row}
            actions={rowActions}
            confirm={confirm}
            labels={labels}
            layout={rowActionsLayout}
            render={renderRowActions}
          />
        )}
        {expanded && renderDetail && (
          // Inside the card — and therefore inside the measured element —
          // so virtualization keeps accurate card heights.
          <Box data-adapttable-part="card-detail" sx={{ mt: 1 }}>
            {renderDetail(row)}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/** Mobile MUI card list. */
export function MobileCards<TRow>({
  table,
  cardClassName,
  rows,
  rowActions,
  rowActionsLayout,
  renderRowActions,
  confirm,
  getRowId,
  size,
  dir,
  onRowClick,
  rowClassName,
  isCellFlashing,
  rowStyle,
  rowHeight,
  renderRowDetail,
  summaryRow,
  expansion,
  editing,
  grouping,
  tree,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
  rowReorder,
  windowStart = 0,
  pinnedTopRows = [],
  pinnedBottomRows = [],
  extraRows,
  renderCard,
  maxHeight,
  virtualScrollRef,
}: Readonly<SharedProps<TRow>>) {
  const { columns, selection, labels } = table;
  const entries = orderedCardEntries(
    rows,
    getRowId,
    rowEntries,
    pinnedTopRows,
    pinnedBottomRows
  );
  const compact = size === "small";
  // Expansion is active only when BOTH halves arrived (the chrome supplies
  // `expansion` exactly when `renderRowDetail` is set).
  const expand = expansion && renderRowDetail ? expansion : undefined;
  // The summary renders as a final card. Header groups and multi-sort are
  // desktop-only concerns: cards have no column grid for a group to span and
  // no clickable headers to shift-click.
  const summaryCells = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () => memo(MobileCardBase<TRow>, mobileCardPropsEqual),
    []
  );

  const cardFor = (
    row: TRow,
    index: number,
    key: string,
    treeEntry?: TreeEntry<TRow>
  ): ReactElement => {
    const id = getRowId(row);
    return (
      <CardItem
        key={key}
        row={row}
        index={index}
        id={id}
        columns={columns}
        labels={labels}
        confirm={confirm}
        rowActions={rowActions}
        rowActionsLayout={rowActionsLayout}
        renderRowActions={renderRowActions}
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
        selected={selection ? selection.isSelected(id) : false}
        expanded={expand ? expand.isExpanded(id) : false}
        onToggleSelect={selection ? selection.toggle : undefined}
        onToggleExpand={expand ? expand.toggle : undefined}
        renderDetail={renderRowDetail}
        onRowClick={onRowClick}
        measureElement={measureElement}
        compact={compact}
        dir={dir}
        editing={editing}
        rows={rows}
        getRowId={getRowId}
        editingSignature={rowEditingSignature(editing, id)}
        treeEntry={treeEntry}
        onToggleTree={tree?.expansion.toggle}
        rowReorder={rowReorder}
        windowStart={windowStart}
        rowCount={rows.length}
        reorderSignature={rowReorderSignature(rowReorder, id, index)}
        renderCard={renderCard}
      />
    );
  };

  return (
    <Stack
      spacing={compact ? 1 : 1.5}
      ref={virtualScrollRef}
      data-adapttable-part="cards"
      role="list"
      aria-label={table.getTableProps()["aria-label"]}
      style={mobileCardListStyle(maxHeight)}
    >
      {paddingTop > 0 && <Box aria-hidden sx={{ height: paddingTop }} />}
      {grouping
        ? grouping.entries.map((entry) => {
            if (isExtraEntry(entry)) {
              return (
                <Card
                  key={entry.key}
                  variant="outlined"
                  role={entry.kind === "separator" ? "separator" : "listitem"}
                  aria-label={
                    entry.kind === "separator" ? labels.rowSeparator : undefined
                  }
                  data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].row}
                >
                  <CardContent
                    data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].cell}
                  >
                    {entry.kind === "fullWidth" ? entry.render?.() : null}
                  </CardContent>
                </Card>
              );
            }
            if (
              entry.kind === "group" ||
              entry.kind === "groupFooter" ||
              entry.kind === "groupMore"
            ) {
              return (
                <GroupHeaderCard
                  key={entry.key}
                  entry={entry}
                  columns={columns}
                  selection={selection}
                  labels={labels}
                  compact={compact}
                  onToggleCollapse={(key) => grouping.collapsed.toggle(key)}
                  onShowMore={grouping.showMore}
                />
              );
            }
            return cardFor(entry.row, entry.index, entry.key);
          })
        : insertExtraRows(
            bodyRowEntries(entries, tree),
            extraRows,
            (e) => e.key
          ).map((slot) =>
            "kind" in slot ? (
              <Card
                key={slot.key}
                variant="outlined"
                role={slot.kind === "separator" ? "separator" : "listitem"}
                aria-label={
                  slot.kind === "separator" ? labels.rowSeparator : undefined
                }
                data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].row}
              >
                <CardContent
                  data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].cell}
                >
                  {slot.kind === "fullWidth" ? slot.render?.() : null}
                </CardContent>
              </Card>
            ) : (
              cardFor(slot.row, slot.index, slot.key, slot.treeEntry)
            )
          )}
      {summaryCells && (
        <Card
          data-adapttable-part="summary-card"
          variant="outlined"
          role="listitem"
        >
          <CardContent
            sx={compact ? { p: 1.25, "&:last-child": { pb: 1.25 } } : undefined}
          >
            {columns.map((column) => {
              const value = summaryCells[column.key];
              // Unlike the desktop footer, a card has no columns to keep
              // aligned, so columns without a summary are simply skipped.
              if (value === undefined) return null;
              return (
                <Box key={column.key} sx={{ mb: compact ? 0.5 : 1 }}>
                  {resolveMobileLabel(column) && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {resolveMobileLabel(column)}
                    </Typography>
                  )}
                  <Typography component="div" variant="body2">
                    {value}
                  </Typography>
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}
      {paddingBottom > 0 && <Box aria-hidden sx={{ height: paddingBottom }} />}
    </Stack>
  );
}
