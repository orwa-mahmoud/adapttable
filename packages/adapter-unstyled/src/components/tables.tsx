import {
  type ColumnDef,
  columnResizeHandleProps,
  type ConfirmHandler,
  edgePinStyle,
  type EditableCellEditing,
  headerGroupRow,
  PIN_Z,
  type PinLeads,
  pinnedCellStyle,
  pinnedColumnWidth,
  type PinOffset,
  resolveDisabledReason,
  resolveVirtualRows,
  type RowAction,
  rowClickProps,
  rowEditingSignature,
  runRowAction,
  type SharedTableRenderProps,
  type TableLabels,
  tableMinWidth,
  tableRenderModel,
  type UseDataTableResult,
  useHorizontalOverflow,
  useSummaryCells,
} from "@adapttable/core";
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from "react";
import { memo, useCallback, useMemo, useRef } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { EditableDataCell } from "./EditableCell";
import { GroupHeaderCard, GroupHeaderRow } from "./GroupHeader";
import { ChevronIcon } from "./icons";

/** Inline style for an absolutely-positioned column-resize handle. */
const RESIZE_HANDLE_STYLE: CSSProperties = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: 8,
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
};

// The leading checkbox (44px) and trailing actions (120px) columns pin to the
// edge alongside the data columns, which therefore start past them.
const SELECTION_WIDTH = 44;
const ACTIONS_WIDTH = 120;

/**
 * Scroll-box style: a `maxHeight`-bounded box scrolls on both axes; otherwise
 * the wrapper scrolls sideways only when something needs it (a pinned column,
 * or measured horizontal overflow). When the table fits, the wrapper carries
 * NO overflow style — `overflow-x: auto` makes `overflow-y` compute to `auto`
 * too, which would trap a page-scroll sticky header inside the box.
 */
function scrollBoxStyle(
  maxHeight: number | undefined,
  scrollX: boolean
): CSSProperties | undefined {
  if (maxHeight != null) {
    return { maxHeight, overflowX: "auto", overflowY: "auto" };
  }
  return scrollX ? { overflowX: "auto" } : undefined;
}

interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  classNames: DataTableClassNames;
  /**
   * Whether the user pinned the injected actions column to the inline end
   * (one click in the Columns menu) — sticks it independently of any data
   * pin on that side.
   */
  actionsPinned?: boolean;
}

function RowActionButtons<TRow>({
  row,
  actions,
  confirm,
  cancelLabel,
  classNames,
}: Readonly<{
  row: TRow;
  actions: RowAction<TRow>[];
  confirm: ConfirmHandler;
  cancelLabel: string;
  classNames: DataTableClassNames;
}>) {
  return (
    <>
      {actions.map((action) => {
        if (action.isHidden?.(row)) return null;
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        // The disabled attribute already blocks activation, so attach the
        // handler only when the action can run.
        const handleClick = disabled
          ? undefined
          : (e: MouseEvent) => {
              e.stopPropagation();
              runRowAction(action, row, confirm, cancelLabel);
            };
        return (
          <button
            key={action.key}
            type="button"
            disabled={disabled}
            title={reason}
            aria-label={action.label}
            data-adapttable-part="action-button"
            data-color={action.color}
            className={classNames.actionButton}
            onClick={handleClick}
          >
            {action.icon ?? action.label}
          </button>
        );
      })}
    </>
  );
}

/**
 * The expand/collapse chevron, shared by desktop rows and mobile cards. The
 * `data-expanded` attribute is the styling hook for rotating the glyph
 * (`rowClickProps`' interactive-child guard keeps the click off the row).
 */
function ExpandButton({
  expanded,
  labels,
  classNames,
  onToggle,
}: Readonly<{
  expanded: boolean;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  onToggle: () => void;
}>) {
  return (
    <button
      type="button"
      data-adapttable-part="expand-button"
      data-expanded={expanded ? "" : undefined}
      className={classNames.expandButton}
      aria-expanded={expanded}
      aria-label={expanded ? labels.collapseRow : labels.expandRow}
      onClick={onToggle}
    >
      <ChevronIcon size={14} />
    </button>
  );
}

