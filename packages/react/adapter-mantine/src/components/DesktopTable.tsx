import {
  edgePinStyle,
  PIN_Z,
  pinnedCellStyle,
  type TableLabels,
} from "@adapttable/core";
import { type ColumnDef, resolveColumnFooter } from "@adapttable/react";
import {
  cellFlashAttr,
  cellHighlightStyle,
  cellSpanMark,
  columnGroupHeaderCaption,
  ColumnSpacer,
  createDesktopRow,
  type DesktopHeaderLeaf,
  type DesktopRowWiring,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderLabelStyle,
  type HtmlGroupedHeaderCell,
  mergedCellStyle,
  REORDER_COLUMN_WIDTH,
  resolveRowEditTrigger,
  rowEditConflict,
  type SharedTableRenderProps,
  useDesktopTableAssembly,
} from "@adapttable/react/adapter";
import { Badge, Checkbox, Group, Table, VisuallyHidden } from "@mantine/core";
import {
  type CSSProperties,
  Fragment,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useMemo,
} from "react";

import { type Density, DENSITY_SPACING } from "../density";
import { ChevronDownIcon, ChevronUpIcon, SelectorIcon } from "../icons";
import { HAIRLINE, SURFACE } from "../surface";
import {
  OptionalColumnGroupToggle,
  OptionalColumnHeaderRename,
  OptionalColumnSelect,
  OptionalEditableCell,
  OptionalExpandToggle,
  OptionalFillHandle,
  OptionalFilterHeader,
  OptionalGroupHeaderRow,
  OptionalRowEditActions,
  OptionalRowReorderHandle,
  OptionalTreeCell,
} from "./featureSlots";
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
}>): ReactElement {
  const parts = EXTRA_ROW_PARTS[kind];
  return (
    <Table.Tr
      data-adapttable-part={parts.row}
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <Table.Td
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </Table.Td>
    </Table.Tr>
  );
}

function When({
  show,
  children,
}: Readonly<{ show: boolean; children: ReactNode }>) {
  if (!show) return null;
  return children;
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

function LeafHeader<TRow>({
  leaf,
  paintStyle,
  filterRegistry,
  closeHeaderFilterOnSelect,
  source,
  labels,
  resizeHandleStyle,
  onRenameColumn,
}: Readonly<{
  leaf: DesktopHeaderLeaf<TRow>;
  paintStyle: CSSProperties;
  filterRegistry: SharedTableRenderProps<TRow>["filterRegistry"];
  closeHeaderFilterOnSelect: boolean | undefined;
  source: SharedTableRenderProps<TRow>["table"]["source"];
  labels: Required<TableLabels>;
  resizeHandleStyle: CSSProperties;
  onRenameColumn: SharedTableRenderProps<TRow>["onRenameColumn"];
}>): ReactElement {
  const { column } = leaf;
  const headerStyle = { ...leaf.style, ...paintStyle };
  const spanProps = leaf.rowSpan > 1 ? { rowSpan: leaf.rowSpan } : {};
  const actions = column.headerActions ? (
    <span data-adapttable-part="header-actions">{column.headerActions}</span>
  ) : null;
  const columnSelect =
    leaf.showColumnCheckbox && leaf.onToggleColumn ? (
      <OptionalColumnSelect
        label={leaf.columnSelectAriaLabel}
        checked={leaf.columnCheckboxChecked}
        onToggle={leaf.onToggleColumn}
      />
    ) : null;
  const filterTrigger = leaf.headerDef ? (
    <OptionalFilterHeader
      def={leaf.headerDef}
      source={source}
      labels={labels}
      registry={filterRegistry}
      closeOnSelect={closeHeaderFilterOnSelect}
    />
  ) : null;
  const resizeHandle = leaf.resizeHandleProps ? (
    <span {...leaf.resizeHandleProps} style={resizeHandleStyle} />
  ) : null;
  const cellProps = {
    "data-adapttable-part": "header-cell" as const,
    ...leaf.headerProps,
    ...leaf.columnHeaderProps,
  };
  const caption = column.sortable ? (
    <Group
      component="button"
      gap={6}
      wrap="nowrap"
      display="inline-flex"
      title={column.headerTooltip}
      style={{
        background: "none",
        border: 0,
        cursor: "pointer",
        font: "inherit",
        padding: 0,
        color: leaf.sortActive
          ? "var(--mantine-primary-color-filled)"
          : "inherit",
      }}
      {...leaf.sortButtonProps}
    >
      <span>{leaf.caption}</span>
      <SortIcon active={leaf.sortActive} dir={leaf.sortDir} />
      {typeof leaf.sortIndex === "number" && (
        <Badge component="span" size="xs" variant="light">
          {leaf.sortIndex}
        </Badge>
      )}
    </Group>
  ) : (
    <span title={column.headerTooltip}>{leaf.caption}</span>
  );
  return (
    <Table.Th {...cellProps} {...spanProps} style={headerStyle}>
      <Group gap={4} wrap="nowrap" display="inline-flex" align="center">
        {column.renameable === true && onRenameColumn ? (
          <OptionalColumnHeaderRename
            columnKey={column.key}
            name={leaf.columnName}
            labels={labels}
            onRenameColumn={onRenameColumn}
          >
            <span data-adapttable-part="header-caption-control">{caption}</span>
          </OptionalColumnHeaderRename>
        ) : (
          <span data-adapttable-part="header-caption-control">{caption}</span>
        )}
      </Group>
      {columnSelect}
      {actions}
      {filterTrigger}
      {resizeHandle}
    </Table.Th>
  );
}

const MANTINE_WIDTHS = {
  expansion: 36,
  selection: 40,
  actions: 120,
} as const;

interface DesktopRowProps<TRow> extends DesktopRowWiring<TRow> {
  stickyHeader: boolean;
}

function rowExtrasEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return prev.stickyHeader === next.stickyHeader;
}

