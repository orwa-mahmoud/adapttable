import {
  type ColumnDef,
  columnResizeHandleProps,
  type ConfirmHandler,
  type Direction,
  ExpandChevron,
  headerGroupRow,
  logicalAlign,
  PIN_Z,
  type PinLeads,
  pinnedColumnWidth,
  pinnedDataCellStyle,
  pinnedEdgeCellStyle,
  type PinOffset,
  type PinSide,
  resolveDisabledReason,
  resolveVirtualRows,
  type RowAction,
  rowClickProps,
  type RowExpansionState,
  runRowAction,
  type SelectionState,
  shallowEqualByKeys,
  SHARED_DESKTOP_ROW_KEYS,
  type SharedTableRenderProps,
  sortArrow,
  type TableLabels,
  tableMinWidth,
  tableRenderModel,
  useHorizontalOverflow,
} from "@adapttable/core";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
} from "react";

import type { BaseUiAccentColor } from "../types";
import { Box, Button, Card, Flex, IconButton, Table, Text } from "../ui";
import { Checkbox, Tooltip } from "./primitives";

/** Table sizes mirror the chrome/footer scale (compact → "1"). */
type TableSize = "1" | "2" | "3";

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

/** Width (px) reserved for the leading expand-chevron column. */
const EXPANSION_WIDTH = 32;

/** Opaque background for sticky/pinned cells (the panel surface). */
const PIN_BG = "var(--adapttable-surface, Canvas)";

/**
 * Ensure pinned columns stick against our scroll wrapper via a min-width
 * custom property on the wrapper.
 */
const STICKY_FIX_CLASS = "adapttable-base-ui-scroll";
const STICKY_FIX_CSS = `.${STICKY_FIX_CLASS} table{overflow:visible;min-width:var(--adapttable-min-width,0)}`;

interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  /** Class hook for the table (desktop) / each card (mobile). */
  className?: string;
  size: TableSize;
  accentColor?: BaseUiAccentColor;
  /** Text direction — flips the expand chevron for RTL. */
  dir?: Direction;
  /**
   * The injected actions column is end-pinned (via the Columns menu), so
   * its cells stick to the inline end even with zero data columns pinned.
   */
  actionsPinned?: boolean;
}

/** Join the static class hook with a conditional per-row class. */
function joinClasses(
  base: string | undefined,
  extra: string | undefined
): string | undefined {
  if (base && extra) return `${base} ${extra}`;
  return base ?? extra;
}

/** Map a column's alignment onto a cell `justify` value. */
const justifyFor = logicalAlign;

/**
 * Header sort indicator, derived from the cell's computed `aria-sort` so a
 * multi-sort chain level shows its own direction, not the single-sort one.
 * The trailing U+FE0E forces text (not emoji) presentation — Base UI's font
 * forces text (not emoji) presentation.
 */
const sortGlyph = (sort: unknown): string => sortArrow(sort) + "\uFE0E";

/**
 * Pinned data-cell style with an opaque background. A raw `style` keeps the
 * pixel insets the core layout computes from being mangled by any prop scale.
 */
const pinCellStyle = (pin: PinOffset | undefined, z: number, leads: PinLeads) =>
  pinnedDataCellStyle(pin, z, leads, PIN_BG);

/** Sticky edge-cell style (chevron / selection / actions) over that background. */
const edgeCellStyle = (side: PinSide, active: boolean, z: number, shift = 0) =>
  pinnedEdgeCellStyle(side, active, z, PIN_BG, shift);

/** Chevron toggle for a row's detail panel. */
function ExpandToggle({
  open,
  dir,
  labels,
  onToggle,
}: Readonly<{
  open: boolean;
  dir?: Direction;
  labels: Pick<Required<TableLabels>, "expandRow" | "collapseRow">;
  onToggle: () => void;
}>) {
  return (
    <IconButton
      size="1"
      variant="ghost"
      color="gray"
      aria-expanded={open}
      aria-label={open ? labels.collapseRow : labels.expandRow}
      onClick={onToggle}
    >
      <ExpandChevron open={open} dir={dir} />
    </IconButton>
  );
}

