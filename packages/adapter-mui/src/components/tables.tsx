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
  useHorizontalOverflow,
  useSummaryCells,
} from "@adapttable/core";
import type { ReactElement, ReactNode } from "react";
import { memo, useCallback, useMemo, useRef } from "react";

/** Sx for an absolutely-positioned column-resize handle. */
const RESIZE_HANDLE_SX = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: 8,
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
} as const;
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  Stack,
  type SxProps,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  type Theme,
  Tooltip,
  Typography,
} from "@mui/material";

import { EditableDataCell } from "./EditableCell";
import { GroupHeaderCard, GroupHeaderRow } from "./GroupHeader";

/** Map a destructive colour token to MUI's `"error"` palette, else default. */
function muiColor(color: string | undefined): "default" | "error" {
  return color === "danger" || color === "red" || color === "error"
    ? "error"
    : "default";
}

interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  size: "small" | "medium";
  /** Class applied to every mobile card (merged before `rowClassName`). */
  cardClassName?: string;
  /** Text direction — flips the collapsed expand chevron under RTL. */
  dir?: "ltr" | "rtl";
  /**
   * End-pin the trailing actions column on its own (the reserved "actions"
   * layout key pinned right from the Columns menu) — independent of whether
   * any DATA column is pinned right. Desktop only; cards have no columns.
   */
  actionsPinned?: boolean;
}

/** Width (px) of the leading expand-chevron column (MUI's checkbox cell). */
const EXPAND_WIDTH = 48;

/**
 * Identity-stable dispatcher for `selection.toggle` / `expansion.toggle`.
 * `selection.toggle` is recreated whenever the selection changes, so handing
 * it straight to a memoized row would either defeat the memo (if compared)
 * or go stale (if not — in the controlled mode it computes from the captured
 * set). This wrapper never changes identity and always dispatches to the
 * CURRENT target, so skipped rows still toggle against fresh state.
 */
export function useStableToggle(
  target: { toggle: (id: string) => void } | null | undefined
): (id: string) => void {
  // Latest-ref pattern (same as core's useFilterOptions): a render-time
  // write so the callback reads whatever target the last render supplied.
  const ref = useRef(target);
  ref.current = target;
  return useCallback((id: string) => ref.current?.toggle(id), []);
}

/** Inline chevron pointing at the reading end; rotates down when open. */
function ExpandChevron({
  expanded,
  dir,
}: Readonly<{ expanded: boolean; dir?: "ltr" | "rtl" }>) {
  let transform: string | undefined;
  if (expanded) transform = "rotate(90deg)";
  else if (dir === "rtl") transform = "rotate(180deg)";
  return (
    <Box
      component="span"
      aria-hidden
      sx={{ display: "inline-flex", transition: "transform 150ms", transform }}
    >
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Box>
  );
}

/** The per-row expand/collapse chevron button (desktop cell + mobile card). */
function ExpandToggle({
  id,
  expanded,
  onToggle,
  dir,
  expandLabel,
  collapseLabel,
}: Readonly<{
  id: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  dir?: "ltr" | "rtl";
  expandLabel: string;
  collapseLabel: string;
}>) {
  return (
    <IconButton
      size="small"
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={() => onToggle(id)}
    >
      <ExpandChevron expanded={expanded} dir={dir} />
    </IconButton>
  );
}

/**
 * Logical (RTL-aware) `text-align` for a column. Applied via `sx` rather
 * than MUI's physical `align` prop so `"end"` follows the writing direction
 * (right in LTR, left in RTL).
 */