function DesktopRowBase<TRow>(
  props: Readonly<DesktopRowProps<TRow>>
): ReactElement {
  const {
    row,
    index,
    id,
    table,
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
    detailMeasureRef,
    rowDomProps,
    bodyPinStyle,
    stickyHeader,
  } = props;
  const expandable = expanded !== undefined;
  const rowSeparator: CSSProperties | undefined = stickyHeader
    ? { boxShadow: `inset 0 -1px 0 ${HAIRLINE}` }
    : undefined;
  const withRowSeparator = (
    style: CSSProperties | undefined
  ): CSSProperties | undefined => {
    if (!rowSeparator) return style;
    if (!style) return rowSeparator;
    return {
      ...style,
      boxShadow: style.boxShadow
        ? `${String(style.boxShadow)}, ${String(rowSeparator.boxShadow)}`
        : rowSeparator.boxShadow,
    };
  };
  const paintPin = (style: CSSProperties | undefined) =>
    withRowSeparator(style ? { ...style, background: SURFACE } : undefined);
  const expansionLead = expandable ? MANTINE_WIDTHS.expansion : 0;
  const selectionLead =
    expansionLead + (showReorder ? REORDER_COLUMN_WIDTH : 0);
  const expansionCellStyle = paintPin(
    leadingPinStyle(hasStartPin, 0, PIN_Z.body, SURFACE)
  );
  const paintedReorder = paintPin(
    leadingPinStyle(
      hasStartPin || reorderPinned,
      expansionLead,
      PIN_Z.body,
      SURFACE
    )
  );
  const paintedSelection = paintPin(
    leadingPinStyle(hasStartPin, selectionLead, PIN_Z.body, SURFACE)
  );
  const paintedActions = paintPin(
    edgePinStyle("end", hasEndPin || actionsPinned, PIN_Z.body)
  );
  const rowEdit = resolveRowEditTrigger(
    rowActions,
    editing?.rowEditing,
    row,
    id
  );
  const rowConflict = rowEditConflict(editing, id);
  return (
    <>
      <Table.Tr
        {...rowDomProps}
        ref={measureRef}
        className={rowClass}
        onMouseEnter={hasPrefetch ? () => onPrefetch(row) : undefined}
      >
        {expandable && (
          <Table.Td
            ta="center"
            style={{ ...expansionCellStyle, ...edgeRowPin }}
          >
            <OptionalExpandToggle
              id={id}
              expanded={Boolean(expanded)}
              onToggle={onToggleExpand}
              expandLabel={labels.expandRow}
              collapseLabel={labels.collapseRow}
            />
          </Table.Td>
        )}
        {showReorder && rowReorder && (
          <Table.Td
            data-adapttable-part="reorder-cell"
            ta="center"
            style={{ ...paintedReorder, ...edgeRowPin }}
          >
            <OptionalRowReorderHandle
              reorder={rowReorder}
              labels={labels}
              rowId={id}
              localIndex={index}
              row={row}
              windowStart={windowStart}
              rowCount={rowCount}
            />
          </Table.Td>
        )}
        {selected !== undefined && (
          <Table.Td
            data-adapttable-part="selection-cell"
            ta="center"
            style={{ ...paintedSelection, ...edgeRowPin }}
          >
            <Checkbox
              aria-label={labels.selectRow}
              checked={selected}
              onChange={() => onToggleSelect(id)}
            />
          </Table.Td>
        )}
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const pinStyle = paintPin(bodyPinStyle(column.key));
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          const cellProps = table.getCellProps(column as ColumnDef<TRow>);
          return (
            <Table.Td
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              data-adapttable-part="cell"
              data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
              data-cell-span={cellSpanMark(colSpan, rowSpan)}
              {...cellProps}
              {...focusProps}
              style={cellHighlightStyle(
                focusProps,
                {
                  ...cellProps.style,
                  ...pinStyle,
                  ...mergedCellStyle(colSpan, rowSpan, cellSpanAppearance),
                },
                {
                  background: "var(--mantine-primary-color-light)",
                }
              )}
            >
              <OptionalTreeCell
                entry={treeEntry}
                columnKey={column.key}
                treeColumnKey={treeKey}
                labels={{
                  expandRow: labels.expandRow,
                  collapseRow: labels.collapseRow,
                }}
                onToggle={onToggleTree}
              >
                <OptionalEditableCell
                  editing={editing}
                  row={row}
                  column={column as ColumnDef<TRow>}
                  rowId={id}
                  rowIndex={focusIndex}
                  rows={rows}
                  columns={columns}
                  rowKey={getRowId}
                  editLabel={labels.editCell}
                  undoLabel={labels.undoEdit}
                />
              </OptionalTreeCell>
              <OptionalFillHandle
                focus={gridFocus}
                windowIndex={focusIndex}
                col={columnIndex}
              />
            </Table.Td>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <Table.Td ta="end" style={{ ...paintedActions, ...edgeRowPin }}>
            {editing?.rowEditing && (
              <OptionalRowEditActions
                rowEditing={editing.rowEditing}
                row={row}
                rowId={id}
                showBegin={rowEdit.showBegin}
                icons={editing.rowEditIcons}
                conflict={rowConflict}
                labels={{
                  editRow: labels.editRow,
                  saveRow: labels.saveRow,
                  cancel: labels.cancel,
                }}
              />
            )}
            {rowEdit.actions.length > 0 && (
              <RowActionButtons
                row={row}
                actions={rowEdit.actions}
                confirm={confirm}
                labels={labels}
                layout={rowActionsLayout}
                render={renderRowActions}
              />
            )}
          </Table.Td>
        )}
      </Table.Tr>
      {expandable && expanded && (
        <Table.Tr ref={detailMeasureRef}>
          <Table.Td colSpan={columnSpan}>{renderDetail(row)}</Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

/** Desktop table rendering driven by core prop-getters. */
export function DesktopTable<TRow>(props: Readonly<DesktopTableProps<TRow>>) {
  const {
    className,
    bodyRef,
    density = "comfortable",
    filterRegistry,
    closeHeaderFilterOnSelect,
    stickyHeader = false,
  } = props;
  const assembly = useDesktopTableAssembly(
    { ...props, stickyTop: props.stickyHeaderOffset },
    { widths: MANTINE_WIDTHS }
  );
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
    resizeHandleStyle,
    widths,
  } = assembly;
  const { columns, selection, labels, showActions, showReorder, leadingCells } =
    model;

  const headerChrome: CSSProperties = {
    background: SURFACE,
    ...pin.stickyStyle,
    ...(stickyHeader ? { boxShadow: `0 1px 0 ${HAIRLINE}` } : {}),
  };
  const expansionHeaderStyle: CSSProperties = {
    ...headerChrome,
    ...leadingPinStyle(pin.hasStartPin, 0, PIN_Z.headerPinned),
  };
  const reorderHeaderStyle: CSSProperties = {
    ...headerChrome,
    ...leadingPinStyle(
      pin.hasStartPin || Boolean(props.reorderPinned),
      pin.expansionLead,
      PIN_Z.headerPinned
    ),
  };
  const selectionHeaderStyle: CSSProperties = {
    ...headerChrome,
    ...leadingPinStyle(pin.hasStartPin, pin.selectionLead, PIN_Z.headerPinned),
  };
  const actionsHeaderStyle: CSSProperties = {
    ...headerChrome,
    ...edgePinStyle(
      "end",
      pin.hasEndPin || pin.stickActions,
      PIN_Z.headerPinned
    ),
  };
  const leafPaint: CSSProperties = {
    background: SURFACE,
    ...(stickyHeader ? { boxShadow: `0 1px 0 ${HAIRLINE}` } : {}),
  };

  const leafProps = {
    paintStyle: leafPaint,
    filterRegistry,
    closeHeaderFilterOnSelect,
    source: props.table.source,
    labels,
    resizeHandleStyle,
    onRenameColumn: props.onRenameColumn,
  };

  const renderPlanCell = (cell: HtmlGroupedHeaderCell): ReactElement => {
    if (cell.kind === "leaf") {
      const column = columns[cell.columnIndex];
      if (!column) return <Fragment key={cell.key} />;
      return (
        <LeafHeader
          key={cell.key}
          leaf={header.leaf(column, cell.columnIndex, cell.rowSpan)}
          {...leafProps}
        />
      );
    }
    return (
      <Table.Th
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        ta={groupedHeaderAlign(cell.cell.align)}
        fw={600}
        data-adapttable-part="header-group-cell"
        style={groupedHeaderCellStyle(cell, HAIRLINE)}
      >
        <span style={groupedHeaderLabelStyle()}>
          {props.onToggleColumnGroup ? (
            <OptionalColumnGroupToggle
              cell={cell.cell}
              labels={labels}
              onToggle={props.onToggleColumnGroup}
            />
          ) : null}
          {columnGroupHeaderCaption(cell.cell)}
        </span>
      </Table.Th>
    );
  };

  const leadingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.leading.expand && (
        <Table.Th
          w={widths.expansion}
          ta="center"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={expansionHeaderStyle}
        >
          <VisuallyHidden>{labels.expandRow}</VisuallyHidden>
        </Table.Th>
      )}
      <When show={header.leading.reorder}>
        <Table.Th
          w={widths.reorder}
          ta="center"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          aria-label={labels.reorderRow}
          data-adapttable-part="reorder-header"
          style={reorderHeaderStyle}
        />
      </When>
      {header.leading.selection && selection && (
        <Table.Th
          data-adapttable-part="selection-header"
          w={widths.selection}
          ta="center"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
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
    </>
  );

  const trailingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.trailing.actions && (
        <Table.Th
          ta="end"
          w={widths.actions}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={actionsHeaderStyle}
        >
          {labels.actions}
        </Table.Th>
      )}
    </>
  );

  const { verticalSpacing, horizontalSpacing } = DENSITY_SPACING[density];
  const minWidth =
    typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;

  return (
    <div
      ref={scroll.bindScrollBox}
      style={{ width: "100%", ...scroll.boxStyle }}
    >
      <Table
        data-adapttable-part="table"
        {...tableProps}
        {...gridProps}
        className={className}
        highlightOnHover
        verticalSpacing={verticalSpacing}
        horizontalSpacing={horizontalSpacing}
        style={{
          minWidth: Math.max(480, minWidth),
          ...(stickyHeader
            ? { borderCollapse: "separate" as const, borderSpacing: 0 }
            : {}),
          ...(tableStyle?.tableLayout
            ? { tableLayout: tableStyle.tableLayout }
            : {}),
          ...(tableStyle?.width ? { width: tableStyle.width } : {}),
        }}
      >
        <Table.Thead
          data-adapttable-part="thead"
          ref={header.theadRef}
          style={{ background: SURFACE }}
        >
          {headerPlan ? (
            headerPlan.map((row, rowIndex) => {
              const last = rowIndex === headerPlan.length - 1;
              return (
                <Table.Tr
                  key={row.map((cell) => cell.key).join("|")}
                  {...(last ? header.headerRowProps : {})}
                  ref={last ? header.headerRowRef : undefined}
                  data-adapttable-part={
                    last ? "header-row" : "header-group-row"
                  }
                >
                  {rowIndex === 0 ? leadingHeaders(headerBand) : null}
                  {row.map(renderPlanCell)}
                  {rowIndex === 0 ? trailingHeaders(headerBand) : null}
                </Table.Tr>
              );
            })
          ) : (
            <Table.Tr
              {...header.headerRowProps}
              ref={header.headerRowRef}
              data-adapttable-part="header-row"
            >
              {leadingHeaders(1)}
              {columns.map((column, headerIndex) => (
                <LeafHeader
                  key={column.key}
                  leaf={header.leaf(column, headerIndex)}
                  {...leafProps}
                />
              ))}
              {trailingHeaders(1)}
            </Table.Tr>
          )}
        </Table.Thead>
        <Table.Tbody ref={bodyRef} data-adapttable-part="tbody">
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
                <Table.Tr key={slot.key} aria-hidden>
                  <Table.Td
                    colSpan={slot.colSpan}
                    style={{ height: slot.height, padding: 0 }}
                  />
                </Table.Tr>
              );
            }
            if (slot.kind === "group") {
              return (
                <OptionalGroupHeaderRow
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
              <Row
                key={slot.key}
                {...slot.wiring}
                stickyHeader={stickyHeader}
              />
            );
          })}
        </Table.Tbody>
        {showColumnFooter && (
          <Table.Tfoot>
            <Table.Tr>
              {header.leading.expand && <Table.Td />}
              <When show={showReorder}>
                <Table.Td />
              </When>
              {selection && <Table.Td />}
              {columns.map((column) => (
                <Table.Td
                  key={column.key}
                  {...props.table.getCellProps(column)}
                  fw={600}
                  c="dimmed"
                >
                  {resolveColumnFooter(column, summary?.[column.key])}
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
