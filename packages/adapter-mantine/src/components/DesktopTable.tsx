import {
  type ColumnDef,
  columnResizeHandleProps,
  type ConfirmHandler,
  edgePinStyle,
  type EditableCellEditing,
  PIN_Z,
  pinnedCellStyle,
  type RowAction,
  runRowAction,
  tableMinWidth,
  type UseDataTableResult,
  useHorizontalOverflow,
} from "@adapttable/core";
import {
  headerGroupRow,
  type PinLeads,
  pinnedColumnWidth,
  resolveDisabledReason,
  rowClickProps,
  rowEditingSignature,
  type SharedTableRenderProps,
  tableRenderModel,
  useSummaryCells,
} from "@adapttable/core/adapter";
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Table,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import type { CSSProperties, MouseEvent, ReactNode, RefObject } from "react";
import { memo, useCallback, useMemo, useRef } from "react";

import { type Density, DENSITY_SPACING } from "../density";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import { GroupHeaderRow } from "./GroupHeader";

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

import { ChevronDownIcon, ChevronUpIcon, SelectorIcon } from "../icons";

/**
 * Props for {@link DesktopTable}: the shared render contract from core
 * (minus `stickyTop` — the resolved `stickyHeaderOffset` replaces it) plus
 * the Mantine-specific extras.
 */
export interface DesktopTableProps<TRow> extends Omit<
  SharedTableRenderProps<TRow>,
  "stickyTop"
> {
  bodyRef: RefObject<HTMLTableSectionElement | null>;
  className?: string;
  /** Resolved sticky-header top inset (page `stickyTop` + toolbar height). */
  stickyHeaderOffset?: number;
  /** The injected actions column is pinned to the inline end on its own. */
  actionsPinned?: boolean;
  density?: Density;
}

function SortIcon({
  active,
  dir,
}: Readonly<{
  active: boolean;
  dir: "asc" | "desc" | undefined;
}>) {
  if (!active) return <SelectorIcon size={12} />;
  return dir === "asc" ? (
    <ChevronUpIcon size={12} />
  ) : (
    <ChevronDownIcon size={12} />
  );
}

function HeaderCell<TRow>({
  table,
  column,
  stickyStyle,
  resizeHandle,
}: Readonly<{
  table: UseDataTableResult<TRow>;
  column: ColumnDef<TRow>;
  stickyStyle: CSSProperties;
  resizeHandle?: ReactNode;
}>) {
  const cellProps = table.getHeaderCellProps(column);
  const headerStyle = {
    ...cellProps.style,
    ...stickyStyle,
  };
  if (!column.sortable) {
    return (
      <Table.Th {...cellProps} style={headerStyle}>
        {column.header}
        {resizeHandle}
      </Table.Th>
    );
  }
  // Core's onClick receives the click event as-is (no zero-arg wrapper), so
  // shift-clicks reach the multi-sort branch inside `getSortButtonProps`.
  const buttonProps = table.getSortButtonProps(column);
  // 1-based chain position from core (always > 0 when defined) — drives the
  // multi-sort badge; the chain level also wins the icon's active/dir state,
  // because chaining clears the single-sort `sortBy`.
  const sortIndex = buttonProps["data-sort-index"];
  const level = table.source.sortLevels.find((l) => l.key === column.key);
  const active = level !== undefined || table.sortBy === column.key;
  return (
    <Table.Th {...cellProps} style={headerStyle}>
      <Group
        component="button"
        gap={6}
        wrap="nowrap"
        display="inline-flex"
        style={{
          background: "none",
          border: 0,
          cursor: "pointer",
          font: "inherit",
          padding: 0,
          color: active ? "var(--mantine-primary-color-filled)" : "inherit",
        }}
        {...buttonProps}
      >
        <span>{column.header}</span>
        <SortIcon active={active} dir={level?.dir ?? table.sortDir} />
        {typeof sortIndex === "number" && (
          <Badge component="span" size="xs" variant="light">
            {sortIndex}
          </Badge>
        )}
      </Group>
      {resizeHandle}
    </Table.Th>
  );
}