function muiAlign(
  align: ColumnDef<unknown>["align"]
): "start" | "center" | "end" {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

function RowActionButtons<TRow>({
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
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
      {actions.map((action) => {
        if (action.isHidden?.(row)) return null;
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        return (
          <Tooltip key={action.key} title={reason ?? action.label}>
            <span>
              <IconButton
                size="small"
                color={muiColor(action.color)}
                disabled={disabled}
                aria-label={action.label}
                onClick={
                  // The disabled attribute already blocks activation, so
                  // attach the handler only when the action can run.
                  disabled
                    ? undefined
                    : (e) => {
                        e.stopPropagation();
                        runRowAction(action, row, confirm, cancelLabel);
                      }
                }
              >
                {action.icon ?? (
                  <Typography variant="caption">{action.label}</Typography>
                )}
              </IconButton>
            </span>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

/**
 * Per-render-stable sx for the memoized desktop row. Built once per
 * `DesktopTable` render (memoized on the pin/width/column inputs), so the
 * row comparator can treat one object identity as "the cell styling".
 */
interface DesktopRowSx {
  /** Body-cell sx by column key (pin stickiness + logical text-align). */
  cells: Readonly<Record<string, SxProps<Theme>>>;
  /** Leading expand-chevron cell (edge-pinned alongside left data pins). */
  expand?: SxProps<Theme>;
  /** Leading selection cell (edge-pinned just past the expand column). */
  selection?: SxProps<Theme>;
  /** Trailing actions cell (edge-pinned, end-aligned). */
  actions: SxProps<Theme>;
}

interface DesktopRowProps<TRow> {
  /* Visual inputs — compared by the memo (see DESKTOP_ROW_COMPARED). */
  row: TRow;
  index: number;
  selected: boolean;
  expanded: boolean;
  columns: ColumnDef<TRow>[];
  sx: DesktopRowSx;
  /** Full spacer span, INCLUDING the expand column when present. */
  columnSpan: number;
  size: "small" | "medium";
  dir?: "ltr" | "rtl";
  className?: string;
  hasSelection: boolean;
  hasExpansion: boolean;
  showActions: boolean;
  selectRowLabel: string;
  cancelLabel: string;
  expandLabel: string;
  collapseLabel: string;
  /* Stable wiring — excluded from the comparison (identity-stable, or at
     least latest-dispatching via useStableToggle), so a skipped row never
     holds a stale handler. */
  id: string;
  rowActions?: RowAction<TRow>[];
  confirm: ConfirmHandler;
  renderRowDetail?: (row: TRow) => ReactNode;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onRowClick?: (row: TRow) => void;
  prefetch?: (row: TRow) => void;
  measureElement?: (element: Element | null) => void;
  editLabel: string;
  editing: EditableCellEditing<TRow> | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
}

/**
 * The visual inputs a desktop row re-renders for. Deliberately NOT the
 * per-render `table` object or the handler props: handlers are stable (or
 * latest-dispatching wrappers), and everything that changes what the row
 * LOOKS like is listed here — row identity, selection/expansion flags,
 * density, column set, the precomputed sx map (pins + widths), the
 * rowClassName output, and direction.
 */
const DESKTOP_ROW_COMPARED: readonly (keyof DesktopRowProps<unknown>)[] = [
  "row",
  "index",
  "selected",
  "expanded",
  "columns",
  "sx",
  "columnSpan",
  "size",
  "dir",
  "className",
  "hasSelection",
  "hasExpansion",
  "showActions",
  "selectRowLabel",
  "cancelLabel",
  "expandLabel",
  "collapseLabel",
  "editLabel",
  "editingSignature",
];

function desktopRowPropsAreEqual(
  prev: DesktopRowProps<unknown>,
  next: DesktopRowProps<unknown>
): boolean {
  return DESKTOP_ROW_COMPARED.every((key) => prev[key] === next[key]);
}

function DesktopRowImpl<TRow>({
  row,
  index,
  selected,
  expanded,
  columns,
  sx,
  columnSpan,
  dir,
  className,
  hasSelection,
  hasExpansion,
  showActions,
  selectRowLabel,
  cancelLabel,
  expandLabel,
  collapseLabel,
  id,
  rowActions,
  confirm,
  renderRowDetail,
  onToggleSelect,
  onToggleExpand,
  onRowClick,
  prefetch,
  measureElement,
  editLabel,
  editing,
  rows,
  getRowId,
}: Readonly<DesktopRowProps<TRow>>) {
  return (
    <>
      <TableRow
        {...rowClickProps(row, onRowClick)}
        className={className}
        data-stagger=""
        ref={measureElement}
        data-index={index}
        hover
        selected={selected}
        onMouseEnter={prefetch ? () => prefetch(row) : undefined}
      >
        {hasExpansion && (
          <TableCell padding="checkbox" sx={sx.expand}>
            <ExpandToggle
              id={id}
              expanded={expanded}
              onToggle={onToggleExpand}
              dir={dir}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
            />
          </TableCell>
        )}
        {hasSelection && (
          <TableCell padding="checkbox" sx={sx.selection}>
            <Checkbox
              slotProps={{ input: { "aria-label": selectRowLabel } }}
              checked={selected}
              onChange={() => onToggleSelect(id)}
            />
          </TableCell>
        )}
        {columns.map((column) => (
          <TableCell key={column.key} sx={sx.cells[column.key]}>
            <EditableDataCell
              editing={editing}
              row={row}
              column={column}
              rowId={id}
              rowIndex={index}
              rows={rows}
              columns={columns}
              rowKey={getRowId}
              editLabel={editLabel}
            />
          </TableCell>
        ))}
        {showActions && (
          <TableCell sx={sx.actions}>
            <RowActionButtons
              row={row}
              actions={rowActions!}
              confirm={confirm}
              cancelLabel={cancelLabel}
            />
          </TableCell>
        )}
      </TableRow>
      {expanded && (
        <TableRow>
          {/* `expanded` is only ever true when a detail renderer exists
              (DesktopTable derives it from `expansion && renderRowDetail`). */}
          <TableCell colSpan={columnSpan}>{renderRowDetail!(row)}</TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * Memoized desktop row: a search keystroke (or any chrome re-render) must
 * not re-run every cell accessor, and toggling one row's checkbox must
 * re-render only that row. The cast restores the generic signature `memo`
 * erases.
 */
const DesktopRow = memo(
  DesktopRowImpl,
  desktopRowPropsAreEqual
) as typeof DesktopRowImpl;

/** Desktop MUI table. */
export function DesktopTable<TRow>({
  table,
  rows,
  rowActions,
  confirm,
  getRowId,
  size,
  dir,
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
  // Core's span already counts the expand column (it sees `renderRowDetail`
  // + `expansion`), so spacer and detail rows use `columnSpan` as-is.
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
  // Presentational header groups: contiguous visible columns sharing a
  // `group` merge into one spanning cell; `null` means no second header row.
  const groupRow = headerGroupRow(columns);
  // Footer summary cells for the CURRENT rows, keyed by column key.
  const summaryCells = useSummaryCells(summaryRow, rows);
  // Expansion is active only when BOTH halves arrived (the chrome supplies
  // `expansion` exactly when `renderRowDetail` is set).
  const isExpanded =
    expansion && renderRowDetail ? expansion.isExpanded : undefined;
  const expandActive = isExpanded !== undefined;
  const onToggleSelect = useStableToggle(selection);
  const onToggleExpand = useStableToggle(expansion);
  const groupingRef = useRef(grouping);
  groupingRef.current = grouping;
  const onToggleGroup = useCallback(
    (groupKey: string) => groupingRef.current?.collapsed.toggle(groupKey),
    []
  );
  // `position: sticky` on a `<thead>` does not pin against the document
  // scroller, so we stick the header *cells* instead. Pinned cells also stick
  // left/right (corner-sticky in the header) with an opaque background.
  // Inside a maxHeight scroll box the box itself is the sticky context, so
  // the header pins to ITS top — a viewport offset would float it mid-box.
  const hasPinned =
    actionsPinned || table.columns.some((c) => pinOffset?.(c.key) != null);
  // Measured (ResizeObserver) horizontal overflow: with no maxHeight and no
  // pins, the wrapper only becomes a scroll container when the table is
  // actually wider than it — an unconditional `overflowX: auto` would trap
  // the page-scroll sticky header even when everything fits.
  const overflow = useHorizontalOverflow<HTMLDivElement>();
  // ANY scroll container (maxHeight, pins, measured overflow) is the sticky
  // context: pin to ITS top, not a viewport offset.
  const inScrollBox = maxHeight != null || hasPinned || overflow.overflowing;
  const headSx = stickyHeader
    ? {
        position: "sticky" as const,
        top: inScrollBox ? 0 : stickyTop,
        zIndex: PIN_Z.header,
        bgcolor: "background.paper",
      }
    : undefined;
  // The leading expand (48px) + checkbox (48px) and trailing actions (120px)
  // columns pin to the edge alongside the data columns, which therefore
  // start past them.
  const selectionWidth = 48;
  const actionsWidth = 120;
  const leadStart =
    (expandActive ? EXPAND_WIDTH : 0) + (selection ? selectionWidth : 0);
  const leadEnd = showActions ? actionsWidth : 0;
  const leads: PinLeads = { start: leadStart, end: leadEnd };
  // The selection cell itself sits past the expand column when both pin.
  const selectionLead = expandActive ? EXPAND_WIDTH : 0;
  const hasStartPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "start"
  );
  const hasEndPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "end"
  );
  // The actions cells stick to the inline end when a data column is pinned
  // right (so it never scrolls under them) OR when the actions column itself
  // is pinned from the Columns menu — one click, no data pin required.
  const stickActions = hasEndPin || actionsPinned;
  // Built with conditional spreads so no key is ever `undefined` — that keeps
  // the object assignable to MUI's strict `sx` index signature with no cast.
  const headCellSx = (column: ColumnDef<TRow>) => {
    const pin = pinnedCellStyle(
      pinOffset?.(column.key),
      PIN_Z.headerPinned,
      leads
    );
    // A pinned column renders at the width its sticky inset assumed, so
    // stacked pins stay flush even with no declared width.
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : (columnWidths?.[column.key] ?? column.width);
    // The resize handle is absolute; an un-pinned/un-sticky cell still needs a
    // positioning context for it.
    const needsRelative = Boolean(setWidth) && !headSx && !pin;
    return {
      ...headSx,
      ...(pin && { ...pin, bgcolor: "background.paper" }),
      ...(needsRelative && { position: "relative" as const }),
      textAlign: muiAlign(column.align),
      ...(width != null && { width }),
    };
  };
  // The expand / checkbox / actions cells pin to their edge when a data
  // column on that side is pinned (corner-sticky in the header). `lead`
  // shifts the selection cell past a pinned expand column.
  const edgeHeadSx = (side: "start" | "end", active: boolean, lead = 0) => {
    const pin = edgePinStyle(side, active, PIN_Z.headerPinned);
    return {
      ...headSx,
      ...(pin && { ...pin, bgcolor: "background.paper" }),
      ...(pin && lead > 0 && { insetInlineStart: lead }),
    };
  };
  // One identity per pin/width layout: the memoized rows treat this object
  // as "the cell styling", so it must only change when the layout does.
  const rowSx = useMemo<DesktopRowSx>(() => {
    const edge = (side: "start" | "end", active: boolean, lead = 0) => {
      const pin = edgePinStyle(side, active, PIN_Z.body);
      if (!pin) return undefined;
      return {
        ...pin,
        ...(lead > 0 && { insetInlineStart: lead }),
        bgcolor: "background.paper",
      };
    };
    const cells: Record<string, SxProps<Theme>> = {};
    for (const column of columns) {
      const pin = pinnedCellStyle(pinOffset?.(column.key), PIN_Z.body, {
        start: leadStart,
        end: leadEnd,
      });
      cells[column.key] = {
        ...(pin && { ...pin, bgcolor: "background.paper" }),
        textAlign: muiAlign(column.align),
      };
    }
    return {
      cells,
      expand: edge("start", hasStartPin),
      selection: edge("start", hasStartPin, selectionLead),
      actions: { ...edge("end", stickActions), textAlign: "end" },
    };
  }, [
    columns,
    pinOffset,
    leadStart,
    leadEnd,
    hasStartPin,
    stickActions,
    selectionLead,
  ]);

  let boxSx: SxProps<Theme> | undefined;
  if (maxHeight != null) {
    boxSx = { maxHeight, overflow: "auto" };
  } else if (hasPinned || overflow.overflowing) {
    boxSx = { overflowX: "auto" };
  }
  // Fixed-width columns get a real table min-width (their sum), so the table
  // overflows and scrolls horizontally instead of squishing columns to fit.
  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra: leadStart + leadEnd,
  });

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        overflow.ref(node);
        virtualScrollRef?.(node);
      }}
      sx={boxSx}
    >
      <Table
        size={size}
        aria-label={table.getTableProps()["aria-label"]}
        sx={minWidth > 0 ? { minWidth } : undefined}
      >
        <TableHead>
          {groupRow && (
            // Decorative group row. It deliberately skips the sticky `headSx`
            // treatment: sticking both header rows at the same `top` would
            // overlap them, so only the sortable header row pins.
            <TableRow>
              {expandActive && <TableCell padding="checkbox" />}
              {selection && <TableCell padding="checkbox" />}
              {groupRow.map((cell) => (
                <TableCell
                  key={cell.key}
                  colSpan={cell.span}
                  sx={{ textAlign: "center", fontWeight: 600 }}
                >
                  {cell.label}
                </TableCell>
              ))}
              {showActions && <TableCell />}
            </TableRow>
          )}
          <TableRow>
            {expandActive && (
              <TableCell
                padding="checkbox"
                sx={edgeHeadSx("start", hasStartPin)}
              />
            )}
            {selection && (
              <TableCell
                padding="checkbox"
                sx={edgeHeadSx("start", hasStartPin, selectionLead)}
              >
                <Checkbox
                  slotProps={{ input: { "aria-label": labels.selectAll } }}
                  checked={selection.headerState === "all"}
                  indeterminate={selection.headerState === "some"}
                  onChange={selection.toggleAll}
                />
              </TableCell>
            )}
            {columns.map((column) => {
              const headerCellProps = table.getHeaderCellProps(column);
              // Core reports aria-sort="none" for sortable-but-inactive
              // columns so screen readers announce them as sortable — and it
              // is chain-aware, covering every multi-sort level too.
              const ariaSort = headerCellProps["aria-sort"] as
                | "ascending"
                | "descending"
                | "none"
                | undefined;
              const active =
                ariaSort === "ascending" || ariaSort === "descending";
              // 1-based multi-sort chain position, when the column is in it.
              const sortIndex = headerCellProps["data-sort-index"];
              return (
                <TableCell
                  key={column.key}
                  aria-sort={ariaSort}
                  data-sort-index={sortIndex}
                  sx={headCellSx(column)}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={active}
                      direction={ariaSort === "descending" ? "desc" : "asc"}
                      // Core's handler, with the REAL click event passed
                      // through: it reads `shiftKey` to chain the column when
                      // `multiSort` is on, else single-sorts as before.
                      onClick={table.getSortButtonProps(column).onClick}
                    >
                      {column.header}
                      {sortIndex !== undefined && (
                        <Box component="span" sx={{ fontSize: 10, ml: 0.5 }}>
                          {sortIndex}
                        </Box>
                      )}
                    </TableSortLabel>
                  ) : (
                    column.header
                  )}
                  {setWidth && (
                    <Box
                      component="span"
                      sx={RESIZE_HANDLE_SX}
                      {...columnResizeHandleProps(
                        column.key,
                        setWidth,
                        `${resizeLabel}: ${
                          typeof column.header === "string"
                            ? column.header
                            : column.key
                        }`
                      )}
                    />
                  )}
                </TableCell>
              );
            })}
            {showActions && (
              <TableCell
                sx={{ ...edgeHeadSx("end", stickActions), textAlign: "end" }}
              >
                {labels.actions}
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {paddingTop > 0 && (
            <TableRow aria-hidden>
              <TableCell
                colSpan={columnSpan}
                sx={{ height: paddingTop, p: 0 }}
              />
            </TableRow>
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
                  <DesktopRow
                    key={entry.key}
                    row={entry.row}
                    index={entry.index}
                    selected={selection?.isSelected(id) ?? false}
                    expanded={isExpanded ? isExpanded(id) : false}
                    columns={columns}
                    sx={rowSx}
                    columnSpan={columnSpan}
                    size={size}
                    dir={dir}
                    className={rowClassName?.(entry.row, entry.index)}
                    hasSelection={Boolean(selection)}
                    hasExpansion={expandActive}
                    showActions={showActions}
                    selectRowLabel={labels.selectRow}
                    cancelLabel={labels.cancel}
                    expandLabel={labels.expandRow}
                    collapseLabel={labels.collapseRow}
                    id={id}
                    rowActions={rowActions}
                    confirm={confirm}
                    renderRowDetail={renderRowDetail}
                    onToggleSelect={onToggleSelect}
                    onToggleExpand={onToggleExpand}
                    onRowClick={onRowClick}
                    prefetch={prefetch}
                    measureElement={measureElement}
                    editLabel={labels.editCell}
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
                  <DesktopRow
                    key={key}
                    row={row}
                    index={index}
                    selected={selection?.isSelected(id) ?? false}
                    expanded={isExpanded ? isExpanded(id) : false}
                    columns={columns}
                    sx={rowSx}
                    columnSpan={columnSpan}
                    size={size}
                    dir={dir}
                    className={rowClassName?.(row, index)}
                    hasSelection={Boolean(selection)}
                    hasExpansion={expandActive}
                    showActions={showActions}
                    selectRowLabel={labels.selectRow}
                    cancelLabel={labels.cancel}
                    expandLabel={labels.expandRow}
                    collapseLabel={labels.collapseRow}
                    id={id}
                    rowActions={rowActions}
                    confirm={confirm}
                    renderRowDetail={renderRowDetail}
                    onToggleSelect={onToggleSelect}
                    onToggleExpand={onToggleExpand}
                    onRowClick={onRowClick}
                    prefetch={prefetch}
                    measureElement={measureElement}
                    editLabel={labels.editCell}
                    editing={editing}
                    rows={rows}
                    getRowId={getRowId}
                    editingSignature={rowEditingSignature(editing, id)}
                  />
                );
              })}
          {paddingBottom > 0 && (
            <TableRow aria-hidden>
              <TableCell
                colSpan={columnSpan}
                sx={{ height: paddingBottom, p: 0 }}
              />
            </TableRow>
          )}
        </TableBody>
        {summaryCells && (
          <TableFooter>
            <TableRow>
              {expandActive && <TableCell padding="checkbox" />}
              {selection && <TableCell padding="checkbox" />}
              {columns.map((column) => (
                // One cell per column keeps the summary aligned under its
                // column; keys absent from the result render empty cells.
                <TableCell
                  key={column.key}
                  sx={{ textAlign: muiAlign(column.align) }}
                >
                  {summaryCells[column.key]}
                </TableCell>
              ))}
              {showActions && <TableCell />}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Box>
  );
}

function mobileLabel<TRow>(column: ColumnDef<TRow>): string {
  return (
    column.mobileLabel ??
    (typeof column.header === "string" ? column.header : column.key)
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
  "className",
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
  className,
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
}: Readonly<MobileCardProps<TRow>>) {
  return (
    <Card
      ref={measureElement}
      data-index={index}
      data-stagger=""
      variant="outlined"
      role="listitem"
      className={className}
      {...rowClickProps(row, onRowClick)}
    >
      <CardContent
        sx={compact ? { p: 1.25, "&:last-child": { pb: 1.25 } } : undefined}
      >
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
        {columns.map((column) => (
          <Box key={column.key} sx={{ mb: compact ? 0.5 : 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {mobileLabel(column)}
            </Typography>
            {/* Cells are arbitrary ReactNode (often block elements) —
                a <p> wrapper would be invalid HTML. */}
            <Typography component="div" variant="body2">
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
              />
            </Typography>
          </Box>
        ))}
        {rowActions && rowActions.length > 0 && (
          <RowActionButtons
            row={row}
            actions={rowActions}
            confirm={confirm}
            cancelLabel={labels.cancel}
          />
        )}
        {expanded && renderDetail && (
          // Inside the card — and therefore inside the measured element —
          // so virtualization keeps accurate card heights.
          <Box sx={{ mt: 1 }}>{renderDetail(row)}</Box>
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
  confirm,
  getRowId,
  size,
  dir,
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
        className={
          [cardClassName, rowClassName?.(row, index)]
            .filter(Boolean)
            .join(" ") || undefined
        }
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
      />
    );
  };

  return (
    <Stack
      spacing={compact ? 1 : 1.5}
      role="list"
      aria-label={table.getTableProps()["aria-label"]}
    >
      {paddingTop > 0 && <Box aria-hidden sx={{ height: paddingTop }} />}
      {grouping
        ? grouping.entries.map((entry) =>
            entry.kind === "group" ? (
              <GroupHeaderCard
                key={entry.key}
                entry={entry}
                selection={selection}
                labels={labels}
                compact={compact}
                onToggleCollapse={(key) => grouping.collapsed.toggle(key)}
              />
            ) : (
              renderCard(entry.row, entry.index, entry.key)
            )
          )
        : entries.map(({ row, index, key }) => renderCard(row, index, key))}
      {summaryCells && (
        <Card variant="outlined" role="listitem">
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {mobileLabel(column)}
                  </Typography>
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