/**
 * Props for the memoized desktop row. The comparator below checks ONLY the
 * visual inputs (row data, selected/expanded state, column + width + class
 * identities, the pin signature); everything else — `table`, the latest-ref
 * callback wrappers, `confirm`, `pinOffset`, `measureElement` — is either
 * stable or only consulted when one of the compared inputs re-renders the
 * row, so a fresh identity there must not (and does not) defeat the memo.
 */
interface DesktopRowProps<TRow> {
  row: TRow;
  index: number;
  /** Stable row id (selection + expansion key). */
  id: string;
  /** Headless model (prop-getters); a fresh object every render — uncompared. */
  table: UseDataTableResult<TRow>;
  columns: ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  /** `undefined` = no selection column; otherwise the row's selected state. */
  selected: boolean | undefined;
  /** `undefined` = no expansion column; otherwise the row's expanded state. */
  expanded: boolean | undefined;
  showActions: boolean;
  rowActions?: RowAction<TRow>[];
  confirm: ConfirmHandler;
  /** Full-width colSpan (expansion + selection + data + actions), core-computed. */
  columnSpan: number;
  /**
   * Comparator-only input: body cells inherit widths from the header's table
   * layout, but a width change must still re-render pinned rows (insets).
   */
  columnWidths?: Readonly<Record<string, number>>;
  pinOffset?: (key: string) => PinOffset | undefined;
  /** Value-comparable digest of every column's pin side + inset. */
  pinSignature: string;
  hasStartPin: boolean;
  hasEndPin: boolean;
  /** Whether the actions column is user-pinned (sticks without a data pin). */
  actionsPinned: boolean;
  /** Pre-computed `rowClassName(row, index)` output (value-compared). */
  rowClass: string | undefined;
  clickable: boolean;
  hasPrefetch: boolean;
  /**
   * Opt-in editing bundle — uncompared; visual churn is fingerprinted by
   * `editingSignature` so idle rows bail out while the active draft updates.
   */
  editing: EditableCellEditing<TRow> | undefined;
  /** Page rows for Tab advance — uncompared (see `editing`). */
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  /** Memo digest from {@link rowEditingSignature}. */
  editingSignature: string | null;
  /* Latest-ref wrappers from DesktopTable — identity-stable for the mount. */
  onRowClick: (row: TRow) => void;
  onPrefetch: (row: TRow) => void;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  renderDetail: (row: TRow) => ReactNode;
  measureElement?: (element: Element | null) => void;
}

/**
 * `React.memo` comparator: re-render a row only when one of its VISUAL
 * inputs changes. A search keystroke or another row's checkbox re-renders
 * the table shell, but every unchanged row bails out here (accessors and
 * Cell render-props are not re-invoked).
 */
function desktopRowPropsEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return (
    prev.row === next.row &&
    prev.index === next.index &&
    prev.id === next.id &&
    prev.selected === next.selected &&
    prev.expanded === next.expanded &&
    prev.columns === next.columns &&
    prev.labels === next.labels &&
    prev.classNames === next.classNames &&
    prev.showActions === next.showActions &&
    prev.rowActions === next.rowActions &&
    prev.columnSpan === next.columnSpan &&
    prev.columnWidths === next.columnWidths &&
    prev.pinSignature === next.pinSignature &&
    prev.hasStartPin === next.hasStartPin &&
    prev.hasEndPin === next.hasEndPin &&
    prev.actionsPinned === next.actionsPinned &&
    prev.rowClass === next.rowClass &&
    prev.clickable === next.clickable &&
    prev.hasPrefetch === next.hasPrefetch &&
    prev.editingSignature === next.editingSignature
  );
}

