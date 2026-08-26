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
  bindMobileCardList,
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
  type SharedTableRenderProps,
  useSummaryCells,
} from "@adapttable/core/adapter";
import { Card, Checkbox, Group, Stack, Text } from "@mantine/core";
import {
  type CSSProperties,
  memo,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useMemo,
} from "react";

import type { Density } from "../density";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import { GroupHeaderCard } from "./GroupHeader";
import { RowEditActions, RowReorderButtons, TreeToggle } from "./kitControls";
import { RowActionButtons } from "./RowActionButtons";

/**
 * Props for {@link MobileCards}: the card-relevant slice of core's shared
 * render contract (no header/pinning/resize concerns on mobile) plus the
 * Mantine-specific extras.
 */
export interface MobileCardsProps<TRow> extends Pick<
  SharedTableRenderProps<TRow>,
  | "table"
  | "rows"
  | "rowActions"
  | "rowActionsLayout"
  | "renderRowActions"
  | "confirm"
  | "getRowId"
  | "onRowClick"
  | "rowClassName"
  | "isCellFlashing"
  | "rowStyle"
  | "rowHeight"
  | "renderRowDetail"
  | "renderCard"
  | "summaryRow"
  | "expansion"
  | "editing"
  | "grouping"
  | "tree"
  | "rowEntries"
  | "paddingTop"
  | "paddingBottom"
  | "measureElement"
  | "rowReorder"
  | "windowStart"
  | "pinnedTopRows"
  | "pinnedBottomRows"
  | "extraRows"
  | "maxHeight"
  | "virtualScrollRef"
