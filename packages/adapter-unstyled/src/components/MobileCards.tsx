/** The card list rendered in place of the table on narrow screens. */
import {
  bodyRowEntries,
  type ConfirmHandler,
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
} from "@adapttable/react";
import {
  cellFlashAttr,
  EXTRA_ROW_PARTS,
  insertExtraRows,
  isExtraEntry,
  mobileCardListStyle,
  orderedCardEntries,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  pinnedSummarySideFromId,
  resolveMobileLabel,
  resolveRowEditTrigger,
  resolveRowStyle,
  rowClickProps,
  rowEditConflict,
  rowEditingSignature,
  rowFlashSignature,
  rowIsDirty,
  rowReorderSignature,
  rowStyleSignature,
  useSummaryCells,
} from "@adapttable/react/adapter";
import {
  type CSSProperties,
  memo,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { type SharedProps } from "./DesktopTable";
import {
  OptionalEditableCell,
  OptionalExpandToggle,
  OptionalGroupHeaderCard,
  OptionalRowEditActions,
  OptionalRowReorderButtons,
  OptionalTreeToggle,
} from "./featureSlots";
import { RowActionButtons } from "./RowActionButtons";

/** Drop row-interaction props on pinned summary cards. */
function unlessPinned<T>(
  side: ReturnType<typeof pinnedSummarySideFromId>,
  value: T | undefined
): T | undefined {
  return side ? undefined : value;
}

function unlessPinnedMatch(
  side: ReturnType<typeof pinnedSummarySideFromId>,
  match: ((id: string) => boolean) | undefined,
  id: string
): boolean {
  return Boolean(unlessPinned(side, match)?.(id));
}

/** Per-card inputs for the memoized {@link MobileCardBase}. */
interface MobileCardProps<TRow> {
  /** Replace the card's body — see `BaseDataTableProps.renderCard`. */
  renderCard?: ReactMobileCardRenderer<TRow>;
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
  classNames: DataTableClassNames;
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
  clickable: boolean;
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
  /** Rows in the whole dataset, for `aria-setsize`. */
  setSize: number;
  reorderSignature: string | null;
  part?: string;
  ariaLabel?: string;
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
  "classNames",
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
  "clickable",
  "editingSignature",
  "reorderSignature",
  "windowStart",
  "rowCount",
  "setSize",
  // Or a folder opens and its own chevron never turns.
  "treeEntry",
  "renderCard",
  "part",
  "ariaLabel",
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
  classNames,
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
  clickable,
  editing,
  rows,
  getRowId,
  treeEntry,
  onToggleTree,
  rowReorder,
  windowStart,
  rowCount,
  setSize,
  renderCard,
  part,
  ariaLabel,
}: Readonly<MobileCardProps<TRow>>) {
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
        rowIndex={index}
        rows={rows}
        columns={columns}
        rowKey={getRowId}
        editLabel={labels.editCell}
        undoLabel={labels.undoEdit}
      />
    ),
  }));

  const rowEdit = resolveRowEditTrigger(
    rowActions,
    editing?.rowEditing,
    row,
    id
  );
  return (
    <li
      {...rowClickProps(row, onRowClick, index)}
      style={{ ...treeCardStyle(treeEntry?.level ?? 0), ...style }}
      ref={measureElement}
      data-index={index}
      // A windowed list has only a slice of its items in the DOM, so each
      // one states where it sits and how many there are; a complete list
      // needs neither, because assistive tech can simply count.
      aria-posinset={setSize > rowCount ? windowStart + index + 1 : undefined}
      aria-setsize={setSize > rowCount ? setSize : undefined}
      data-adapttable-part={part ?? "card"}
      data-stagger=""
      data-selected={selected ? "" : undefined}
      aria-label={ariaLabel}
      data-dirty={rowIsDirty(editing, id) ? "" : undefined}
      data-clickable={clickable ? "" : undefined}
      className={cx(classNames.card, className)}
    >
      {treeEntry && (
        <OptionalTreeToggle
          toggleClassName={classNames.treeToggle}
          spacerClassName={classNames.treeSpacer}
          entry={treeEntry}
          labels={labels}
          onToggle={onToggleTree ?? (() => undefined)}
        />
      )}
      {onToggleSelect && (
        <input
          type="checkbox"
          data-adapttable-part="checkbox"
          aria-label={labels.selectRow}
          checked={selected}
          onChange={() => onToggleSelect(id)}
          className={classNames.checkbox}
        />
      )}
      {onToggleExpand && (
        <OptionalExpandToggle
          id={id}
          expanded={Boolean(expanded)}
          onToggle={onToggleExpand}
          expandLabel={labels.expandRow}
          collapseLabel={labels.collapseRow}
        />
      )}
      {renderCard
        ? renderCard(row, { index, fields, selected, expanded })
        : fields.map(({ column, label, value }) => (
            <div
              key={column.key}
              data-adapttable-part="card-row"
              className={classNames.cardRow}
            >
              {label && (
                <span
                  data-adapttable-part="card-label"
                  className={classNames.cardLabel}
                >
                  {label}
                </span>
              )}
              <span
                data-adapttable-part="card-value"
                data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                className={classNames.cardValue}
              >
                {value}
              </span>
            </div>
          ))}
      {rowReorder && (
        <OptionalRowReorderButtons
          reorder={rowReorder}
          labels={labels}
          localIndex={index}
          row={row}
          windowStart={windowStart}
          rowCount={rowCount}
          className={classNames.rowReorderButtons}
          upClassName={classNames.rowReorderUp}
          downClassName={classNames.rowReorderDown}
        />
      )}
      {editing?.rowEditing && (
        <OptionalRowEditActions
          rowEditing={editing.rowEditing}
          row={row}
          rowId={id}
          showBegin={rowEdit.showBegin}
          icons={editing.rowEditIcons}
          conflict={rowEditConflict(editing, id)}
          labels={labels}
        />
      )}
      {rowEdit.actions.length > 0 && (
        <div
          data-adapttable-part="card-actions"
          className={classNames.cardActions}
        >
          <RowActionButtons
            row={row}
            actions={rowEdit.actions}
            confirm={confirm}
            labels={labels}
            classNames={classNames}
            layout={rowActionsLayout}
            render={renderRowActions}
          />
        </div>
      )}
      {expanded && renderDetail && (
        <div
          data-adapttable-part="card-detail"
          className={classNames.cardDetail}
        >
          {renderDetail(row)}
        </div>
      )}
    </li>
  );
}