function DesktopRowBase<TRow>(
  props: Readonly<DesktopRowProps<TRow>>
): ReactElement {
  const {
    row,
    index,
    id,
    table,
    columns,
    labels,
    classNames,
    selected,
    expanded,
    showActions,
    rowActions,
    confirm,
    columnSpan,
    pinOffset,
    hasStartPin,
    hasEndPin,
    actionsPinned,
    rowClass,
    clickable,
    hasPrefetch,
    editing,
    rows,
    getRowId,
    onRowClick,
    onPrefetch,
    onToggleSelect,
    onToggleExpand,
    renderDetail,
    measureElement,
  } = props;
  const expandable = expanded !== undefined;
  const leads: PinLeads = {
    start: selected === undefined ? 0 : SELECTION_WIDTH,
    end: showActions ? ACTIONS_WIDTH : 0,
  };
  const bodyPinStyle = (key: string): CSSProperties | undefined =>
    pinnedCellStyle(pinOffset?.(key), PIN_Z.body, leads);
  return (
    <>
      <tr
        {...table.getRowProps(row, index)}
        {...rowClickProps(row, clickable ? onRowClick : undefined, index)}
        ref={measureElement}
        data-adapttable-part="row"
        data-stagger=""
        data-selected={selected ? "" : undefined}
        data-clickable={clickable ? "" : undefined}
        className={cx(classNames.row, rowClass)}
        onMouseEnter={hasPrefetch ? () => onPrefetch(row) : undefined}
      >
        {expandable && (
          <td
            data-adapttable-part="expand-cell"
            className={classNames.expandCell}
          >
            <ExpandButton
              expanded={expanded}
              labels={labels}
              classNames={classNames}
              onToggle={() => onToggleExpand(id)}
            />
          </td>
        )}
        {selected !== undefined && (
          <td
            data-adapttable-part="selection-cell"
            data-pinned={hasStartPin ? "start" : undefined}
            style={edgePinStyle("start", hasStartPin, PIN_Z.body)}
            className={cx(classNames.cell, classNames.selectionCell)}
          >
            <input
              type="checkbox"
              data-adapttable-part="checkbox"
              aria-label={labels.selectRow}
              checked={selected}
              onChange={() => onToggleSelect(id)}
              className={classNames.checkbox}
            />
          </td>
        )}
        {columns.map((column) => {
          const pinStyle = bodyPinStyle(column.key);
          return (
            <td
              key={column.key}
              {...table.getCellProps(column, pinStyle && { style: pinStyle })}
              data-adapttable-part="cell"
              data-pinned={pinOffset?.(column.key)?.side}
              className={classNames.cell}
            >
              <EditableDataCell
                activateClassName={classNames.editCellActivate}
                editorClassName={classNames.editCellEditor}
                editing={editing}
                row={row}
                column={column}
                rowId={id}
                rows={rows}
                columns={columns}
                rowKey={getRowId}
                editLabel={labels.editCell}
                display={
                  column.Cell ? (
                    <column.Cell row={row} rowIndex={index} />
                  ) : (
                    column.accessor?.(row)
                  )
                }
              />
            </td>
          );
        })}
        {showActions && (
          <td
            data-adapttable-part="actions-cell"
            data-pinned={hasEndPin || actionsPinned ? "end" : undefined}
            style={edgePinStyle("end", hasEndPin || actionsPinned, PIN_Z.body)}
            className={cx(classNames.cell, classNames.actionsCell)}
          >
            <RowActionButtons
              row={row}
              actions={rowActions!}
              confirm={confirm}
              cancelLabel={labels.cancel}
              classNames={classNames}
            />
          </td>
        )}
      </tr>
      {expandable && expanded && (
        <tr data-adapttable-part="detail-row" className={classNames.detailRow}>
          <td
            colSpan={columnSpan}
            data-adapttable-part="detail-cell"
            className={classNames.detailCell}
          >
            {renderDetail(row)}
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * One memoized row component per `DesktopTable` instantiation. A factory
 * (called once through `useMemo`) instead of a module-level `memo(...)`
 * because `React.memo` erases a generic component's type parameter — the
 * factory keeps `TRow` without a type cast.
 */
function createDesktopRow<TRow>() {
  return memo<DesktopRowProps<TRow>>(DesktopRowBase, desktopRowPropsEqual);
}

/** Desktop semantic `<table>` rendering. */
export function DesktopTable<TRow>({
  table,
  rows,
  rowActions,
  confirm,
  getRowId,
  classNames,
  prefetch,
  onRowClick,
  rowClassName,
  renderRowDetail,
  summaryRow,
  expansion,
  editing,
  grouping,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
  stickyHeader = false,
  stickyTop = 0,
  pinOffset,
  maxHeight,
  virtualScrollRef,
  setWidth,
  columnWidths,
  resizeLabel = "Resize column",
  actionsPinned = false,
}: Readonly<SharedProps<TRow>>) {
  // The model's columnSpan already counts the expand chevron column (core
  // only counts it when BOTH `renderRowDetail` and `expansion` arrive).
  const { columns, selection, labels, showActions, entries, columnSpan } =
    tableRenderModel({
      table,
      rows,
      rowActions,
      getRowId,
      rowEntries,
      renderRowDetail,
      expansion,
    });
  // The actions column sticks when the user end-pins IT in the Columns menu —
  // independently of any data pin on that side (and only while it renders).
  const stickActions = showActions && actionsPinned;
  // Expansion is active only when BOTH halves arrive (the chrome only builds
  // the state when `renderRowDetail` is set).
  const expansionState = renderRowDetail ? expansion : undefined;
  const expandable = expansionState !== undefined;

  // The memoized row compares visual inputs only; callbacks reach it through
  // these identity-stable wrappers that always invoke the LATEST handler
  // (selection.toggle and friends change identity with the selection, and a
  // bailed-out row must never fire a stale closure — controlled selection
  // would otherwise compute from an outdated set).
  const live = useRef({
    selection,
    expansion: expansionState,
    grouping,
    onRowClick,
    prefetch,
    renderRowDetail,
  });
  live.current = {
    selection,
    expansion: expansionState,
    grouping,
    onRowClick,
    prefetch,
    renderRowDetail,
  };
  const onToggleSelect = useCallback(
    (id: string) => live.current.selection?.toggle(id),
    []
  );
  const onToggleExpand = useCallback(
    (id: string) => live.current.expansion?.toggle(id),
    []
  );
  const onToggleGroup = useCallback(
    (groupKey: string) => live.current.grouping?.collapsed.toggle(groupKey),
    []
  );
  const handleRowClick = useCallback(
    (row: TRow) => live.current.onRowClick?.(row),
    []
  );
  const handlePrefetch = useCallback(
    (row: TRow) => live.current.prefetch?.(row),
    []
  );
  const renderDetail = useCallback(
    (row: TRow) => live.current.renderRowDetail?.(row),
    []
  );
  const Row = useMemo(() => createDesktopRow<TRow>(), []);

  // Measures the always-rendered scroll-box wrapper so it can turn into a
  // horizontal scroller exactly while the table is wider than it.
  const { ref: overflowRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();

  // Stick the header *cells* (a `<thead>` does not pin against the document
  // scroller). The adapter ships no colours, so consumers must give their
  // `headerCell` class an opaque background — the `data-sticky`/`data-pinned`
  // hooks make that easy to target.
  // Inside a maxHeight scroll box the box itself is the sticky context, so
  // the header pins to ITS top — a viewport offset would float it mid-box.
  // ANY scroll container (maxHeight, pins, measured overflow) is the sticky
  // context: pin to ITS top — a viewport offset would shove the header down
  // into the rows. A user-pinned actions column counts: it needs the same
  // horizontal scroll container to stick to.
  const hasPinned =
    columns.some((c) => pinOffset?.(c.key) != null) || stickActions;
  const inScrollBox = maxHeight != null || hasPinned || overflowing;
  const stickyStyle: CSSProperties | undefined = stickyHeader
    ? {
        position: "sticky",
        top: inScrollBox ? 0 : stickyTop,
        zIndex: PIN_Z.header,
      }
    : undefined;
  const stickyAttr = stickyHeader || undefined;
  const leads: PinLeads = {
    start: selection ? SELECTION_WIDTH : 0,
    end: showActions ? ACTIONS_WIDTH : 0,
  };
  const hasStartPin = columns.some((c) => pinOffset?.(c.key)?.side === "start");
  const hasEndPin = columns.some((c) => pinOffset?.(c.key)?.side === "end");
  // A value-comparable digest of the pin layout: while it is unchanged, a
  // memoized row's previous pin styles are still correct, so `pinOffset`'s
  // identity itself stays out of the row comparator.
  const pinSignature = columns
    .map((c) => {
      const pin = pinOffset?.(c.key);
      return pin ? `${c.key}:${pin.side}:${pin.inset}` : "";
    })
    .join("|");
  // Pinned header cells need both the sticky-top and sticky-left/right styles;
  // body cells only the side. Header pins sit above the sticky header so later
  // headers never paint over them on horizontal scroll.
  const headPinStyle = (key: string): CSSProperties | undefined =>
    pinnedCellStyle(pinOffset?.(key), PIN_Z.headerPinned, leads);
  const headStyle = (column: ColumnDef<TRow>): CSSProperties | undefined => {
    const key = column.key;
    const pin = headPinStyle(key);
    // A pinned column renders at the width its sticky inset assumed, so
    // stacked pins stay flush even with no declared width.
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : columnWidths?.[key];
    if (!stickyStyle && !pin && width == null && !setWidth) return undefined;
    // Leave `width` out when unset so merging never clobbers the declared
    // column width the core prop-getter already provides.
    const merged: CSSProperties = {
      ...stickyStyle,
      ...pin,
      ...(width != null && { width }),
    };
    // The resize handle is absolutely positioned, so the cell needs a
    // positioning context when it is not already sticky/pinned.
    if (setWidth && !merged.position) merged.position = "relative";
    return merged;
  };
  // The checkbox / actions edge cells pin to their side when a data column
  // there is pinned (corner-sticky in the header).
  const edgeHeadStyle = (
    side: "start" | "end",
    active: boolean
  ): CSSProperties | undefined => {
    const edge = edgePinStyle(side, active, PIN_Z.headerPinned);
    if (!stickyStyle && !edge) return undefined;
    return { ...stickyStyle, ...edge };
  };
  const columnName = (column: ColumnDef<TRow>): string =>
    typeof column.header === "string" ? column.header : column.key;
  // Fixed-width columns get a real table min-width (their sum), so the table
  // overflows and scrolls horizontally instead of squishing columns to fit.
  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra:
      (selection ? SELECTION_WIDTH : 0) + (showActions ? ACTIONS_WIDTH : 0),
  });

  // The grouped header row (when any visible column declares a `group`) and
  // the footer summary both align under the data columns, so the leading
  // expand/selection and trailing actions columns get unlabeled pad cells.
  const groups = headerGroupRow(columns);
  const summary = useSummaryCells(summaryRow, rows);
  const groupPad = (
    <th
      data-adapttable-part="header-group-cell"
      className={classNames.headerGroupCell}
    />
  );
  const summaryPad = (
    <td
      data-adapttable-part="summary-cell"
      className={classNames.summaryCell}
    />
  );

  const tableEl = (
    <table
      {...table.getTableProps()}
      data-adapttable-part="table"
      className={classNames.table}
      style={minWidth > 0 ? { minWidth } : undefined}
    >
      <thead data-adapttable-part="thead" className={classNames.thead}>
        {groups && (
          <tr
            data-adapttable-part="header-group-row"
            className={classNames.headerGroupRow}
          >
            {expandable && groupPad}
            {selection && groupPad}
            {groups.map((group) => (
              <th
                key={group.key}
                colSpan={group.span}
                data-adapttable-part="header-group-cell"
                className={classNames.headerGroupCell}
              >
                {group.label}
              </th>
            ))}
            {showActions && groupPad}
          </tr>
        )}
        <tr
          {...table.getHeaderRowProps()}
          data-adapttable-part="header-row"
          className={classNames.headerRow}
        >
          {expandable && (
            <th
              aria-label={labels.expandRow}
              data-adapttable-part="expand-header"
              data-sticky={stickyAttr}
              style={stickyStyle}
              className={cx(classNames.headerCell, classNames.expandHeader)}
            />
          )}
          {selection && (
            <th
              data-adapttable-part="selection-header"
              data-sticky={stickyAttr}
              data-pinned={hasStartPin ? "start" : undefined}
              style={edgeHeadStyle("start", hasStartPin)}
              className={cx(classNames.headerCell, classNames.selectionHeader)}
            >
              <input
                type="checkbox"
                aria-label={labels.selectAll}
                checked={selection.headerState === "all"}
                ref={(el) => {
                  if (el) el.indeterminate = selection.headerState === "some";
                }}
                data-adapttable-part="checkbox"
                onChange={selection.toggleAll}
                className={classNames.checkbox}
              />
            </th>
          )}
          {columns.map((column) => {
            // Route the local sticky/pin/width style THROUGH the prop-getter
            // so it merges with core's alignment + declared width instead of
            // replacing them (a bare `style=` after the spread would).
            const localStyle = headStyle(column);
            const headerProps = table.getHeaderCellProps(
              column,
              localStyle && { style: localStyle }
            );
            // A multi-sort chain level counts as sorted too — data-sorted
            // and the glyph must agree with the aria-sort core reports.
            const chainDir = table.source.sortLevels.find(
              (level) => level.key === column.key
            )?.dir;
            const effectiveDir =
              chainDir ??
              (table.sortBy === column.key ? table.sortDir : undefined);
            const active = effectiveDir !== undefined;
            // Spread the core prop-getter as-is so React hands the click
            // EVENT to core's onClick (shift-click chains a multi-sort
            // level). Its `data-sort-index` doubles as the badge content.
            const sortButtonProps = table.getSortButtonProps(column);
            const sortIndex = sortButtonProps["data-sort-index"];
            return (
              <th
                key={column.key}
                {...headerProps}
                data-adapttable-part="header-cell"
                data-sorted={effectiveDir}
                data-sticky={stickyAttr}
                data-pinned={pinOffset?.(column.key)?.side}
                className={classNames.headerCell}
              >
                {column.sortable ? (
                  <button
                    {...sortButtonProps}
                    data-adapttable-part="sort-button"
                    className={classNames.sortButton}
                  >
                    {column.header}
                    {typeof sortIndex === "number" && (
                      <span
                        data-adapttable-part="sort-index"
                        className={classNames.sortIndex}
                      >
                        {sortIndex}
                      </span>
                    )}
                    <span aria-hidden> {sortGlyph(active, effectiveDir)}</span>
                  </button>
                ) : (
                  column.header
                )}
                {setWidth && (
                  <span
                    {...columnResizeHandleProps(
                      column.key,
                      setWidth,
                      `${resizeLabel}: ${columnName(column)}`
                    )}
                    data-adapttable-part="resize-handle"
                    className={classNames.resizeHandle}
                    style={RESIZE_HANDLE_STYLE}
                  />
                )}
              </th>
            );
          })}
          {showActions && (
            <th
              data-adapttable-part="actions-header"
              data-sticky={stickyAttr}
              data-pinned={hasEndPin || stickActions ? "end" : undefined}
              style={edgeHeadStyle("end", hasEndPin || stickActions)}
              className={cx(classNames.headerCell, classNames.actionsHeader)}
            >
              {labels.actions}
            </th>
          )}
        </tr>
      </thead>
      <tbody data-adapttable-part="tbody" className={classNames.tbody}>
        {paddingTop > 0 && (
          <tr
            role="presentation"
            data-adapttable-part="virtual-spacer"
            className={classNames.virtualSpacer}
          >
            <td
              colSpan={columnSpan}
              style={{ height: paddingTop, padding: 0 }}
            />
          </tr>
        )}
        {grouping
          ? grouping.entries.map((entry) => {
              if (entry.kind === "group") {
                return (
                  <GroupHeaderRow
                    key={entry.key}
                    entry={entry}
                    columnSpan={columnSpan}
                    selection={selection}
                    labels={labels}
                    classNames={classNames}
                    onToggleCollapse={onToggleGroup}
                  />
                );
              }
              const id = getRowId(entry.row);
              return (
                <Row
                  key={entry.key}
                  row={entry.row}
                  index={entry.index}
                  id={id}
                  table={table}
                  columns={columns}
                  labels={labels}
                  classNames={classNames}
                  selected={selection ? selection.isSelected(id) : undefined}
                  expanded={
                    expansionState ? expansionState.isExpanded(id) : undefined
                  }
                  showActions={showActions}
                  rowActions={rowActions}
                  confirm={confirm}
                  columnSpan={columnSpan}
                  columnWidths={columnWidths}
                  pinOffset={pinOffset}
                  pinSignature={pinSignature}
                  hasStartPin={hasStartPin}
                  hasEndPin={hasEndPin}
                  actionsPinned={stickActions}
                  rowClass={rowClassName?.(entry.row, entry.index)}
                  clickable={Boolean(onRowClick)}
                  hasPrefetch={Boolean(prefetch)}
                  onRowClick={handleRowClick}
                  onPrefetch={handlePrefetch}
                  onToggleSelect={onToggleSelect}
                  onToggleExpand={onToggleExpand}
                  renderDetail={renderDetail}
                  measureElement={measureElement}
                  editing={editing}
                  rows={rows}
                  getRowId={getRowId}
                  editingSignature={rowEditingSignature(editing, id)}
                />
              );
            })
          : entries.map(({ row, index, key }) => {
              const id = getRowId(row);
              return (
                <Row
                  key={key}
                  row={row}
                  index={index}
                  id={id}
                  table={table}
                  columns={columns}
                  labels={labels}
                  classNames={classNames}
                  selected={selection ? selection.isSelected(id) : undefined}
                  expanded={
                    expansionState ? expansionState.isExpanded(id) : undefined
                  }
                  showActions={showActions}
                  rowActions={rowActions}
                  confirm={confirm}
                  columnSpan={columnSpan}
                  columnWidths={columnWidths}
                  pinOffset={pinOffset}
                  pinSignature={pinSignature}
                  hasStartPin={hasStartPin}
                  hasEndPin={hasEndPin}
                  actionsPinned={stickActions}
                  rowClass={rowClassName?.(row, index)}
                  clickable={Boolean(onRowClick)}
                  hasPrefetch={Boolean(prefetch)}
                  onRowClick={handleRowClick}
                  onPrefetch={handlePrefetch}
                  onToggleSelect={onToggleSelect}
                  onToggleExpand={onToggleExpand}
                  renderDetail={renderDetail}
                  measureElement={measureElement}
                  editing={editing}
                  rows={rows}
                  getRowId={getRowId}
                  editingSignature={rowEditingSignature(editing, id)}
                />
              );
            })}
        {paddingBottom > 0 && (
          <tr
            role="presentation"
            data-adapttable-part="virtual-spacer"
            className={classNames.virtualSpacer}
          >
            <td
              colSpan={columnSpan}
              style={{ height: paddingBottom, padding: 0 }}
            />
          </tr>
        )}
      </tbody>
      {summary && (
        <tfoot data-adapttable-part="summary" className={classNames.summary}>
          <tr
            data-adapttable-part="summary-row"
            className={classNames.summaryRow}
          >
            {expandable && summaryPad}
            {selection && summaryPad}
            {columns.map((column) => (
              <td
                key={column.key}
                data-adapttable-part="summary-cell"
                className={classNames.summaryCell}
              >
                {summary[column.key]}
              </td>
            ))}
            {showActions && summaryPad}
          </tr>
        </tfoot>
      )}
    </table>
  );

  // The wrapper ALWAYS renders so the overflow hook has an element to
  // measure, but it gains a scroll style only when something needs one: a
  // pinned column (which needs a horizontal scroll container to stick to), a
  // table measurably wider than its container, or a bounding `maxHeight`.
  // While the table fits, the wrapper carries NO overflow style — see
  // `scrollBoxStyle` for the page-scroll sticky-header trap that avoids.
  return (
    <div
      ref={(node) => {
        overflowRef(node);
        virtualScrollRef?.(node);
      }}
      data-adapttable-part="scroll-box"
      className={classNames.scrollBox}
      style={scrollBoxStyle(maxHeight, hasPinned || overflowing)}
    >
      {tableEl}
    </div>
  );
}

/** Per-card inputs for the memoized {@link MobileCardBase}. */
interface MobileCardProps<TRow> {
  row: TRow;
  index: number;
  /** Stable row id (selection / expansion key). */
  id: string;
  columns: ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  confirm: ConfirmHandler;
  rowActions?: RowAction<TRow>[];
  classNames: DataTableClassNames;
  /** Resolved `rowClassName(row, index)`, compared as a plain string. */
  className?: string;
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
}

/** The card props the memo comparator deliberately skips (see `editing`). */
type UncomparedCardProp = "editing" | "rows" | "getRowId";

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
  "classNames",
  "className",
  "selected",
  "expanded",
  "onToggleSelect",
  "onToggleExpand",
  "renderDetail",
  "onRowClick",
  "measureElement",
  "clickable",
  "editingSignature",
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
  classNames,
  className,
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
}: Readonly<MobileCardProps<TRow>>) {
  return (
    <li
      {...rowClickProps(row, onRowClick, index)}
      ref={measureElement}
      data-index={index}
      data-adapttable-part="card"
      data-stagger=""
      data-selected={selected ? "" : undefined}
      data-clickable={clickable ? "" : undefined}
      className={cx(classNames.card, className)}
    >
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
      {columns.map((column) => (
        <div
          key={column.key}
          data-adapttable-part="card-row"
          className={classNames.cardRow}
        >
          <span
            data-adapttable-part="card-label"
            className={classNames.cardLabel}
          >
            {cardLabel(column)}
          </span>
          <span
            data-adapttable-part="card-value"
            className={classNames.cardValue}
          >
            <EditableDataCell
              activateClassName={classNames.editCellActivate}
              editorClassName={classNames.editCellEditor}
              editing={editing}
              row={row}
              column={column}
              rowId={id}
              rows={rows}
              columns={columns}
              rowKey={getRowId}
              editLabel={labels.editCell}
              display={
                column.Cell ? (
                  <column.Cell row={row} rowIndex={index} />
                ) : (
                  column.accessor?.(row)
                )
              }
            />
          </span>
        </div>
      ))}
      {rowActions && rowActions.length > 0 && (
        <div
          data-adapttable-part="card-actions"
          className={classNames.cardActions}
        >
          <RowActionButtons
            row={row}
            actions={rowActions}
            confirm={confirm}
            cancelLabel={labels.cancel}
            classNames={classNames}
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
  renderRowDetail,
  summaryRow,
  expansion,
  editing,
  grouping,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
}: Readonly<SharedProps<TRow>>) {
  const { columns, selection, labels } = table;
  const entries = resolveVirtualRows(rows, getRowId, rowEntries);
  const expansionState = renderRowDetail ? expansion : undefined;
  const summary = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () => memo(MobileCardBase<TRow>, mobileCardPropsEqual),
    []
  );

  const renderCard = (row: TRow, index: number, key: string): ReactElement => {
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
        classNames={classNames}
        className={rowClassName?.(row, index)}
        selected={selection ? selection.isSelected(id) : false}
        expanded={expansionState ? expansionState.isExpanded(id) : false}
        onToggleSelect={selection ? selection.toggle : undefined}
        onToggleExpand={expansionState ? expansionState.toggle : undefined}
        renderDetail={renderRowDetail}
        onRowClick={onRowClick}
        measureElement={measureElement}
        clickable={Boolean(onRowClick)}
        editing={editing}
        rows={rows}
        getRowId={getRowId}
        editingSignature={rowEditingSignature(editing, id)}
      />
    );
  };

  return (
    <ul
      {...table.getTableProps({ role: undefined })}
      data-adapttable-part="cards"
      className={classNames.cards}
      // No `list-style: none` here: Safari/VoiceOver strips list semantics
      // from such lists. Markers are suppressed per-item with display:block.
      style={{ margin: 0, padding: 0 }}
    >
      {paddingTop > 0 && (
        <li
          aria-hidden
          data-adapttable-part="virtual-spacer"
          className={classNames.virtualSpacer}
          style={{ display: "block", height: paddingTop }}
        />
      )}
      {grouping
        ? grouping.entries.map((entry) =>
            entry.kind === "group" ? (
              <li key={entry.key} style={{ display: "block" }}>
                <GroupHeaderCard
                  entry={entry}
                  selection={selection}
                  labels={labels}
                  classNames={classNames}
                  onToggleCollapse={(key) => grouping.collapsed.toggle(key)}
                />
              </li>
            ) : (
              renderCard(entry.row, entry.index, entry.key)
            )
          )
        : entries.map(({ row, index, key }) => renderCard(row, index, key))}
      {paddingBottom > 0 && (
        <li
          aria-hidden
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
                <span
                  data-adapttable-part="card-label"
                  className={classNames.cardLabel}
                >
                  {cardLabel(column)}
                </span>
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

function sortGlyph(active: boolean, dir: "asc" | "desc" | undefined): string {
  if (!active) return "↕";
  return dir === "asc" ? "↑" : "↓";
}

function cardLabel<TRow>(column: ColumnDef<TRow>): string {
  return (
    column.mobileLabel ??
    (typeof column.header === "string" ? column.header : column.key)
  );
}
