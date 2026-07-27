import {
  type ColumnDef,
  columnResizeHandleProps,
  type ConfirmHandler,
  type Direction,
  type EditableCellEditing,
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
  rowEditingSignature,
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
  useSummaryCells,
} from "@adapttable/core";
import {
  Box,
  Button,
  Card,
  chakra,
  HStack,
  IconButton,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { subtleText } from "../styles";
import { EditableDataCell } from "./EditableCell";
import { GroupHeaderCard, GroupHeaderRow } from "./GroupHeader";
import { Checkbox, Tooltip } from "./primitives";

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

/**
 * Opaque background for sticky/pinned cells — the Chakra v3 body-background
 * token (`--chakra-colors-bg`). The old v2 `chakra-body-bg` token does not
 * exist in v3, so it resolved to transparent and scrolled columns bled through
 * the pinned ones.
 */
const PIN_BG = "var(--chakra-colors-bg)";

interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  /** Class hook for the table (desktop) / each card (mobile). */
  className?: string;
  size: "sm" | "md" | "lg";
  accentColor?: string;
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

/**
 * Header sort indicator, derived from the cell's computed `aria-sort` so a
 * multi-sort chain level shows its own direction, not the single-sort one.
 */
const sortGlyph = sortArrow;

/** Pinned data-cell style with the Chakra surface background. */
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
      size="xs"
      variant="ghost"
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
  accentColor?: string;
}>) {
  return (
    <HStack gap={1} justify="flex-end">
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
        // Icon-only actions use IconButton (with a tooltip for the name);
        // text actions use a real Button so the label actually renders
        // (IconButton renders only the icon child).
        return action.icon ? (
          <Tooltip key={action.key} label={reason ?? action.label}>
            <IconButton
              size="sm"
              variant="ghost"
              colorPalette={action.color ?? accentColor}
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
              size="sm"
              variant="ghost"
              colorPalette={action.color ?? accentColor}
              disabled={disabled}
              onClick={handleClick}
            >
              {action.label}
            </Button>
          </Tooltip>
        );
      })}
    </HStack>
  );
}

/**
 * Everything a memoized desktop row reads through ONE identity-stable ref:
 * the latest callbacks and pin geometry. Routing them through the ref (read
 * at event/render time) keeps a changed callback identity from re-rendering
 * every row, without ever calling a stale closure.
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
  size: "sm" | "md" | "lg";
  accentColor?: string;
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
  editing: EditableCellEditing<TRow> | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
}

/**
 * The props {@link desktopRowPropsEqual} compares. `api` and `measureRef`
 * are deliberately absent: both are identity-stable by construction, and a
 * row must never re-render because some callback's identity changed.
 */
