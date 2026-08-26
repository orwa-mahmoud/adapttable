/** The desktop `<table>`: header, pinned columns, rows and summary. */
import { PIN_Z, resolveColumnFooter, type TableLabels } from "@adapttable/core";
import {
  cellFlashAttr,
  cellHighlightStyle,
  cellSpanMark,
  columnFlexShares,
  columnGroupHeaderCaption,
  columnSizeStyle,
  ColumnSpacer,
  createDesktopRow,
  type DesktopHeaderLeaf,
  type DesktopRowWiring,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  groupedHeaderCellStyle,
  groupedHeaderLabelStyle,
  type HtmlGroupedHeaderCell,
  logicalAlign,
  mergedCellStyle,
  pinnedEdgeCellStyle,
  REORDER_COLUMN_WIDTH,
  type SharedTableRenderProps,
  useDesktopTableAssembly,
} from "@adapttable/core/adapter";
import {
  Box,
  Checkbox,
  type SxProps,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  type Theme,
} from "@mui/material";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";

import { ColumnSelectCheckbox } from "./ColumnSelectCheckbox";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import { FillHandle } from "./FillHandle";
import { GroupHeaderRow } from "./GroupHeader";
import {
  ColumnGroupToggle,
  FilterHeaderTrigger,
  RowEditActions,
  RowReorderHandle,
  TreeCell,
} from "./kitControls";
import { RowActionButtons } from "./RowActionButtons";

function ExtraSlotRow({
  kind,
  colSpan,
  render,
  labels,
  fillStyle,
}: Readonly<{
  kind: "separator" | "fullWidth";
  colSpan: number;
  render?: () => ReactNode;
  labels: TableLabels;
  fillStyle?: CSSProperties;
}>) {
  const parts = EXTRA_ROW_PARTS[kind];
  return (
    <TableRow
      data-adapttable-part={parts.row}
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <TableCell
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </TableCell>
    </TableRow>
  );
}

/** Map a destructive colour token to MUI's `"error"` palette, else default. */
export function muiColor(color: string | undefined): "default" | "error" {
  return color === "danger" || color === "red" || color === "error"
    ? "error"
    : "default";
}

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
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
const SELECTION_WIDTH = 48;
const ACTIONS_WIDTH = 120;
const MUI_WIDTHS = {
  expansion: EXPAND_WIDTH,
  selection: SELECTION_WIDTH,
  actions: ACTIONS_WIDTH,
} as const;
const PIN_BG = "var(--mui-palette-background-paper)";
const PAPER_SX = { bgcolor: "background.paper" } as const;
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

/** Empty leading pad (group header / summary) — keeps DesktopTable lean. */
function ExtraCheckboxCell({ show }: Readonly<{ show: boolean }>) {
  if (!show) return null;
  return <TableCell padding="checkbox" />;
}

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
  const ref = useRef(target);
  ref.current = target;
  return useCallback((id: string) => ref.current?.toggle(id), []);
}