> {
  bodyRef: RefObject<HTMLDivElement | null>;
  className?: string;
  density?: Density;
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
  cardPadding: string;
  cardGap: string | number;
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
  rowReorder: SharedTableRenderProps<TRow>["rowReorder"];
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
  "cardPadding",
  "cardGap",
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
 * the list shell, but every unchanged card bails out here (column accessors
 * are not re-invoked).
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
  cardPadding,
  cardGap,
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
      {...rowClickProps(row, onRowClick, index)}
      style={{ ...treeCardStyle(treeEntry?.level ?? 0), ...style }}
      className={className}
      ref={measureElement}
      data-index={index}
      data-adapttable-part="card"
      withBorder
      radius="md"
      padding={cardPadding}
      role="listitem"
      data-stagger=""
      data-selected={selected ? "" : undefined}
      data-dirty={rowIsDirty(editing, id) ? "" : undefined}
    >
      <Stack gap={cardGap}>
        {treeEntry && (
          <TreeToggle
            entry={treeEntry}
            labels={labels}
            onToggle={onToggleTree ?? (() => undefined)}
          />
        )}
        {onToggleSelect && (
          <Checkbox
            aria-label={labels.selectRow}
            checked={selected}
            onChange={() => onToggleSelect(id)}
          />
        )}
        {onToggleExpand && (
          <Group justify="flex-end">
            <ExpandToggle
              expanded={expanded}
              expandLabel={labels.expandRow}
              collapseLabel={labels.collapseRow}
              onToggle={() => onToggleExpand(id)}
            />
          </Group>
        )}
        {renderCard
          ? renderCard(row, { index, fields, selected, expanded })
          : fields.map(({ column, label, value }) => (
              <div key={column.key}>
                {label && (
                  <Text fz="xs" c="dimmed" tt="uppercase" fw={500}>
                    {label}
                  </Text>
                )}
                {/* Cells are arbitrary ReactNode (often block elements) —
                a <p> wrapper would be invalid HTML. */}
                <Text
                  component="div"
                  fz="sm"
                  data-adapttable-part="card-value"
                  data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                >
                  {value}
                </Text>
              </div>
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
        {expanded && renderDetail && (
          <div data-adapttable-part="card-detail">{renderDetail(row)}</div>
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
      </Stack>
    </Card>
  );
}

/** Mobile rendering: one Mantine Card per row with labelled key/value rows. */
export function MobileCards<TRow>({
  table,
  rows,
  rowActions,
  rowActionsLayout,
  renderRowActions,
  confirm,
  getRowId,
  bodyRef,
  className,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
  density = "comfortable",
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
  rowReorder,
  windowStart = 0,
  pinnedTopRows = [],
  pinnedBottomRows = [],
  extraRows,
  renderCard,
  maxHeight,
  virtualScrollRef,
}: Readonly<MobileCardsProps<TRow>>) {
  const { columns, selection, labels } = table;
  const compact = density === "compact";
  const cardPadding = compact ? "sm" : "md";
  const cardGap = compact ? 4 : "xs";
  const entries = orderedCardEntries(
    rows,
    getRowId,
    rowEntries,
    pinnedTopRows,
    pinnedBottomRows
  );
  // Header groups and multi-sort are desktop-only: cards have no column axis
  // to span a group label across or to chain a sort on, so neither renders
  // here. The footer summary still applies — it closes the list as one card.
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
        className={rowClassName?.(row, index)}
        style={resolveRowStyle(rowStyle, rowHeight, row, index)}
        styleSignature={rowStyleSignature(
          resolveRowStyle(rowStyle, rowHeight, row, index)
        )}
        flashSignature={rowFlashSignature(isCellFlashing, id, columns)}
        isCellFlashing={isCellFlashing}
        selected={selection ? selection.isSelected(id) : false}
        expanded={expansion ? expansion.isExpanded(id) : false}
        onToggleSelect={selection ? selection.toggle : undefined}
        onToggleExpand={
          expansion && renderRowDetail ? expansion.toggle : undefined
        }
        renderDetail={renderRowDetail}
        onRowClick={onRowClick}
        measureElement={measureElement}
        cardPadding={cardPadding}
        cardGap={cardGap}
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
      gap={compact ? "xs" : "sm"}
      ref={bindMobileCardList(virtualScrollRef, bodyRef)}
      data-adapttable-part="cards"
      className={className}
      style={mobileCardListStyle(maxHeight)}
      {...table.getTableProps({ role: "list" })}
    >
      {paddingTop > 0 && <div aria-hidden style={{ height: paddingTop }} />}
      {grouping
        ? grouping.entries.map((entry) => {
            if (isExtraEntry(entry)) {
              return (
                <Card
                  key={entry.key}
                  withBorder
                  radius="md"
                  padding={cardPadding}
                  data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].row}
                  role={entry.kind === "separator" ? "separator" : undefined}
                  aria-label={
                    entry.kind === "separator" ? labels.rowSeparator : undefined
                  }
                >
                  <div data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].cell}>
                    {entry.kind === "fullWidth" ? entry.render?.() : null}
                  </div>
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
                  padding={cardPadding}
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
                withBorder
                radius="md"
                padding={cardPadding}
                data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].row}
                role={slot.kind === "separator" ? "separator" : undefined}
                aria-label={
                  slot.kind === "separator" ? labels.rowSeparator : undefined
                }
              >
                <div data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].cell}>
                  {slot.kind === "fullWidth" ? slot.render?.() : null}
                </div>
              </Card>
            ) : (
              cardFor(slot.row, slot.index, slot.key, slot.treeEntry)
            )
          )}
      {paddingBottom > 0 && (
        <div aria-hidden style={{ height: paddingBottom }} />
      )}
      {summaryCells && (
        <Card
          data-adapttable-part="summary-card"
          withBorder
          radius="md"
          padding={cardPadding}
          role="listitem"
        >
          <Stack gap={cardGap}>
            {columns
              .filter((column) => summaryCells[column.key] !== undefined)
              .map((column) => (
                <div key={column.key}>
                  {resolveMobileLabel(column) && (
                    <Text fz="xs" c="dimmed" tt="uppercase" fw={500}>
                      {resolveMobileLabel(column)}
                    </Text>
                  )}
                  <Text component="div" fz="sm" fw={600}>
                    {summaryCells[column.key]}
                  </Text>
                </div>
              ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