function RowActionButtons<TRow>({
  row,
  actions,
  confirm,
  cancelLabel,
  accentColor,
}: Readonly<{
  row: TRow;
  actions: RowAction<TRow>[];
  confirm: ConfirmHandler;
  cancelLabel: string;
  accentColor?: BaseUiAccentColor;
}>) {
  return (
    <Flex gap="1" justify="end">
      {actions.map((action) => {
        if (action.isHidden?.(row)) return null;
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        // The disabled attribute already blocks activation, so attach the
        // handler only when the action can run.
        const handleClick = disabled
          ? undefined
          : (e: React.MouseEvent) => {
              e.stopPropagation();
              runRowAction(action, row, confirm, cancelLabel);
            };
        // Icon-only actions use IconButton (with a tooltip for the name); text
        // actions use a real Button so the label renders (IconButton renders
        // only the icon child).
        return action.icon ? (
          <Tooltip key={action.key} label={reason ?? action.label}>
            <IconButton
              size="1"
              variant="ghost"
              color={accentColor ?? "gray"}
              disabled={disabled}
              aria-label={action.label}
              onClick={handleClick}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip key={action.key} label={reason ?? action.label}>
            <Button
              size="1"
              variant="ghost"
              color={accentColor}
              disabled={disabled}
              onClick={handleClick}
            >
              {action.label}
            </Button>
          </Tooltip>
        );
      })}
    </Flex>
  );
}

/**
 * Everything a memoized desktop row reads through ONE identity-stable ref: the
 * latest callbacks and pin geometry. Routing them through the ref (read at
 * event/render time) keeps a changed callback identity from re-rendering every
 * row, without ever calling a stale closure.
 */
interface DesktopRowApi<TRow> {
  selection: SelectionState | null;
  expansion?: RowExpansionState;
  rowActions?: RowAction<TRow>[];
  confirm: ConfirmHandler;
  onRowClick?: (row: TRow) => void;
  prefetch?: (row: TRow) => void;
  renderRowDetail?: (row: TRow) => ReactNode;
  pinOffset?: (key: string) => PinOffset | undefined;
  measureElement?: (element: Element | null) => void;
  leads: PinLeads;
  hasStartPin: boolean;
  /** Actions cells stick: a data column is right-pinned OR actions are end-pinned. */
  actionsStick: boolean;
}

/** The visual inputs of one desktop row — exactly what the memo compares. */
interface DesktopRowProps<TRow> {
  row: TRow;
  id: string;
  index: number;
  selected: boolean;
  expanded: boolean;
  size: TableSize;
  accentColor?: BaseUiAccentColor;
  dir?: Direction;
  columns: ColumnDef<TRow>[];
  columnWidths?: Readonly<Record<string, number>>;
  /** Serialized pin geometry — stands in for the `pinOffset` closure. */
  pinSignature: string;
  /** The `rowClassName(row, index)` output, compared as a plain string. */
  className?: string;
  labels: Required<TableLabels>;
  hasSelection: boolean;
  expandable: boolean;
  showActions: boolean;
  hasRowClick: boolean;
  /** Spacer/detail colSpan (selection + data + actions + expansion). */
  columnSpan: number;
  /** Identity-stable ref to the latest callbacks — see {@link DesktopRowApi}. */
  api: RefObject<DesktopRowApi<TRow>>;
  /** Identity-stable ref-callback forwarding to the virtualizer's measure. */
  measureRef: (element: HTMLTableRowElement | null) => void;
}

/**
 * The props {@link desktopRowPropsEqual} compares. `api` and `measureRef` are
 * deliberately absent: both are identity-stable by construction, and a row must
 * never re-render because some callback's identity changed.
 */
const ROW_VISUAL_KEYS = [
  ...SHARED_DESKTOP_ROW_KEYS,
  "accentColor",
] as const satisfies readonly (keyof DesktopRowProps<unknown>)[];

/** Re-render a row only when one of its visual inputs changes. */
function desktopRowPropsEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return shallowEqualByKeys(ROW_VISUAL_KEYS, prev, next);
}