/** Inline chevron pointing at the reading end; rotates down when open. */
export function ExpandChevron({
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

function muiAlign(
  align: "start" | "center" | "end" | undefined
): "start" | "center" | "end" {
  return logicalAlign(align);
}

interface DesktopRowProps<TRow> extends DesktopRowWiring<TRow> {
  size: "small" | "medium";
  dir?: "ltr" | "rtl";
}

function rowExtrasEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return prev.size === next.size && prev.dir === next.dir;
}

function DesktopRowBase<TRow>(
  props: Readonly<DesktopRowProps<TRow>>
): ReactElement {
  const {
    row,
    index,
    id,
    gridFocus,
    columns,
    bodyCells,
    labels,
    selected,
    expanded,
    showActions,
    showReorder,
    rowReorder,
    windowStart,
    rowCount,
    reorderPinned,
    rowActions,
    rowActionsLayout,
    cellSpanAppearance,
    renderRowActions,
    confirm,
    columnSpan,
    columnSpacers,
    treeEntry,
    treeColumnKey: treeKey,
    onToggleTree,
    hasStartPin,
    hasEndPin,
    actionsPinned,
    rowClass,
    isCellFlashing,
    hasPrefetch,
    editing,
    rows,
    getRowId,
    onPrefetch,
    onToggleSelect,
    onToggleExpand,
    renderDetail,
    focusIndex,
    edgeRowPin,
    measureRef,
    rowDomProps,
    bodyPinStyle,
    dir,
  } = props;
  const expandable = expanded !== undefined;
  const expansionLead = expandable ? EXPAND_WIDTH : 0;
  const selectionLead =
    expansionLead + (showReorder ? REORDER_COLUMN_WIDTH : 0);
  const edge = (active: boolean, lead = 0) =>
    pinnedEdgeCellStyle("start", active, PIN_Z.body, PIN_BG, lead);
  return (
    <>
      <TableRow
        {...rowDomProps}
        ref={measureRef}
        className={rowClass}
        hover
        selected={Boolean(selected)}
        onMouseEnter={hasPrefetch ? () => onPrefetch(row) : undefined}
      >
        {expandable && (
          <TableCell
            padding="checkbox"
            sx={PAPER_SX}
            style={{ ...edge(hasStartPin), ...edgeRowPin }}
          >
            <ExpandToggle
              id={id}
              expanded={Boolean(expanded)}
              onToggle={onToggleExpand}
              dir={dir}
              expandLabel={labels.expandRow}
              collapseLabel={labels.collapseRow}
            />
          </TableCell>
        )}
        {showReorder && rowReorder && (
          <TableCell
            padding="checkbox"
            data-adapttable-part="reorder-cell"
            sx={PAPER_SX}
            style={{
              ...edge(hasStartPin || reorderPinned, expansionLead),
              ...edgeRowPin,
            }}
          >
            <RowReorderHandle
              reorder={rowReorder}
              labels={labels}
              rowId={id}
              localIndex={index}
              row={row}
              windowStart={windowStart}
              rowCount={rowCount}
            />
          </TableCell>
        )}
        {selected !== undefined && (
          <TableCell
            data-adapttable-part="selection-cell"
            padding="checkbox"
            sx={PAPER_SX}
            style={{ ...edge(hasStartPin, selectionLead), ...edgeRowPin }}
          >
            <Checkbox
              slotProps={{ input: { "aria-label": labels.selectRow } }}
              checked={selected}
              onChange={() => onToggleSelect(id)}
            />
          </TableCell>
        )}
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          const pin = bodyPinStyle(column.key);
          return (
            <TableCell
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              data-adapttable-part="cell"
              data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
              data-cell-span={cellSpanMark(colSpan, rowSpan)}
              sx={{
                textAlign: muiAlign(column.align),
                ...(pin ? PAPER_SX : {}),
              }}
              style={cellHighlightStyle(
                focusProps,
                {
                  ...(pin ? { ...pin, background: PIN_BG } : {}),
                  ...mergedCellStyle(colSpan, rowSpan, cellSpanAppearance),
                },
                {
                  backgroundColor:
                    "var(--mui-palette-action-selected, rgba(0, 0, 0, 0.08))",
                }
              )}
              {...focusProps}
            >
              <TreeCell
                entry={treeEntry}
                columnKey={column.key}
                treeColumnKey={treeKey}
                labels={{
                  expandRow: labels.expandRow,
                  collapseRow: labels.collapseRow,
                }}
                onToggle={onToggleTree}
              >
                <EditableDataCell
                  editing={editing}
                  row={row}
                  column={column}
                  rowId={id}
                  rowIndex={focusIndex}
                  rows={rows}
                  columns={columns}
                  rowKey={getRowId}
                  editLabel={labels.editCell}
                  undoLabel={labels.undoEdit}
                />
              </TreeCell>
              <FillHandle
                focus={gridFocus}
                windowIndex={focusIndex}
                col={columnIndex}
              />
            </TableCell>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <TableCell
            sx={{ ...PAPER_SX, textAlign: "end" }}
            style={{
              ...pinnedEdgeCellStyle(
                "end",
                hasEndPin || actionsPinned,
                PIN_Z.body,
                PIN_BG
              ),
              ...edgeRowPin,
            }}
          >
            {editing?.rowEditing && (
              <RowEditActions
                rowEditing={editing.rowEditing}
                row={row}
                rowId={id}
                labels={{
                  editRow: labels.editRow,
                  saveRow: labels.saveRow,
                  cancel: labels.cancel,
                }}
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
          </TableCell>
        )}
      </TableRow>
      {expandable && expanded && (
        <TableRow>
          <TableCell colSpan={columnSpan}>{renderDetail(row)}</TableCell>
        </TableRow>
      )}
    </>
  );
}

function LeafHeader<TRow>({
  leaf,
  headSx,
  flexShares,
  columnWidths,
  filterRegistry,
  closeHeaderFilterOnSelect,
  source,
  labels,
}: Readonly<{
  leaf: DesktopHeaderLeaf<TRow>;
  headSx: SxProps<Theme>;
  flexShares: ReturnType<typeof columnFlexShares>;
  columnWidths: SharedTableRenderProps<TRow>["columnWidths"];
  filterRegistry: SharedTableRenderProps<TRow>["filterRegistry"];
  closeHeaderFilterOnSelect: boolean | undefined;
  source: SharedTableRenderProps<TRow>["table"]["source"];
  labels: Required<TableLabels>;
}>): ReactElement {
  const { column } = leaf;
  const ariaSort = leaf.headerProps["aria-sort"] as
    | "ascending"
    | "descending"
    | "none"
    | undefined;
  const active = ariaSort === "ascending" || ariaSort === "descending";
  return (
    <TableCell
      key={column.key}
      data-adapttable-part="header-cell"
      {...leaf.columnHeaderProps}
      aria-sort={ariaSort}
      data-column-key={column.key}
      data-sort-index={leaf.sortIndex}
      rowSpan={leaf.rowSpan > 1 ? leaf.rowSpan : undefined}
      sx={headSx}
      style={{
        ...leaf.style,
        ...columnSizeStyle(column, flexShares, columnWidths?.[column.key]),
      }}
    >
      {column.sortable ? (
        <TableSortLabel
          active={active}
          direction={ariaSort === "descending" ? "desc" : "asc"}
          onClick={leaf.sortButtonProps.onClick}
          title={column.headerTooltip}
        >
          {leaf.caption}
          {leaf.sortIndex !== undefined && (
            <Box component="span" sx={{ fontSize: 10, ml: 0.5 }}>
              {leaf.sortIndex}
            </Box>
          )}
        </TableSortLabel>
      ) : (
        <span title={column.headerTooltip}>{leaf.caption}</span>
      )}
      {leaf.showColumnCheckbox && leaf.onToggleColumn ? (
        <ColumnSelectCheckbox
          label={leaf.columnSelectAriaLabel}
          checked={leaf.columnCheckboxChecked}
          onToggle={leaf.onToggleColumn}
        />
      ) : null}
      {column.headerActions ? (
        <span data-adapttable-part="header-actions">
          {column.headerActions}
        </span>
      ) : null}
      {leaf.headerDef ? (
        <FilterHeaderTrigger
          def={leaf.headerDef}
          source={source}
          labels={labels}
          registry={filterRegistry}
          closeOnSelect={closeHeaderFilterOnSelect}
        />
      ) : null}
      {leaf.resizeHandleProps && (
        <Box
          component="span"
          sx={RESIZE_HANDLE_SX}
          {...leaf.resizeHandleProps}
        />
      )}
    </TableCell>
  );
}

/** Desktop MUI table. */
export function DesktopTable<TRow>(props: Readonly<SharedProps<TRow>>) {
  const {
    size,
    dir,
    filterRegistry,
    closeHeaderFilterOnSelect,
    columnWidths,
    fitColumns,
    stickyHeader = false,
  } = props;
  const assembly = useDesktopTableAssembly(props, { widths: MUI_WIDTHS });
  const Row = useMemo(
    () =>
      createDesktopRow<TRow, DesktopRowProps<TRow>>(
        DesktopRowBase,
        rowExtrasEqual
      ),
    []
  );
  const {
    model,
    summary,
    showColumnFooter,
    headerPlan,
    headerBand,
    header,
    pin,
    scroll,
    tableStyle,
    tableProps,
    gridProps,
    callbacks,
    bodySlots,
  } = assembly;
  const {
    columns,
    selection,
    labels,
    showActions,
    showReorder,
    leadingCells,
    columnSpacers,
  } = model;

  const flexShares = columnFlexShares({
    columns,
    fitColumns,
    widths: columnWidths,
  });
  const headPaint: SxProps<Theme> | undefined = stickyHeader
    ? {
        position: "sticky",
        top: pin.headerStickTop,
        zIndex: PIN_Z.header,
        bgcolor: "background.paper",
      }
    : undefined;
  const edgeHeadSx = (active: boolean): SxProps<Theme> => ({
    ...headPaint,
    ...(active ? { ...PAPER_SX } : {}),
  });
  const edgeHeadStyle = (active: boolean, lead = 0) =>
    pinnedEdgeCellStyle("start", active, PIN_Z.headerPinned, PIN_BG, lead);

  const leafProps = {
    flexShares,
    columnWidths,
    filterRegistry,
    closeHeaderFilterOnSelect,
    source: props.table.source,
    labels,
  };

  const renderPlanCell = (cell: HtmlGroupedHeaderCell): ReactElement => {
    if (cell.kind === "leaf") {
      const column = columns[cell.columnIndex]!;
      const leaf = header.leaf(column, cell.columnIndex, cell.rowSpan);
      return (
        <LeafHeader
          key={cell.key}
          leaf={leaf}
          headSx={{
            ...headPaint,
            ...(leaf.pinSide ? PAPER_SX : {}),
            textAlign: muiAlign(column.align),
            ...(leaf.rowSpan > 1 ? { verticalAlign: "middle" } : {}),
          }}
          {...leafProps}
        />
      );
    }
    return (
      <TableCell
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        data-adapttable-part="header-group-cell"
        sx={{
          fontWeight: 600,
          ...groupedHeaderCellStyle(
            cell,
            "var(--mui-palette-divider, rgba(0, 0, 0, 0.12))"
          ),
        }}
      >
        <span style={groupedHeaderLabelStyle()}>
          {props.onToggleColumnGroup ? (
            <ColumnGroupToggle
              cell={cell.cell}
              labels={labels}
              onToggle={props.onToggleColumnGroup}
            />
          ) : null}
          {columnGroupHeaderCaption(cell.cell)}
        </span>
      </TableCell>
    );
  };

  const leadingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.leading.expand && (
        <TableCell
          padding="checkbox"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={edgeHeadSx(pin.hasStartPin)}
          style={edgeHeadStyle(pin.hasStartPin)}
        />
      )}
      {header.leading.reorder && (
        <TableCell
          padding="checkbox"
          aria-label={labels.reorderRow}
          data-adapttable-part="reorder-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={edgeHeadSx(pin.hasStartPin || Boolean(props.reorderPinned))}
          style={edgeHeadStyle(
            pin.hasStartPin || Boolean(props.reorderPinned),
            pin.expansionLead
          )}
        />
      )}
      {header.leading.selection && selection && (
        <TableCell
          data-adapttable-part="selection-header"
          padding="checkbox"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={edgeHeadSx(pin.hasStartPin)}
          style={edgeHeadStyle(pin.hasStartPin, pin.selectionLead)}
        >
          <Checkbox
            slotProps={{ input: { "aria-label": labels.selectAll } }}
            checked={selection.headerState === "all"}
            indeterminate={selection.headerState === "some"}
            onChange={selection.toggleAll}
          />
        </TableCell>
      )}
      {header.leading.spacerStart && columnSpacers && (
        <ColumnSpacer width={columnSpacers.start} side="start" as="th" />
      )}
    </>
  );

  const trailingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.trailing.spacerEnd && columnSpacers && (
        <ColumnSpacer width={columnSpacers.end} side="end" as="th" />
      )}
      {header.trailing.actions && (
        <TableCell
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={{
            ...edgeHeadSx(pin.hasEndPin || pin.stickActions),
            textAlign: "end",
          }}
          style={pinnedEdgeCellStyle(
            "end",
            pin.hasEndPin || pin.stickActions,
            PIN_Z.headerPinned,
            PIN_BG
          )}
        >
          {labels.actions}
        </TableCell>
      )}
    </>
  );

  const minWidth =
    typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;

  return (
    <Box ref={scroll.bindScrollBox} style={scroll.boxStyle}>
      <Table
        data-adapttable-part="table"
        size={size}
        aria-label={tableProps["aria-label"]}
        {...gridProps}
        sx={minWidth > 0 ? { minWidth } : undefined}
        style={
          tableStyle
            ? {
                tableLayout: tableStyle.tableLayout,
                width: tableStyle.width,
              }
            : undefined
        }
      >
        <TableHead data-adapttable-part="thead" ref={header.theadRef}>
          {headerPlan ? (
            headerPlan.map((row, rowIndex) => {
              const last = rowIndex === headerPlan.length - 1;
              return (
                <TableRow
                  key={row.map((cell) => cell.key).join("|")}
                  ref={last ? header.headerRowRef : undefined}
                  data-adapttable-part={
                    last ? "header-row" : "header-group-row"
                  }
                >
                  {rowIndex === 0 ? leadingHeaders(headerBand) : null}
                  {row.map(renderPlanCell)}
                  {rowIndex === 0 ? trailingHeaders(headerBand) : null}
                </TableRow>
              );
            })
          ) : (
            <TableRow
              ref={header.headerRowRef}
              data-adapttable-part="header-row"
            >
              {leadingHeaders(1)}
              {columns.map((column, headerIndex) => {
                const leaf = header.leaf(column, headerIndex);
                return (
                  <LeafHeader
                    key={column.key}
                    leaf={leaf}
                    headSx={{
                      ...headPaint,
                      ...(leaf.pinSide ? PAPER_SX : {}),
                      textAlign: muiAlign(column.align),
                    }}
                    {...leafProps}
                  />
                );
              })}
              {trailingHeaders(1)}
            </TableRow>
          )}
        </TableHead>
        <TableBody data-adapttable-part="tbody">
          {bodySlots.map((slot) => {
            if (slot.kind === "extra") {
              return (
                <ExtraSlotRow
                  key={slot.key}
                  kind={slot.extraKind}
                  colSpan={slot.colSpan}
                  render={slot.render}
                  labels={labels}
                  fillStyle={slot.fillStyle}
                />
              );
            }
            if (slot.kind === "virtualPad") {
              return (
                <TableRow key={slot.key} aria-hidden>
                  <TableCell
                    colSpan={slot.colSpan}
                    sx={{ height: slot.height, p: 0 }}
                  />
                </TableRow>
              );
            }
            if (slot.kind === "group") {
              return (
                <GroupHeaderRow
                  key={slot.key}
                  entry={slot.entry}
                  columns={columns}
                  leadingCells={leadingCells}
                  showActions={showActions}
                  getCellProps={props.table.getCellProps}
                  selection={selection}
                  labels={labels}
                  onToggleCollapse={callbacks.onToggleGroup}
                  onShowMore={props.grouping?.showMore ?? (() => undefined)}
                />
              );
            }
            return (
              <Row key={slot.key} {...slot.wiring} size={size} dir={dir} />
            );
          })}
        </TableBody>
        {showColumnFooter && (
          <TableFooter>
            <TableRow>
              {header.leading.expand && <TableCell padding="checkbox" />}
              <ExtraCheckboxCell show={showReorder} />
              {selection && <TableCell padding="checkbox" />}
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  sx={{ textAlign: muiAlign(column.align) }}
                >
                  {resolveColumnFooter(column, summary?.[column.key])}
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