const ROW_VISUAL_KEYS = [
  ...SHARED_DESKTOP_ROW_KEYS,
  "accentColor",
  "editingSignature",
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
  editing,
  rows,
  getRowId,
}: Readonly<DesktopRowProps<TRow>>) {
  // Render-time geometry reads the latest ref values: whenever they change,
  // a compared prop (pinSignature / hasSelection / …) changes with them.
  const live = api.current;
  const activateRow = (r: TRow): void => {
    api.current.onRowClick?.(r);
  };
  return (
    <>
      <Table.Row
        {...rowClickProps(row, hasRowClick ? activateRow : undefined, index)}
        ref={measureRef}
        data-index={index}
        data-stagger=""
        className={className}
        bg={selected ? "blackAlpha.100" : undefined}
        _dark={{ bg: selected ? "whiteAlpha.200" : undefined }}
        onMouseEnter={() => api.current.prefetch?.(row)}
      >
        {expandable && (
          <Table.Cell
            px={1}
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
            textAlign={logicalAlign(column.align)}
            style={pinCellStyle(live.pinOffset?.(column.key), 1, live.leads)}
          >
            <EditableDataCell
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
          </Table.Cell>
        ))}
        {showActions && (
          <Table.Cell
            textAlign="end"
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
 * Materialize the memoized row for one TRow. React 18's `memo` typing drops
 * a generic component's type parameter, so each `DesktopTable` instantiates
 * the memo for its own row type (zero casts, full type safety).
 */
function createDesktopRow<TRow>() {
  return memo(DesktopRowBase<TRow>, desktopRowPropsEqual<TRow>);
}

/** Body rows for {@link DesktopTable}: group headers + leaves, or leaf-only. */
function DesktopTableRows<TRow>({
  grouping,
  entries,
  getRowId,
  selection,
  expansion,
  size,
  accentColor,
  dir,
  columns,
  columnWidths,
  pinSignature,
  rowClassName,
  labels,
  expandable,
  showActions,
  onRowClick,
  columnSpan,
  api,
  measureRef,
  editing,
  rows,
  Row,
  onToggleGroup,
}: Readonly<{
  grouping: SharedTableRenderProps<TRow>["grouping"];
  entries: ReturnType<typeof tableRenderModel<TRow>>["entries"];
  getRowId: (row: TRow) => string;
  selection: SelectionState | null;
  expansion: RowExpansionState | undefined;
  size: SharedProps<TRow>["size"];
  accentColor?: string;
  dir?: Direction;
  columns: ColumnDef<TRow>[];
  columnWidths?: Readonly<Record<string, number>>;
  pinSignature: string;
  rowClassName?: (row: TRow, index: number) => string | undefined;
  labels: Required<TableLabels>;
  expandable: boolean;
  showActions: boolean;
  onRowClick?: (row: TRow) => void;
  columnSpan: number;
  api: RefObject<DesktopRowApi<TRow>>;
  measureRef: (element: HTMLTableRowElement | null) => void;
  editing?: EditableCellEditing<TRow>;
  rows: readonly TRow[];
  Row: ReturnType<typeof createDesktopRow<TRow>>;
  onToggleGroup: (groupKey: string) => void;
}>): ReactNode {
  if (grouping) {
    return grouping.entries.map((entry) => {
      if (entry.kind === "group") {
        return (
          <GroupHeaderRow
            key={entry.key}
            entry={entry}
            columnSpan={columnSpan}
            selection={selection}
            labels={labels}
            dir={dir}
            accentColor={accentColor}
            onToggleCollapse={onToggleGroup}
          />
        );
      }
      const id = getRowId(entry.row);
      return (
        <Row
          key={entry.key}
          row={entry.row}
          id={id}
          index={entry.index}
          selected={selection?.isSelected(id) ?? false}
          expanded={expansion?.isExpanded(id) ?? false}
          size={size}
          accentColor={accentColor}
          dir={dir}
          columns={columns}
          columnWidths={columnWidths}
          pinSignature={pinSignature}
          className={rowClassName?.(entry.row, entry.index)}
          labels={labels}
          hasSelection={Boolean(selection)}
          expandable={expandable}
          showActions={showActions}
          hasRowClick={Boolean(onRowClick)}
          columnSpan={columnSpan}
          api={api}
          measureRef={measureRef}
          editing={editing}
          rows={rows}
          getRowId={getRowId}
          editingSignature={rowEditingSignature(editing, id)}
        />
      );
    });
  }
  return entries.map(({ row, index, key }) => {
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
        editing={editing}
        rows={rows}
        getRowId={getRowId}
        editingSignature={rowEditingSignature(editing, id)}
      />
    );
  });
}

/** Desktop Chakra table. */
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
  editing,
  grouping,
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
  const summary = useSummaryCells(summaryRow, rows);
  // Stick the header *cells* (a `<thead>` does not pin against the document
  // scroller) and avoid `<TableContainer>`, whose `overflow-x` would trap
  // sticky and let the header overlap the first row.
  // Inside a maxHeight scroll box the box itself is the sticky context, so
  // the header pins to ITS top — a viewport offset would float it mid-box.
  // End-pinned actions count as a pin too: sticking them needs the wrapper
  // to be the horizontal scroll container, exactly like a pinned data column.
  const hasPinned =
    actionsPinned || table.columns.some((c) => pinOffset?.(c.key) != null);
  // With no maxHeight and no pins the wrapper must stay a NON-scroll
  // container so page-scroll sticky headers keep working — but a table wider
  // than the card would then bleed past it. Measure, and scroll only when the
  // content actually overflows.
  const { ref: overflowRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();
  // ANY scroll container (maxHeight, pins, measured overflow) becomes the
  // sticky context: the header must pin to ITS top — a viewport offset
  // would shove it down into the rows.
  const inScrollBox = maxHeight != null || hasPinned || overflowing;
  const stickyTh = stickyHeader
    ? {
        position: "sticky" as const,
        top: inScrollBox ? "0px" : `${stickyTop}px`,
        zIndex: PIN_Z.header,
        bg: "bg",
      }
    : {};
  // The leading expansion (32px) / checkbox (48px) and trailing actions
  // (120px) columns pin to the edge alongside the data columns, which
  // therefore start past them.
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
  // Header-cell style merging pin + user width; the resize handle is absolute,
  // so add a positioning context when the cell is not already sticky/pinned.
  const headCellStyle = (
    column: ColumnDef<TRow>
  ): CSSProperties | undefined => {
    const key = column.key;
    const pin = pinCellStyle(pinOffset?.(key), PIN_Z.headerPinned, leads);
    // A pinned column renders at the width its sticky inset assumed, so
    // stacked pins stay flush even with no declared width.
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : columnWidths?.[key];
    if (!pin && width == null && !setWidth) return undefined;
    const style: CSSProperties = { ...pin };
    if (width != null) style.width = width;
    if (setWidth && !stickyHeader && !pin) style.position = "relative";
    return style;
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
  // `pinOffset` is a fresh closure whenever the layout changes, so rows
  // compare this serialized pin geometry instead of a function identity.
  // The actions edge is part of the geometry: end-pinning the actions column
  // must re-render the memoized rows so their actions cells turn sticky.
  const pinSignature = [
    actionsStick ? "actions:end" : "",
    ...columns.map((column) => {
      const pin = pinOffset?.(column.key);
      return pin ? `${column.key}:${pin.side}:${pin.inset}` : "";
    }),
  ].join("|");
  const groupingRef = useRef(grouping);
  groupingRef.current = grouping;
  const onToggleGroup = useCallback(
    (groupKey: string) => groupingRef.current?.collapsed.toggle(groupKey),
    []
  );

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        overflowRef(node);
        virtualScrollRef?.(node);
      }}
      maxH={maxHeight == null ? undefined : `${maxHeight}px`}
      overflowX={
        maxHeight != null || hasPinned || overflowing ? "auto" : undefined
      }
      overflowY={maxHeight == null ? undefined : "auto"}
    >
      <Table.Root
        size={size}
        data-size={size}
        className={className}
        minW={minWidth > 0 ? `${minWidth}px` : undefined}
        aria-label={table.getTableProps()["aria-label"]}
      >
        <Table.Header>
          {groups && (
            <Table.Row>
              {expandable && <Table.ColumnHeader px={1} />}
              {selection && <Table.ColumnHeader />}
              {groups.map((cell) => (
                <Table.ColumnHeader
                  key={cell.key}
                  colSpan={cell.span}
                  textAlign="center"
                  fontWeight="semibold"
                  textTransform="none"
                >
                  {cell.label}
                </Table.ColumnHeader>
              ))}
              {showActions && <Table.ColumnHeader />}
            </Table.Row>
          )}
          <Table.Row>
            {expandable && (
              <Table.ColumnHeader
                {...stickyTh}
                aria-label={labels.expandRow}
                width={`${EXPANSION_WIDTH}px`}
                px={1}
                style={edgeCellStyle("start", hasStartPin, PIN_Z.headerPinned)}
              />
            )}
            {selection && (
              <Table.ColumnHeader
                {...stickyTh}
                style={edgeCellStyle(
                  "start",
                  hasStartPin,
                  PIN_Z.headerPinned,
                  expandable ? EXPANSION_WIDTH : 0
                )}
              >
                <Checkbox
                  aria-label={labels.selectAll}
                  checked={selection.headerState === "all"}
                  indeterminate={selection.headerState === "some"}
                  onToggle={selection.toggleAll}
                />
              </Table.ColumnHeader>
            )}
            {columns.map((column) => {
              const ariaSort = table.getHeaderCellProps(column)["aria-sort"] as
                | "ascending"
                | "descending"
                | "none"
                | undefined;
              // Core's sort onClick receives the click EVENT: with `multiSort`
              // a shift-click cycles the column through the sort chain while a
              // plain click keeps single-sorting.
              const sortButton = table.getSortButtonProps(column);
              const sortClick = sortButton.onClick;
              const sortIndex = sortButton["data-sort-index"];
              return (
                <Table.ColumnHeader
                  key={column.key}
                  textAlign={logicalAlign(column.align)}
                  width={column.width}
                  aria-sort={ariaSort}
                  {...stickyTh}
                  style={headCellStyle(column)}
                >
                  {column.sortable ? (
                    <chakra.button
                      type="button"
                      cursor="pointer"
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
                          fontSize="0.7em"
                          fontWeight="bold"
                          borderRadius="full"
                          px={1.5}
                          ms={1}
                          bg="blackAlpha.200"
                          _dark={{ bg: "whiteAlpha.300" }}
                        >
                          {sortIndex}
                        </Text>
                      )}
                    </chakra.button>
                  ) : (
                    column.header
                  )}
                  {setWidth && (
                    <Box
                      as="span"
                      style={RESIZE_HANDLE_STYLE}
                      {...columnResizeHandleProps(
                        column.key,
                        setWidth,
                        `${resizeLabel}: ${columnName(column)}`
                      )}
                    />
                  )}
                </Table.ColumnHeader>
              );
            })}
            {showActions && (
              <Table.ColumnHeader
                textAlign="end"
                {...stickyTh}
                style={edgeCellStyle("end", actionsStick, PIN_Z.headerPinned)}
              >
                {labels.actions}
              </Table.ColumnHeader>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {paddingTop > 0 && (
            <Table.Row aria-hidden>
              <Table.Cell colSpan={columnSpan} h={`${paddingTop}px`} p={0} />
            </Table.Row>
          )}
          <DesktopTableRows
            grouping={grouping}
            entries={entries}
            getRowId={getRowId}
            selection={selection}
            expansion={expansion}
            size={size}
            accentColor={accentColor}
            dir={dir}
            columns={columns}
            columnWidths={columnWidths}
            pinSignature={pinSignature}
            rowClassName={rowClassName}
            labels={labels}
            expandable={expandable}
            showActions={showActions}
            onRowClick={onRowClick}
            columnSpan={columnSpan}
            api={api}
            measureRef={measureRef}
            editing={editing}
            rows={rows}
            Row={Row}
            onToggleGroup={onToggleGroup}
          />
          {paddingBottom > 0 && (
            <Table.Row aria-hidden>
              <Table.Cell colSpan={columnSpan} h={`${paddingBottom}px`} p={0} />
            </Table.Row>
          )}
        </Table.Body>
        {summary && (
          <Table.Footer>
            <Table.Row>
              {expandable && <Table.Cell px={1} />}
              {selection && <Table.Cell />}
              {columns.map((column) => (
                <Table.Cell
                  key={column.key}
                  textAlign={logicalAlign(column.align)}
                >
                  {summary[column.key]}
                </Table.Cell>
              ))}
              {showActions && <Table.Cell />}
            </Table.Row>
          </Table.Footer>
        )}
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
  /** Static list class merged with resolved `rowClassName` output. */
  className?: string;
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
  accentColor?: string;
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
  "accentColor",
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
  accentColor,
  editing,
  rows,
  getRowId,
}: Readonly<MobileCardProps<TRow>>) {
  return (
    <Card.Root
      ref={measureElement}
      data-index={index}
      data-stagger=""
      variant="outline"
      role="listitem"
      className={className}
      {...rowClickProps(row, onRowClick, index)}
    >
      <Card.Body p={compact ? 3 : undefined}>
        {onToggleSelect && (
          <Checkbox
            aria-label={labels.selectRow}
            checked={selected}
            onToggle={() => onToggleSelect(id)}
            mb={2}
          />
        )}
        {onToggleExpand && (
          <Box mb={2}>
            <ExpandToggle
              open={expanded}
              dir={dir}
              labels={labels}
              onToggle={() => onToggleExpand(id)}
            />
          </Box>
        )}
        {columns.map((column) => (
          <Box key={column.key} mb={compact ? 1 : 2}>
            <Text fontSize="xs" {...subtleText} textTransform="uppercase">
              {mobileLabel(column)}
            </Text>
            <Text as="div" fontSize="sm">
              <EditableDataCell
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
            </Text>
          </Box>
        ))}
        {expanded && <Box pt={1}>{renderDetail?.(row)}</Box>}
        {rowActions && rowActions.length > 0 && (
          <RowActionButtons
            row={row}
            actions={rowActions}
            confirm={confirm}
            cancelLabel={labels.cancel}
            accentColor={accentColor}
          />
        )}
      </Card.Body>
    </Card.Root>
  );
}