function RowActions<TRow>({
  row,
  actions,
  confirm,
  cancelLabel,
}: Readonly<{
  row: TRow;
  actions: RowAction<TRow>[];
  confirm: ConfirmHandler;
  cancelLabel: string;
}>) {
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
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
        // Icon-only actions render as an ActionIcon; without an icon, fall
        // back to a text button so the label is actually visible.
        return action.icon ? (
          <Tooltip
            key={action.key}
            label={reason ?? action.label}
            withArrow
            openDelay={200}
          >
            <ActionIcon
              variant="subtle"
              color={action.color}
              size="sm"
              disabled={disabled}
              aria-label={action.label}
              onClick={handleClick}
            >
              {action.icon}
            </ActionIcon>
          </Tooltip>
        ) : (
          <Button
            key={action.key}
            variant="subtle"
            color={action.color}
            size="compact-sm"
            disabled={disabled}
            onClick={handleClick}
          >
            {action.label}
          </Button>
        );
      })}
    </Group>
  );
}

/**
 * Props for the memoized {@link DesktopRowBase}. Everything the row's visual
 * output depends on is a primitive, a stable identity, or is fingerprinted
 * by `pinSignature` — so {@link desktopRowPropsEqual} can hold the row
 * across unrelated table re-renders (search keystrokes, other rows'
 * selection) without ever capturing a stale event handler.
 */
interface DesktopRowProps<TRow> {
  row: TRow;
  /** Absolute row index (virtual windows keep source indices). */
  index: number;
  /** Stable row id from `getRowId`. */
  id: string;
  columns: ColumnDef<TRow>[];
  /** Core's cell prop-getter — identity-stable for the table's lifetime. */
  getCellProps: UseDataTableResult<TRow>["getCellProps"];
  /** Selected state; `undefined` when selection is off (no checkbox cell). */
  selected?: boolean;
  selectLabel: string;
  /** Identity-stable select toggle (latest-ref wrapped in the parent). */
  onToggleSelect: (id: string) => void;
  /** Expanded state; `undefined` when expansion is off (no chevron cell). */
  expanded?: boolean;
  expandLabel: string;
  collapseLabel: string;
  /** Core's expansion toggle — identity-stable. */
  onToggleExpand?: (id: string) => void;
  renderRowDetail?: (row: TRow) => ReactNode;
  /** Detail-cell span: expansion + selection + data + actions columns. */
  columnSpan: number;
  rowActions?: RowAction<TRow>[];
  confirm: ConfirmHandler;
  cancelLabel: string;
  editLabel: string;
  onRowClick?: (row: TRow) => void;
  prefetch?: (row: TRow) => void;
  /** Resolved `rowClassName(row, index)` output. */
  className?: string;
  measureElement?: (element: Element | null) => void;
  /** Pinned-cell style for a data column (output covered by `pinSignature`). */
  pinStyleFor: (key: string) => CSSProperties | undefined;
  selectionCellStyle?: CSSProperties;
  expansionCellStyle?: CSSProperties;
  actionsCellStyle?: CSSProperties;
  /** Fingerprint of the pin layout, compared instead of the styles above. */
  pinSignature: string;
  editing: EditableCellEditing<TRow> | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
}

/**
 * The style-ish props the comparator deliberately skips: they are rebuilt
 * every parent render, and their visual output is exactly determined by
 * `pinSignature` (plus the compared inputs) — comparing their identities
 * would only defeat the memo.
 */
type UncomparedRowProp =
  | "pinStyleFor"
  | "selectionCellStyle"
  | "expansionCellStyle"
  | "actionsCellStyle"
  | "editing"
  | "rows"
  | "getRowId";

/** Every row prop the memo comparator checks with `Object.is`. */
const COMPARED_ROW_PROPS: readonly Exclude<
  keyof DesktopRowProps<unknown>,
  UncomparedRowProp
>[] = [
  "row",
  "index",
  "id",
  "columns",
  "getCellProps",
  "selected",
  "selectLabel",
  "onToggleSelect",
  "expanded",
  "expandLabel",
  "collapseLabel",
  "onToggleExpand",
  "renderRowDetail",
  "columnSpan",
  "rowActions",
  "confirm",
  "cancelLabel",
  "editLabel",
  "onRowClick",
  "prefetch",
  "className",
  "measureElement",
  "pinSignature",
  "editingSignature",
];

/**
 * Row memo comparator: `Object.is` over every prop except the per-render
 * style derivations excluded above. All event handlers passed to the row
 * are identity-stable (or compared here, so a changed handler re-renders
 * the row and is captured fresh) — a held row can never fire a stale
 * closure.
 */
function desktopRowPropsEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return COMPARED_ROW_PROPS.every((key) => Object.is(prev[key], next[key]));
}

/**
 * Sticky style for a leading chrome cell (chevron / checkbox) pinned
 * `inset` px past the inline-start edge, active only while a data column is
 * pinned on that side. Body cells pass a `background` so scrolled data
 * never shows through.
 */
function leadingPinStyle(
  active: boolean,
  inset: number,
  zIndex: number,
  background?: string
): CSSProperties | undefined {
  if (!active) return undefined;
  const style = pinnedCellStyle({ side: "start", inset }, zIndex);
  return background ? { ...style, background } : style;
}

/**
 * Visual fingerprint of the pin layout (sides, insets, edge-pinned chrome
 * columns). Memoized rows compare this one string instead of the per-render
 * style objects derived from it.
 */
function pinLayoutSignature<TRow>(
  columns: readonly ColumnDef<TRow>[],
  pinOffset: SharedTableRenderProps<TRow>["pinOffset"],
  hasStartPin: boolean,
  actionsEdgePinned: boolean
): string {
  const perColumn = columns.map((column) => {
    const pin = pinOffset?.(column.key);
    return pin ? `${column.key}:${pin.side}${pin.inset}` : column.key;
  });
  return `${perColumn.join("|")}|${String(hasStartPin)}|${String(actionsEdgePinned)}`;
}

/**
 * One desktop row (plus its detail row when expanded), extracted so it can
 * be memoized: typing in the search box or toggling another row's checkbox
 * re-renders the table chrome but leaves untouched rows alone.
 */
