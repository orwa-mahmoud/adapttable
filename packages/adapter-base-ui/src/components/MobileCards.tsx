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
import { type CSSProperties, memo, type ReactNode, useMemo } from "react";

import type { BaseUiAccentColor } from "../types";
import { Box, Card, Flex, Text } from "../ui";
import { type SharedProps } from "./DesktopTable";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import { GroupHeaderCard } from "./GroupHeader";
import { RowEditActions, RowReorderButtons, TreeToggle } from "./kitControls";
import { Checkbox } from "./primitives";
import { RowActionButtons } from "./RowActionButtons";

/** Join the static class hook with a conditional per-row class. */
function joinClasses(
  base: string | undefined,
  extra: string | undefined
): string | undefined {
  if (base && extra) return `${base} ${extra}`;
  return base ?? extra;
}

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
  /** Static list class merged with resolved `rowClassName` output. */
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
  /** Expansion toggle — present only when expansion is enabled. */
  onToggleExpand?: (id: string) => void;
  renderDetail?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  measureElement?: (node: Element | null) => void;
  compact: boolean;
  dir?: "ltr" | "rtl";
  accentColor?: BaseUiAccentColor;
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
  "editing" | "rows" | "getRowId" | "rowReorder" | "style" | "isCellFlashing";

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
  "accentColor",
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
  accentColor,
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
        rows={rows}
        columns={columns}
        rowKey={getRowId}
        editLabel={labels.editCell}
        undoLabel={labels.undoEdit}
        display={
          column.Cell ? (
            <column.Cell row={row} rowIndex={index} />
          ) : (
            column.accessor?.(row)
          )
        }
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
      size={compact ? "1" : "2"}
      role="listitem"
      className={className}
      {...rowClickProps(row, onRowClick, index)}
      style={{ ...treeCardStyle(treeEntry?.level ?? 0), ...style }}
    >
      {treeEntry && (
        <TreeToggle
          entry={treeEntry}
          labels={labels}
          onToggle={onToggleTree ?? (() => undefined)}
        />
      )}
      {onToggleSelect && (
        <Box mb="2">
          <Checkbox
            aria-label={labels.selectRow}
            checked={selected}
            onToggle={() => onToggleSelect(id)}
          />
        </Box>
      )}
      {onToggleExpand && (
        <Box mb="2">
          <ExpandToggle
            open={expanded}
            dir={dir}
            labels={labels}
            onToggle={() => onToggleExpand(id)}
          />
        </Box>
      )}
      {renderCard
        ? renderCard(row, { index, fields, selected, expanded })
        : fields.map(({ column, label, value }) => (
            <Box key={column.key} mb={compact ? "1" : "2"}>
              {label && (
                <Text
                  as="div"
                  size="1"
                  color="gray"
                  style={{ textTransform: "uppercase" }}
                >
                  {label}
                </Text>
              )}
              <Text
                as="div"
                size="2"
                data-adapttable-part="card-value"
                data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
              >
                {value}
              </Text>
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
      {expanded && (
        <Box data-adapttable-part="card-detail" pt="1">
          {renderDetail?.(row)}
        </Box>
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
          accentColor={accentColor}
        />
      )}
    </Card>
  );
}

/** Mobile Base UI card list. */
export function MobileCards<TRow>({
  table,
  rows,
  rowActions,
  rowActionsLayout,
  renderRowActions,
  confirm,
  getRowId,
  size,
  accentColor,
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
  className,
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
  const compact = size === "1";
  const summary = useSummaryCells(summaryRow, rows);

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
  ) => {
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
        className={joinClasses(className, rowClassName?.(row, index))}
        style={resolveRowStyle(rowStyle, rowHeight, row, index)}
        styleSignature={rowStyleSignature(
          resolveRowStyle(rowStyle, rowHeight, row, index)
        )}
        flashSignature={rowFlashSignature(isCellFlashing, id, columns)}
        isCellFlashing={isCellFlashing}
        selected={selection ? selection.isSelected(id) : false}
        expanded={expansion ? expansion.isExpanded(id) : false}
        onToggleSelect={selection ? selection.toggle : undefined}
        onToggleExpand={expansion ? expansion.toggle : undefined}
        renderDetail={renderRowDetail}
        onRowClick={onRowClick}
        measureElement={measureElement}
        compact={compact}
        dir={dir}
        accentColor={accentColor}
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
    <Flex
      direction="column"
      gap={compact ? "2" : "3"}
      ref={virtualScrollRef}
      data-adapttable-part="cards"
      role="list"
      aria-label={table.getTableProps()["aria-label"]}
      style={mobileCardListStyle(maxHeight)}
    >
      {paddingTop > 0 && <Box aria-hidden style={{ height: paddingTop }} />}
      {grouping
        ? grouping.entries.map((entry) => {
            if (isExtraEntry(entry)) {
              return (
                <Card
                  key={entry.key}
                  role={entry.kind === "separator" ? "separator" : "listitem"}
                  aria-label={
                    entry.kind === "separator" ? labels.rowSeparator : undefined
                  }
                  data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].row}
                >
                  <Box data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].cell}>
                    {entry.kind === "fullWidth" ? entry.render?.() : null}
                  </Box>
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
                  dir={dir}
                  accentColor={accentColor}
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
                role={slot.kind === "separator" ? "separator" : "listitem"}
                aria-label={
                  slot.kind === "separator" ? labels.rowSeparator : undefined
                }
                data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].row}
              >
                <Box data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].cell}>
                  {slot.kind === "fullWidth" ? slot.render?.() : null}
                </Box>
              </Card>
            ) : (
              cardFor(slot.row, slot.index, slot.key, slot.treeEntry)
            )
          )}
      {paddingBottom > 0 && (
        <Box aria-hidden style={{ height: paddingBottom }} />
      )}
      {summary && (
        <Card
          data-adapttable-part="summary-card"
          size={compact ? "1" : "2"}
          role="listitem"
          className={className}
        >
          {columns.map((column) => {
            const value = summary[column.key];
            // Columns absent from the summary are skipped — a card has no grid
            // to keep aligned, so empty entries are just noise.
            if (value === undefined) return null;
            return (
              <Box key={column.key} mb={compact ? "1" : "2"}>
                {resolveMobileLabel(column) && (
                  <Text
                    as="div"
                    size="1"
                    color="gray"
                    style={{ textTransform: "uppercase" }}
                  >
                    {resolveMobileLabel(column)}
                  </Text>
                )}
                <Text as="div" size="2" weight="bold">
                  {value}
                </Text>
              </Box>
            );
          })}
        </Card>
      )}
    </Flex>
  );
}