/** Mobile Chakra card list. */
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
  editing,
  grouping,
  className,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
}: Readonly<SharedProps<TRow>>) {
  const { columns, selection, labels } = table;
  const entries = resolveVirtualRows(rows, getRowId, rowEntries);
  const compact = size === "sm";
  const summary = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () => memo(MobileCardBase<TRow>, mobileCardPropsEqual),
    []
  );

  const renderCard = (row: TRow, index: number, key: string) => {
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
        className={joinClasses(className, rowClassName?.(row, index))}
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
      />
    );
  };

  return (
    <Stack
      gap={compact ? 2 : 3}
      role="list"
      aria-label={table.getTableProps()["aria-label"]}
    >
      {paddingTop > 0 && <Box aria-hidden h={`${paddingTop}px`} />}
      {grouping
        ? grouping.entries.map((entry) =>
            entry.kind === "group" ? (
              <GroupHeaderCard
                key={entry.key}
                entry={entry}
                selection={selection}
                labels={labels}
                dir={dir}
                accentColor={accentColor}
                onToggleCollapse={(key) => grouping.collapsed.toggle(key)}
              />
            ) : (
              renderCard(entry.row, entry.index, entry.key)
            )
          )
        : entries.map(({ row, index, key }) => renderCard(row, index, key))}
      {paddingBottom > 0 && <Box aria-hidden h={`${paddingBottom}px`} />}
      {summary && (
        <Card.Root variant="outline" role="listitem" className={className}>
          <Card.Body p={compact ? 3 : undefined}>
            {columns.map((column) => {
              const value = summary[column.key];
              // Columns absent from the summary are skipped — a card has no
              // grid to keep aligned, so empty entries are just noise.
              if (value === undefined) return null;
              return (
                <Box key={column.key} mb={compact ? 1 : 2}>
                  <Text fontSize="xs" {...subtleText} textTransform="uppercase">
                    {mobileLabel(column)}
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {value}
                  </Text>
                </Box>
              );
            })}
          </Card.Body>
        </Card.Root>
      )}
    </Stack>
  );
}