function DesktopRowBase<TRow>({
  row,
  index,
  id,
  columns,
  getCellProps,
  selected,
  selectLabel,
  onToggleSelect,
  expanded,
  expandLabel,
  collapseLabel,
  onToggleExpand,
  renderRowDetail,
  columnSpan,
  rowActions,
  confirm,
  cancelLabel,
  editLabel,
  onRowClick,
  prefetch,
  className,
  measureElement,
  pinStyleFor,
  selectionCellStyle,
  expansionCellStyle,
  actionsCellStyle,
  editing,
  rows,
  getRowId,
}: Readonly<DesktopRowProps<TRow>>) {
  const showActions = (rowActions?.length ?? 0) > 0;
  return (
    <>
      <Table.Tr
        role="row"
        data-index={index}
        aria-selected={selected}
        {...rowClickProps(row, onRowClick, index)}
        className={className}
        ref={measureElement}
        data-stagger=""
        onMouseEnter={prefetch ? () => prefetch(row) : undefined}
      >
        {expanded !== undefined && (
          <Table.Td ta="center" style={expansionCellStyle}>
            <ExpandToggle
              expanded={expanded}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
              onToggle={() => onToggleExpand!(id)}
            />
          </Table.Td>
        )}
        {selected !== undefined && (
          <Table.Td ta="center" style={selectionCellStyle}>
            <Checkbox
              aria-label={selectLabel}
              checked={selected}
              onChange={() => onToggleSelect(id)}
            />
          </Table.Td>
        )}
        {columns.map((column) => (
          <Table.Td
            key={column.key}
            {...getCellProps(column)}
            style={pinStyleFor(column.key)}
          >
            <EditableDataCell
              editing={editing}
              row={row}
              column={column}
              rowId={id}
              rows={rows}
              columns={columns}
              rowKey={getRowId}
              editLabel={editLabel}
              display={
                column.Cell ? (
                  <column.Cell row={row} rowIndex={index} />
                ) : (
                  column.accessor?.(row)
                )
              }
            />
          </Table.Td>
        ))}
        {showActions && (
          <Table.Td ta="end" style={actionsCellStyle}>
            <RowActions
              row={row}
              actions={rowActions!}
              confirm={confirm}
              cancelLabel={cancelLabel}
            />
          </Table.Td>
        )}
      </Table.Tr>
      {expanded === true && (
        <Table.Tr>
          <Table.Td colSpan={columnSpan}>{renderRowDetail!(row)}</Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

/** Desktop table rendering driven by core prop-getters. */
export function DesktopTable<TRow>({
  table,
  rows,
  rowActions,
  confirm,
  prefetch,
  onRowClick,
  rowClassName,
  renderRowDetail,
  summaryRow,
  expansion,
  editing,
  grouping,
  getRowId,
  bodyRef,
  className,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
  stickyHeaderOffset = 0,
  stickyHeader = false,
  pinOffset,
  maxHeight,
  virtualScrollRef,
  setWidth,
  columnWidths,
  resizeLabel = "Resize column",
  actionsPinned = false,
  density = "comfortable",
}: Readonly<DesktopTableProps<TRow>>) {
  // The shared render prelude from core — including `columnSpan` for the
  // spacer/detail cells, which counts the expansion column itself when
  // `renderRowDetail` + `expansion` are wired.
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
  // Expansion state only exists when `renderRowDetail` is set (the chrome
  // couples them), so its presence alone decides the leading chevron column.
  const expandable = expansion !== undefined;
  // Grouped header row over the VISIBLE columns (`null` → no extra row) and
  // the per-column footer summary cells (`undefined` → no footer).
  const groupCells = headerGroupRow(columns);
  const summaryCells = useSummaryCells(summaryRow, rows);
  const hasEndPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "end"
  );
  // The actions column sticks to the inline end either because a data column
  // is pinned right (it must stay outermost past it) or because the user
  // pinned the actions column itself — one click, no data column involved.
  const actionsEdgePinned = showActions && (hasEndPin || actionsPinned);
  const hasPinned =
    table.columns.some((c) => pinOffset?.(c.key) != null) || actionsEdgePinned;
  // Pinning needs horizontal scroll, and a `maxHeight` needs vertical scroll;
  // either makes the wrapper a scroll container (setting one overflow axis to
  // `auto` computes the other to `auto` too). Inside that container the page
  // toolbar is irrelevant, so the sticky header sticks to the box top (0).
  // Only against the document scroller must it clear the toolbar via
  // `stickyHeaderOffset`.
  // Without a `maxHeight`, the wrapper becomes a horizontal scroller only
  // when it must: pinned columns always need one, otherwise only while the
  // table is measurably wider than the wrapper (so wide tables scroll instead
  // of bleeding over the card border). When the table fits, the wrapper stays
  // a NON-scroll container — any `overflow` would trap the page-scroll sticky
  // header inside it.
  const { ref: wrapperRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();
  const inScrollBox = maxHeight != null || hasPinned || overflowing;
  // `position: sticky` on `<thead>` does not engage against the document
  // scroller (only inside an overflow container) — so we stick the header
  // *cells* instead. Each th carries its own opaque background so scrolled
  // rows never show through.
  const headerCellStyle: CSSProperties = stickyHeader
    ? {
        position: "sticky",
        top: inScrollBox ? 0 : stickyHeaderOffset,
        zIndex: PIN_Z.header,
        background: "var(--mantine-color-body)",
        boxShadow: "0 1px 0 var(--mantine-color-default-border)",
      }
    : { background: "var(--mantine-color-body)" };

  // The leading chevron (36px) + checkbox (40px) and trailing actions
  // (120px) columns pin to the edge alongside the data columns, which
  // therefore start past them.
  const expansionWidth = 36;
  const selectionWidth = 40;
  const actionsWidth = 120;
  const expansionLead = expandable ? expansionWidth : 0;
  const leads: PinLeads = {
    start: expansionLead + (selection ? selectionWidth : 0),
    end: showActions ? actionsWidth : 0,
  };
  const hasStartPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "start"
  );

  // Pinned cells stick to the left/right edge (corner-sticky in the header,
  // which also sticks to the top). They need an opaque background.
  const pinBg = "var(--mantine-color-body)";
  const headerStyleFor = (column: ColumnDef<TRow>): CSSProperties => {
    const key = column.key;
    const pin = pinnedCellStyle(pinOffset?.(key), PIN_Z.headerPinned, leads);
    const merged: CSSProperties = {
      ...headerCellStyle,
      ...pin,
      // A pinned column renders at the same width its sticky inset assumed,
      // so stacked pins stay flush even with no declared width.
      width: pin
        ? pinnedColumnWidth(column, columnWidths)
        : columnWidths?.[key],
    };
    if (setWidth && !merged.position) merged.position = "relative";
    return merged;
  };
  // The chevron / checkbox / actions cells become corner-sticky (top + edge
  // in the header, edge in the body) when a data column on their side is
  // pinned. The checkbox column sits AFTER the chevron column, so its edge
  // inset starts past the chevron's width.
  const expansionHeaderStyle: CSSProperties = {
    ...headerCellStyle,
    ...leadingPinStyle(hasStartPin, 0, PIN_Z.headerPinned),
  };
  const selectionHeaderStyle: CSSProperties = {
    ...headerCellStyle,
    ...leadingPinStyle(hasStartPin, expansionLead, PIN_Z.headerPinned),
  };
  const actionsHeaderStyle: CSSProperties = {
    ...headerCellStyle,
    ...edgePinStyle("end", actionsEdgePinned, PIN_Z.headerPinned),
  };
  const edgeBodyStyle = (
    side: "start" | "end",
    active: boolean
  ): CSSProperties | undefined => {
    const pin = edgePinStyle(side, active, PIN_Z.body);
    return pin ? { ...pin, background: pinBg } : undefined;
  };
  const expansionCellStyle = leadingPinStyle(hasStartPin, 0, PIN_Z.body, pinBg);
  const selectionCellStyle = leadingPinStyle(
    hasStartPin,
    expansionLead,
    PIN_Z.body,
    pinBg
  );
  const actionsCellStyle = edgeBodyStyle("end", actionsEdgePinned);
  const columnName = (column: ColumnDef<TRow>): string =>
    typeof column.header === "string" ? column.header : column.key;
  const resizeHandleFor = (column: ColumnDef<TRow>): ReactNode =>
    setWidth ? (
      <span
        {...columnResizeHandleProps(
          column.key,
          setWidth,
          `${resizeLabel}: ${columnName(column)}`
        )}
        style={RESIZE_HANDLE_STYLE}
      />
    ) : undefined;
  const bodyPinStyle = (key: string): CSSProperties | undefined => {
    const pin = pinnedCellStyle(pinOffset?.(key), PIN_Z.body, leads);
    return pin ? { ...pin, background: pinBg } : undefined;
  };

  const { verticalSpacing, horizontalSpacing } = DENSITY_SPACING[density];

  // Fixed-width columns get a real table min-width (their sum), so the table
  // overflows and scrolls horizontally instead of squishing columns to fit.
  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra: expansionLead + (selection ? 40 : 0) + (showActions ? 120 : 0),
  });

  // Latest-ref select toggle: the controlled selection mode rebuilds
  // `selection.toggle` around the current ids on every change, so memoized
  // rows hold this FIXED identity that always dispatches to the live one.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const groupingRef = useRef(grouping);
  groupingRef.current = grouping;
  const toggleSelect = useCallback(
    (id: string) => selectionRef.current!.toggle(id),
    []
  );
  const onToggleGroup = useCallback(
    (groupKey: string) => groupingRef.current?.collapsed.toggle(groupKey),
    []
  );

  // `memo` erases generics at module level, so the memoized row is
  // instantiated here (once — the identity is stable for the table's life).
  const Row = useMemo(
    () => memo(DesktopRowBase<TRow>, desktopRowPropsEqual),
    []
  );

  const pinSignature = pinLayoutSignature(
    columns,
    pinOffset,
    hasStartPin,
    actionsEdgePinned
  );
  const wrapperStyle: CSSProperties =
    maxHeight == null
      ? {
          width: "100%",
          ...(hasPinned || overflowing ? { overflowX: "auto" } : {}),
        }
      : { width: "100%", maxHeight, overflow: "auto" };

  return (
    <div
      ref={(node) => {
        wrapperRef(node);
        virtualScrollRef?.(node);
      }}
      style={wrapperStyle}
    >
      <Table
        {...table.getTableProps()}
        className={className}
        highlightOnHover
        verticalSpacing={verticalSpacing}
        horizontalSpacing={horizontalSpacing}
        miw={Math.max(480, minWidth)}
        // Chromium cannot stick a <th> inside a border-collapsed table, so
        // the sticky header opts into separate borders — visually identical
        // here because row separators are cell border-bottoms either way.
        style={
          stickyHeader
            ? { borderCollapse: "separate", borderSpacing: 0 }
            : undefined
        }
      >
        <Table.Thead style={{ background: "var(--mantine-color-body)" }}>
          {groupCells && (
            <Table.Tr>
              {expandable && <Table.Th />}
              {selection && <Table.Th />}
              {groupCells.map((cell) => (
                <Table.Th
                  key={cell.key}
                  colSpan={cell.span}
                  ta="center"
                  fw={600}
                  style={{
                    borderBottom:
                      "1px solid var(--mantine-color-default-border)",
                  }}
                >
                  {cell.label}
                </Table.Th>
              ))}
              {showActions && <Table.Th />}
            </Table.Tr>
          )}
          <Table.Tr {...table.getHeaderRowProps()}>
            {expandable && (
              <Table.Th
                w={expansionWidth}
                ta="center"
                style={expansionHeaderStyle}
              >
                <VisuallyHidden>{labels.expandRow}</VisuallyHidden>
              </Table.Th>
            )}
            {selection && (
              <Table.Th
                w={selectionWidth}
                ta="center"
                style={selectionHeaderStyle}
              >
                <Checkbox
                  aria-label={labels.selectAll}
                  checked={selection.headerState === "all"}
                  indeterminate={selection.headerState === "some"}
                  onChange={selection.toggleAll}
                />
              </Table.Th>
            )}
            {columns.map((column) => (
              <HeaderCell
                key={column.key}
                table={table}
                column={column}
                stickyStyle={headerStyleFor(column)}
                resizeHandle={resizeHandleFor(column)}
              />
            ))}
            {showActions && (
              <Table.Th ta="end" w={actionsWidth} style={actionsHeaderStyle}>
                {labels.actions}
              </Table.Th>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody ref={bodyRef}>
          {paddingTop > 0 && (
            <Table.Tr aria-hidden>
              <Table.Td
                colSpan={columnSpan}
                style={{ height: paddingTop, padding: 0 }}
              />
            </Table.Tr>
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
                    columns={columns}
                    getCellProps={table.getCellProps}
                    selected={selection?.isSelected(id)}
                    selectLabel={labels.selectRow}
                    onToggleSelect={toggleSelect}
                    expanded={expansion?.isExpanded(id)}
                    expandLabel={labels.expandRow}
                    collapseLabel={labels.collapseRow}
                    onToggleExpand={expansion?.toggle}
                    renderRowDetail={renderRowDetail}
                    columnSpan={columnSpan}
                    rowActions={rowActions}
                    confirm={confirm}
                    cancelLabel={labels.cancel}
                    editLabel={labels.editCell}
                    onRowClick={onRowClick}
                    prefetch={prefetch}
                    className={rowClassName?.(entry.row, entry.index)}
                    measureElement={measureElement}
                    pinStyleFor={bodyPinStyle}
                    selectionCellStyle={selectionCellStyle}
                    expansionCellStyle={expansionCellStyle}
                    actionsCellStyle={actionsCellStyle}
                    pinSignature={pinSignature}
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
                    columns={columns}
                    getCellProps={table.getCellProps}
                    selected={selection?.isSelected(id)}
                    selectLabel={labels.selectRow}
                    onToggleSelect={toggleSelect}
                    expanded={expansion?.isExpanded(id)}
                    expandLabel={labels.expandRow}
                    collapseLabel={labels.collapseRow}
                    onToggleExpand={expansion?.toggle}
                    renderRowDetail={renderRowDetail}
                    columnSpan={columnSpan}
                    rowActions={rowActions}
                    confirm={confirm}
                    cancelLabel={labels.cancel}
                    editLabel={labels.editCell}
                    onRowClick={onRowClick}
                    prefetch={prefetch}
                    className={rowClassName?.(row, index)}
                    measureElement={measureElement}
                    pinStyleFor={bodyPinStyle}
                    selectionCellStyle={selectionCellStyle}
                    expansionCellStyle={expansionCellStyle}
                    actionsCellStyle={actionsCellStyle}
                    pinSignature={pinSignature}
                    editing={editing}
                    rows={rows}
                    getRowId={getRowId}
                    editingSignature={rowEditingSignature(editing, id)}
                  />
                );
              })}
          {paddingBottom > 0 && (
            <Table.Tr aria-hidden>
              <Table.Td
                colSpan={columnSpan}
                style={{ height: paddingBottom, padding: 0 }}
              />
            </Table.Tr>
          )}
        </Table.Tbody>
        {summaryCells && (
          <Table.Tfoot>
            <Table.Tr>
              {expandable && <Table.Td />}
              {selection && <Table.Td />}
              {columns.map((column) => (
                <Table.Td
                  key={column.key}
                  {...table.getCellProps(column)}
                  fw={600}
                  c="dimmed"
                >
                  {summaryCells[column.key]}
                </Table.Td>
              ))}
              {showActions && <Table.Td />}
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </div>
  );
}