/** One desktop row (+ its detail panel row while expanded). */
function DesktopRowBase<TRow>({
  row,
  id,
  index,
  selected,
  expanded,
  accentColor,
  dir,
  columns,
  className,
  labels,
  hasSelection,
  expandable,
  showActions,
  hasRowClick,
  columnSpan,
  api,
  measureRef,
}: Readonly<DesktopRowProps<TRow>>) {
  // Render-time geometry reads the latest ref values: whenever they change, a
  // compared prop (pinSignature / hasSelection / …) changes with them.
  const live = api.current;
  const activateRow = (r: TRow): void => {
    api.current.onRowClick?.(r);
  };
  return (
    <>
      <Table.Row
        {...rowClickProps(row, hasRowClick ? activateRow : undefined)}
        ref={measureRef}
        data-index={index}
        data-stagger=""
        className={className}
        style={{ background: selected ? "var(--gray-a3)" : undefined }}
        onMouseEnter={() => api.current.prefetch?.(row)}
      >
        {expandable && (
          <Table.Cell
            style={edgeCellStyle("start", live.hasStartPin, PIN_Z.body)}
          >
            <ExpandToggle
              open={expanded}
              dir={dir}
              labels={labels}
              onToggle={() => api.current.expansion?.toggle(id)}
            />
          </Table.Cell>
        )}
        {hasSelection && (
          <Table.Cell
            style={edgeCellStyle(
              "start",
              live.hasStartPin,
              PIN_Z.body,
              expandable ? EXPANSION_WIDTH : 0
            )}
          >
            <Checkbox
              aria-label={labels.selectRow}
              checked={selected}
              onToggle={() => api.current.selection?.toggle(id)}
            />
          </Table.Cell>
        )}
        {columns.map((column) => (
          <Table.Cell
            key={column.key}
            justify={justifyFor(column.align)}
            style={pinCellStyle(live.pinOffset?.(column.key), 1, live.leads)}
          >
            {column.Cell ? (
              <column.Cell row={row} rowIndex={index} />
            ) : (
              column.accessor?.(row)
            )}
          </Table.Cell>
        ))}
        {showActions && (
          <Table.Cell
            justify="end"
            style={edgeCellStyle("end", live.actionsStick, PIN_Z.body)}
          >
            <RowActionButtons
              row={row}
              actions={live.rowActions!}
              confirm={live.confirm}
              cancelLabel={labels.cancel}
              accentColor={accentColor}
            />
          </Table.Cell>
        )}
      </Table.Row>
      {expandable && expanded && (
        <Table.Row>
          <Table.Cell colSpan={columnSpan}>
            {api.current.renderRowDetail?.(row)}
          </Table.Cell>
        </Table.Row>
      )}
    </>
  );
}

/**
 * Materialize the memoized row for one TRow. React 18's `memo` typing drops a
 * generic component's type parameter, so each `DesktopTable` instantiates the
 * memo for its own row type (zero casts, full type safety).
 */
function createDesktopRow<TRow>() {
  return memo(DesktopRowBase<TRow>, desktopRowPropsEqual<TRow>);
}