/** Mobile card-list rendering. */
export function MobileCards<TRow>({
  table,
  rows,
  rowActions,
  confirm,
  getRowId,
  classNames,
  onRowClick,
  rowClassName,
  isCellFlashing,
  rowStyle,
  rowHeight,
  renderRowDetail,
  renderRowActions,
  rowActionsLayout,
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
  cardSetSize = 0,
  pinnedTopRows = [],
  pinnedBottomRows = [],
  pinnedSummaryTop = [],
  pinnedSummaryBottom = [],
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
    pinnedBottomRows,
    pinnedSummaryTop,
    pinnedSummaryBottom
  );
  const expansionState = renderRowDetail ? expansion : undefined;
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
  ): ReactElement => {
    const side = pinnedSummarySideFromId(key);
    const id = side ? key : getRowId(row);
    return (
      <CardItem
        key={key}
        row={row}
        index={index}
        id={id}
        columns={columns}
        labels={labels}
        confirm={confirm}
        rowActions={unlessPinned(side, rowActions)}
        rowActionsLayout={rowActionsLayout}
        renderRowActions={unlessPinned(side, renderRowActions)}
        classNames={classNames}
        className={rowClassName?.(row, index)}
        style={resolveRowStyle(rowStyle, rowHeight, row, index)}
        styleSignature={rowStyleSignature(
          resolveRowStyle(rowStyle, rowHeight, row, index)
        )}
        flashSignature={rowFlashSignature(isCellFlashing, id, columns)}
        isCellFlashing={isCellFlashing}
        selected={unlessPinnedMatch(side, selection?.isSelected, id)}
        expanded={unlessPinnedMatch(side, expansionState?.isExpanded, id)}
        onToggleSelect={unlessPinned(side, selection?.toggle)}
        onToggleExpand={unlessPinned(side, expansionState?.toggle)}
        renderDetail={unlessPinned(side, renderRowDetail)}
        onRowClick={unlessPinned(side, onRowClick)}
        measureElement={measureElement}
        editing={editing}
        rows={rows}
        getRowId={getRowId}
        editingSignature={rowEditingSignature(editing, id)}
        treeEntry={unlessPinned(side, treeEntry)}
        onToggleTree={unlessPinned(side, tree?.expansion.toggle)}
        rowReorder={unlessPinned(side, rowReorder)}
        windowStart={windowStart}
        rowCount={rows.length}
        setSize={cardSetSize}
        reorderSignature={rowReorderSignature(rowReorder, id, index)}
        clickable={Boolean(unlessPinned(side, onRowClick))}
        renderCard={unlessPinned(side, renderCard)}
        part={side ? pinnedSummaryPart(side) : undefined}
        ariaLabel={side ? labels.pinnedSummaryRow : undefined}
      />
    );
  };

  return (
    <ul
      {...table.getTableProps({ role: undefined })}
      ref={virtualScrollRef}
      data-adapttable-part="cards"
      className={classNames.cards}
      // No `list-style: none` here: Safari/VoiceOver strips list semantics
      // from such lists. Markers are suppressed per-item with display:block.
      style={{ margin: 0, padding: 0, ...mobileCardListStyle(maxHeight) }}
    >
      {paddingTop > 0 && (
        <li
          data-adapttable-part="virtual-spacer"
          className={classNames.virtualSpacer}
          style={{ display: "block", height: paddingTop }}
        />
      )}
      {grouping
        ? pinnedSummaryTop.map((row, index) =>
            cardFor(row, index, pinnedSummaryRowId("top", index))
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
                  className={
                    entry.kind === "separator"
                      ? classNames.separatorRow
                      : classNames.fullWidthRow
                  }
                  style={{ display: "block" }}
                >
                  <div
                    data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].cell}
                    className={
                      entry.kind === "separator"
                        ? classNames.separatorCell
                        : classNames.fullWidthCell
                    }
                  >
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
                <li key={entry.key} style={{ display: "block" }}>
                  <OptionalGroupHeaderCard
                    entry={entry}
                    columns={columns}
                    selection={selection}
                    labels={labels}
                    compact={false}
                    onToggleCollapse={(key) => grouping.collapsed.toggle(key)}
                    onShowMore={grouping.showMore}
                  />
                </li>
              );
            }
            return cardFor(entry.row, entry.index, entry.key);
          })
        : insertExtraRows(
            bodyRowEntries(entries, tree),
            extraRows,
            (e) => e.key
          ).map((slot) =>
            isExtraEntry(slot) ? (
              <li
                key={slot.key}
                data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].row}
                role={slot.kind === "separator" ? "separator" : undefined}
                aria-label={
                  slot.kind === "separator" ? labels.rowSeparator : undefined
                }
                className={
                  slot.kind === "separator"
                    ? classNames.separatorRow
                    : classNames.fullWidthRow
                }
                style={{ display: "block" }}
              >
                <div
                  data-adapttable-part={EXTRA_ROW_PARTS[slot.kind].cell}
                  className={
                    slot.kind === "separator"
                      ? classNames.separatorCell
                      : classNames.fullWidthCell
                  }
                >
                  {slot.kind === "fullWidth"
                    ? (slot.render?.() as ReactNode)
                    : null}
                </div>
              </li>
            ) : (
              cardFor(slot.row, slot.index, slot.key, slot.treeEntry)
            )
          )}
      {grouping
        ? pinnedSummaryBottom.map((row, index) =>
            cardFor(row, index, pinnedSummaryRowId("bottom", index))
          )
        : null}
      {paddingBottom > 0 && (
        <li
          data-adapttable-part="virtual-spacer"
          className={classNames.virtualSpacer}
          style={{ display: "block", height: paddingBottom }}
        />
      )}
      {summary && (
        <li
          data-adapttable-part="summary-card"
          className={cx(classNames.card, classNames.summaryCard)}
          style={{ display: "block" }}
        >
          {columns.map((column) =>
            summary[column.key] == null ? null : (
              <div
                key={column.key}
                data-adapttable-part="card-row"
                className={classNames.cardRow}
              >
                {resolveMobileLabel(column) && (
                  <span
                    data-adapttable-part="card-label"
                    className={classNames.cardLabel}
                  >
                    {resolveMobileLabel(column)}
                  </span>
                )}
                <span
                  data-adapttable-part="card-value"
                  className={classNames.cardValue}
                >
                  {summary[column.key]}
                </span>
              </div>
            )
          )}
        </li>
      )}
    </ul>
  );
}
