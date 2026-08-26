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
  EXTRA_ROW_PARTS,
  insertExtraRows,
  isExtraEntry,
  mobileCardListStyle,
  orderedCardEntries,
  resolveMobileLabel,
  resolveRowStyle,
  rowClickProps,
  rowEditingSignature,
  rowIsDirty,
  rowReorderSignature,
  rowStyleSignature,
  useSummaryCells,
} from "@adapttable/core/adapter";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { memo, useMemo } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { type SharedProps } from "./DesktopTable";
import { EditableDataCell } from "./EditableCell";
import { ExpandButton } from "./ExpandToggle";
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
  classNames: DataTableClassNames;
  /** Resolved `rowClassName(row, index)`, compared as a plain string. */
  className?: string;
  /** Resolved `rowStyle` + `rowHeight`. Compared via `styleSignature`. */
  style?: CSSProperties;
  styleSignature: string;
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
  reorderSignature: string | null;
}

/** The card props the memo comparator deliberately skips (see `editing`). */
type UncomparedCardProp =
  | "editing"
  | "rows"
  | "getRowId"
  | "rowReorder"
  | "style";

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
  // Or a folder opens and its own chevron never turns.
  "treeEntry",
  "renderCard",
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
  renderCard,
}: Readonly<MobileCardProps<TRow>>) {
  // Built once and used by both paths, so a custom card shows the very same
  // value node the built-in would have — cell renderers and editors included.
  const fields = columns.map((column) => ({
    column,
    label: resolveMobileLabel(column),
    value: (
      <EditableDataCell
        activateClassName={classNames.editCellActivate}
        errorClassName={classNames.editCellError}
        saveErrorClassName={classNames.editCellSaveError}
        rollbackClassName={classNames.editCellRollback}
        editorClassName={classNames.editCellEditor}
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
    <li
      {...rowClickProps(row, onRowClick, index)}
      style={{ ...treeCardStyle(treeEntry?.level ?? 0), ...style }}
      ref={measureElement}
      data-index={index}
      data-adapttable-part="card"
      data-stagger=""
      data-selected={selected ? "" : undefined}
      data-dirty={rowIsDirty(editing, id) ? "" : undefined}
      data-clickable={clickable ? "" : undefined}
      className={cx(classNames.card, className)}
    >
      {treeEntry && (
        <TreeToggle
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
        <ExpandButton
          expanded={expanded}
          labels={labels}
          classNames={classNames}
          onToggle={() => onToggleExpand(id)}
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
                className={classNames.cardValue}
              >
                {value}
              </span>
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
          className={classNames.rowReorderButtons}
          upClassName={classNames.rowReorderUp}
          downClassName={classNames.rowReorderDown}
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
        <div
          data-adapttable-part="card-actions"
          className={classNames.cardActions}
        >
          <RowActionButtons
            row={row}
            actions={rowActions}
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
        classNames={classNames}
        className={rowClassName?.(row, index)}
        style={resolveRowStyle(rowStyle, rowHeight, row, index)}
        styleSignature={rowStyleSignature(
          resolveRowStyle(rowStyle, rowHeight, row, index)
        )}
        selected={selection ? selection.isSelected(id) : false}
        expanded={expansionState ? expansionState.isExpanded(id) : false}
        onToggleSelect={selection ? selection.toggle : undefined}
        onToggleExpand={expansionState ? expansionState.toggle : undefined}
        renderDetail={renderRowDetail}
        onRowClick={onRowClick}
        measureElement={measureElement}
        editing={editing}
        rows={rows}
        getRowId={getRowId}
        editingSignature={rowEditingSignature(editing, id)}
        treeEntry={treeEntry}
        onToggleTree={tree ? tree.expansion.toggle : undefined}
        rowReorder={rowReorder}
        windowStart={windowStart}
        rowCount={rows.length}
        reorderSignature={rowReorderSignature(rowReorder, id, index)}
        clickable={Boolean(onRowClick)}
        renderCard={renderCard}
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
                    {entry.kind === "fullWidth" ? entry.render?.() : null}
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
                  <GroupHeaderCard
                    entry={entry}
                    columns={columns}
                    selection={selection}
                    labels={labels}
                    classNames={classNames}
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
                  {slot.kind === "fullWidth" ? slot.render?.() : null}
                </div>
              </li>
            ) : (
              cardFor(slot.row, slot.index, slot.key, slot.treeEntry)
            )
          )}
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