/** Desktop Base UI table. */
export function DesktopTable<TRow>({
  table,
  rows,
  rowActions,
  confirm,
  getRowId,
  size,
  accentColor,
  dir,
  prefetch,
  onRowClick,
  rowClassName,
  renderRowDetail,
  summaryRow,
  expansion,
  className,
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
  // Core's render model counts the expansion column in `columnSpan` when
  // `renderRowDetail` + `expansion` arrive (the chrome builds them together),
  // so spacer and detail rows span it without local `+ 1` math.
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
  const expandable = expansion !== undefined;
  const groups = headerGroupRow(columns);
  const summary = summaryRow?.(rows);
  // End-pinned actions count as a pin too: sticking them needs the wrapper to
  // be the horizontal scroll container, exactly like a pinned data column.
  const hasPinned =
    actionsPinned || table.columns.some((c) => pinOffset?.(c.key) != null);
  // With no maxHeight and no pins the wrapper must stay a NON-scroll container
  // so page-scroll sticky headers keep working — but a table wider than the
  // card would then bleed past it. Measure, and scroll only on real overflow.
  const { ref: overflowRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();
  // ANY scroll container (maxHeight, pins, measured overflow) becomes the
  // sticky context: the header must pin to ITS top — a viewport offset would
  // shove it down into the rows.
  const inScrollBox = maxHeight != null || hasPinned || overflowing;

  const selectionWidth = 48;
  const actionsWidth = 120;
  const leads: PinLeads = {
    start:
      (expandable ? EXPANSION_WIDTH : 0) + (selection ? selectionWidth : 0),
    end: showActions ? actionsWidth : 0,
  };
  const hasStartPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "start"
  );
  const hasEndPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "end"
  );
  // The actions cells stick flush to the inline end when a data column is
  // pinned right (so it can't slide beneath them) OR when the actions column
  // itself is end-pinned from the Columns menu — independently, in one click.
  const actionsStick = hasEndPin || actionsPinned;
  // Add the sticky-top offset onto an (optionally pinned) header-cell style.
  const stickify = (
    base: CSSProperties | undefined
  ): CSSProperties | undefined => {
    if (!stickyHeader) return base;
    const top = inScrollBox ? 0 : stickyTop;
    if (base?.position === "sticky") return { ...base, top };
    return {
      ...base,
      position: "sticky",
      top,
      zIndex: PIN_Z.header,
      background: PIN_BG,
    };
  };
  // Header-cell style merging pin + user width; the resize handle is absolute,
  // so add a positioning context when the cell is not already sticky/pinned.
  const headCellStyle = (
    column: ColumnDef<TRow>
  ): CSSProperties | undefined => {
    const key = column.key;
    const pin = pinCellStyle(pinOffset?.(key), PIN_Z.headerPinned, leads);
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : columnWidths?.[key];
    if (!pin && width == null && !setWidth) return stickify(undefined);
    const style: CSSProperties = { ...pin };
    if (width != null) style.width = width;
    if (setWidth && !stickyHeader && !pin) style.position = "relative";
    return stickify(style);
  };
  const columnName = (column: ColumnDef<TRow>): string =>
    typeof column.header === "string" ? column.header : column.key;

  // Fixed-width columns get a real table min-width (their sum), so the table
  // overflows and scrolls horizontally instead of squishing columns to fit.
  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra:
      (expandable ? EXPANSION_WIDTH : 0) +
      (selection ? selectionWidth : 0) +
      (showActions ? actionsWidth : 0),
  });

  // The memoized row reads everything non-visual through this single ref,
  // re-assigned every render so event handlers always see the latest values
  // without their identity ever becoming a compared prop.
  const rowApi: DesktopRowApi<TRow> = {
    selection,
    expansion,
    rowActions,
    confirm,
    onRowClick,
    prefetch,
    renderRowDetail,
    pinOffset,
    measureElement,
    leads,
    hasStartPin,
    actionsStick,
  };
  const api = useRef(rowApi);
  api.current = rowApi;
  const measureRef = useCallback((element: HTMLTableRowElement | null) => {
    api.current.measureElement?.(element);
  }, []);
  // One memoized row component per table instance — see createDesktopRow.
  const Row = useMemo(() => createDesktopRow<TRow>(), []);
  // `pinOffset` is a fresh closure whenever the layout changes, so rows compare
  // this serialized pin geometry instead of a function identity. The actions
  // edge is part of the geometry: end-pinning the actions column must re-render
  // the memoized rows so their actions cells turn sticky.
  const pinSignature = [
    actionsStick ? "actions:end" : "",
    ...columns.map((column) => {
      const pin = pinOffset?.(column.key);
      return pin ? `${column.key}:${pin.side}:${pin.inset}` : "";
    }),
  ].join("|");

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        overflowRef(node);
        virtualScrollRef?.(node);
        // Feed STICKY_FIX_CSS the fixed-column min-width as a custom property
        // (React's CSSProperties type rejects `--*` keys, so set it directly):
        // it lands on the table so pinned/edge sticky cells stick against the wrapper.
        node?.style.setProperty(
          "--adapttable-min-width",
          minWidth > 0 ? `${minWidth}px` : "0"
        );
      }}
      className={STICKY_FIX_CLASS}
      style={{
        maxHeight: maxHeight == null ? undefined : `${maxHeight}px`,
        overflowX:
          maxHeight != null || hasPinned || overflowing ? "auto" : undefined,
        overflowY: maxHeight == null ? undefined : "auto",
      }}
    >
      {/* See STICKY_FIX_CSS: push min-width onto the table so pinning sticks. */}
      <style>{STICKY_FIX_CSS}</style>
      <Table.Root
        size={size}
        variant="surface"
        data-size={size}
        className={className}
        aria-label={table.getTableProps()["aria-label"]}
      >
        <Table.Header>
          {groups && (
            <Table.Row>
              {expandable && <Table.ColumnHeaderCell />}
              {selection && <Table.ColumnHeaderCell />}
              {groups.map((cell) => (
                <Table.ColumnHeaderCell
                  key={cell.key}
                  colSpan={cell.span}
                  justify="center"
                >
                  {cell.label}
                </Table.ColumnHeaderCell>
              ))}
              {showActions && <Table.ColumnHeaderCell />}
            </Table.Row>
          )}
          <Table.Row>
            {expandable && (
              <Table.ColumnHeaderCell
                aria-label={labels.expandRow}
                style={stickify(
                  edgeCellStyle("start", hasStartPin, PIN_Z.headerPinned)
                )}
              />
            )}
            {selection && (
              <Table.ColumnHeaderCell
                style={stickify(
                  edgeCellStyle(
                    "start",
                    hasStartPin,
                    PIN_Z.headerPinned,
                    expandable ? EXPANSION_WIDTH : 0
                  )
                )}
              >
                <Checkbox
                  aria-label={labels.selectAll}
                  checked={selection.headerState === "all"}
                  indeterminate={selection.headerState === "some"}
                  onToggle={selection.toggleAll}
                />
              </Table.ColumnHeaderCell>
            )}
            {columns.map((column) => {
              const ariaSort = table.getHeaderCellProps(column)["aria-sort"] as
                | "ascending"
                | "descending"
                | "none"
                | undefined;
              // Core's sort onClick receives the click EVENT: with `multiSort` a
              // shift-click cycles the column through the sort chain while a
              // plain click keeps single-sorting.
              const sortButton = table.getSortButtonProps(column);
              const sortClick = sortButton.onClick;
              const sortIndex = sortButton["data-sort-index"];
              return (
                <Table.ColumnHeaderCell
                  key={column.key}
                  justify={justifyFor(column.align)}
                  aria-sort={ariaSort}
                  style={headCellStyle(column)}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="adapttable-sort-btn"
                      style={{
                        cursor: "pointer",
                        font: "inherit",
                        color: "inherit",
                        background: "none",
                        border: 0,
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                      aria-label={`${labels.sortBy}: ${columnName(column)}`}
                      onClick={sortClick}
                    >
                      {column.header}
                      <Text as="span" aria-hidden>
                        {sortGlyph(ariaSort)}
                      </Text>
                      {sortIndex !== undefined && (
                        <Text
                          as="span"
                          aria-hidden
                          data-sort-index={sortIndex}
                          size="1"
                          weight="bold"
                          ml="1"
                          style={{
                            borderRadius: "9999px",
                            padding: "0 0.4em",
                            background: "var(--gray-a3)",
                          }}
                        >
                          {sortIndex}
                        </Text>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                  {setWidth && (
                    <span
                      style={RESIZE_HANDLE_STYLE}
                      {...columnResizeHandleProps(
                        column.key,
                        setWidth,
                        `${resizeLabel}: ${columnName(column)}`
                      )}
                    />
                  )}
                </Table.ColumnHeaderCell>
              );
            })}
            {showActions && (
              <Table.ColumnHeaderCell
                justify="end"
                style={stickify(
                  edgeCellStyle("end", actionsStick, PIN_Z.headerPinned)
                )}
              >
                {labels.actions}
              </Table.ColumnHeaderCell>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {paddingTop > 0 && (
            <Table.Row aria-hidden>
              <Table.Cell
                colSpan={columnSpan}
                style={{ height: paddingTop, padding: 0 }}
              />
            </Table.Row>
          )}
          {entries.map(({ row, index, key }) => {
            const id = getRowId(row);
            return (
              <Row
                key={key}
                row={row}
                id={id}
                index={index}
                selected={selection?.isSelected(id) ?? false}
                expanded={expansion?.isExpanded(id) ?? false}
                size={size}
                accentColor={accentColor}
                dir={dir}
                columns={columns}
                columnWidths={columnWidths}
                pinSignature={pinSignature}
                className={rowClassName?.(row, index)}
                labels={labels}
                hasSelection={Boolean(selection)}
                expandable={expandable}
                showActions={showActions}
                hasRowClick={Boolean(onRowClick)}
                columnSpan={columnSpan}
                api={api}
                measureRef={measureRef}
              />
            );
          })}
          {paddingBottom > 0 && (
            <Table.Row aria-hidden>
              <Table.Cell
                colSpan={columnSpan}
                style={{ height: paddingBottom, padding: 0 }}
              />
            </Table.Row>
          )}
          {summary && (
            <Table.Row data-summary="">
              {expandable && <Table.Cell />}
              {selection && <Table.Cell />}
              {columns.map((column) => (
                <Table.Cell key={column.key} justify={justifyFor(column.align)}>
                  {summary[column.key]}
                </Table.Cell>
              ))}
              {showActions && <Table.Cell />}
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

function mobileLabel<TRow>(column: ColumnDef<TRow>): string {
  return (
    column.mobileLabel ??
    (typeof column.header === "string" ? column.header : column.key)
  );
}

/** Mobile Base UI card list. */
export function MobileCards<TRow>({
  table,
  rows,
  rowActions,
  confirm,
  getRowId,
  size,
  accentColor,
  dir,
  onRowClick,
  rowClassName,
  renderRowDetail,
  summaryRow,
  expansion,
  className,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
}: Readonly<SharedProps<TRow>>) {
  const { columns, selection, labels } = table;
  const entries = resolveVirtualRows(rows, getRowId, rowEntries);
  const compact = size === "1";
  const summary = summaryRow?.(rows);
  return (
    <Flex
      direction="column"
      gap={compact ? "2" : "3"}
      role="list"
      aria-label={table.getTableProps()["aria-label"]}
    >
      {paddingTop > 0 && <Box aria-hidden style={{ height: paddingTop }} />}
      {entries.map(({ row, index, key }) => {
        const id = getRowId(row);
        const expanded = expansion?.isExpanded(id) ?? false;
        return (
          <Card
            key={key}
            ref={measureElement}
            data-index={index}
            data-stagger=""
            size={compact ? "1" : "2"}
            role="listitem"
            className={joinClasses(className, rowClassName?.(row, index))}
            {...rowClickProps(row, onRowClick)}
          >
            {selection && (
              <Box mb="2">
                <Checkbox
                  aria-label={labels.selectRow}
                  checked={selection.isSelected(id)}
                  onToggle={() => selection.toggle(id)}
                />
              </Box>
            )}
            {expansion && (
              <Box mb="2">
                <ExpandToggle
                  open={expanded}
                  dir={dir}
                  labels={labels}
                  onToggle={() => expansion.toggle(id)}
                />
              </Box>
            )}
            {columns.map((column) => (
              <Box key={column.key} mb={compact ? "1" : "2"}>
                <Text
                  as="div"
                  size="1"
                  color="gray"
                  style={{ textTransform: "uppercase" }}
                >
                  {mobileLabel(column)}
                </Text>
                {/* Cells are arbitrary ReactNode (often block elements) — a
                    text wrapper as a <div> avoids invalid nested-<p> HTML. */}
                <Text as="div" size="2">
                  {column.Cell ? (
                    <column.Cell row={row} rowIndex={index} />
                  ) : (
                    column.accessor?.(row)
                  )}
                </Text>
              </Box>
            ))}
            {expanded && <Box pt="1">{renderRowDetail?.(row)}</Box>}
            {rowActions && rowActions.length > 0 && (
              <RowActionButtons
                row={row}
                actions={rowActions}
                confirm={confirm}
                cancelLabel={labels.cancel}
                accentColor={accentColor}
              />
            )}
          </Card>
        );
      })}
      {paddingBottom > 0 && (
        <Box aria-hidden style={{ height: paddingBottom }} />
      )}
      {summary && (
        <Card size={compact ? "1" : "2"} role="listitem" className={className}>
          {columns.map((column) => {
            const value = summary[column.key];
            // Columns absent from the summary are skipped — a card has no grid
            // to keep aligned, so empty entries are just noise.
            if (value === undefined) return null;
            return (
              <Box key={column.key} mb={compact ? "1" : "2"}>
                <Text
                  as="div"
                  size="1"
                  color="gray"
                  style={{ textTransform: "uppercase" }}
                >
                  {mobileLabel(column)}
                </Text>
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
