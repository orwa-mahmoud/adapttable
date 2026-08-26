/** The desktop `<table>`: header, pinned columns, rows and summary. */
import {
  type Direction,
  PIN_Z,
  type PinSide,
  resolveColumnFooter,
  type TableLabels,
} from "@adapttable/core";
import {
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
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderLabelStyle,
  type HtmlGroupedHeaderCell,
  logicalAlign,
  mergedCellStyle,
  pinnedEdgeCellStyle,
  REORDER_COLUMN_WIDTH,
  type SharedTableRenderProps,
  sortArrow,
  useDesktopTableAssembly,
} from "@adapttable/core/adapter";
import { Box, chakra, Table, Text } from "@chakra-ui/react";
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";

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
import { Checkbox } from "./primitives";
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
    <Table.Row
      data-adapttable-part={parts.row}
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <Table.Cell
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </Table.Cell>
    </Table.Row>
  );
}

const EXPANSION_WIDTH = 32;
const SELECTION_WIDTH = 48;
const ACTIONS_WIDTH = 120;
const KIT_WIDTHS = {
  expansion: EXPANSION_WIDTH,
  selection: SELECTION_WIDTH,
  actions: ACTIONS_WIDTH,
} as const;

function When({
  show,
  children,
}: Readonly<{ show: boolean; children: ReactNode }>) {
  if (!show) return null;
  return children;
}

/**
 * Opaque background for sticky/pinned cells — the Chakra v3 body-background
 * token (`--chakra-colors-bg`). The old v2 `chakra-body-bg` token does not
 * exist in v3, so it resolved to transparent and scrolled columns bled through
 * the pinned ones.
 */
const PIN_BG = "var(--chakra-colors-bg)";

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
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

const sortGlyph = sortArrow;

const edgeCellStyle = (side: PinSide, active: boolean, z: number, shift = 0) =>
  pinnedEdgeCellStyle(side, active, z, PIN_BG, shift);

interface DesktopRowProps<TRow> extends DesktopRowWiring<TRow> {
  size: "sm" | "md" | "lg";
  accentColor?: string;
  dir?: Direction;
}

function rowExtrasEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return (
    prev.size === next.size &&
    prev.dir === next.dir &&
    prev.accentColor === next.accentColor
  );
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
    accentColor,
    dir,
  } = props;
  const expandable = expanded !== undefined;
  const dataPinStyle = (key: string) => {
    const pin = bodyPinStyle(key);
    if (!pin) return undefined;
    return { ...pin, background: pin.background ?? PIN_BG };
  };
  return (
    <>
      <Table.Row
        {...rowDomProps}
        ref={measureRef}
        className={rowClass}
        bg={selected ? "blackAlpha.100" : undefined}
        _dark={{ bg: selected ? "whiteAlpha.200" : undefined }}
        onMouseEnter={hasPrefetch ? () => onPrefetch(row) : undefined}
      >
        {expandable && (
          <Table.Cell
            px={1}
            style={{
              ...edgeCellStyle("start", hasStartPin, PIN_Z.body),
              ...edgeRowPin,
            }}
          >
            <ExpandToggle
              open={Boolean(expanded)}
              dir={dir}
              labels={labels}
              onToggle={() => onToggleExpand(id)}
            />
          </Table.Cell>
        )}
        {showReorder && rowReorder && (
          <Table.Cell
            data-adapttable-part="reorder-cell"
            px={1}
            style={{
              ...edgeCellStyle(
                "start",
                hasStartPin || reorderPinned,
                PIN_Z.body,
                expandable ? EXPANSION_WIDTH : 0
              ),
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
          </Table.Cell>
        )}
        {selected !== undefined && (
          <Table.Cell
            data-adapttable-part="selection-cell"
            style={{
              ...edgeCellStyle(
                "start",
                hasStartPin,
                PIN_Z.body,
                (expandable ? EXPANSION_WIDTH : 0) +
                  (showReorder ? REORDER_COLUMN_WIDTH : 0)
              ),
              ...edgeRowPin,
            }}
          >
            <Checkbox
              aria-label={labels.selectRow}
              checked={selected}
              onToggle={() => onToggleSelect(id)}
            />
          </Table.Cell>
        )}
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          return (
            <Table.Cell
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              data-adapttable-part="cell"
              data-cell-span={cellSpanMark(colSpan, rowSpan)}
              {...focusProps}
              textAlign={
                mergedCellStyle(colSpan, rowSpan, cellSpanAppearance)
                  ? "center"
                  : logicalAlign(column.align)
              }
              style={cellHighlightStyle(
                focusProps,
                {
                  ...dataPinStyle(column.key),
                  ...mergedCellStyle(colSpan, rowSpan, cellSpanAppearance),
                },
                {
                  background: "var(--chakra-colors-bg-subtle)",
                }
              )}
            >
              <TreeCell
                entry={treeEntry}
                columnKey={column.key}
                treeColumnKey={treeKey}
                labels={labels}
                onToggle={onToggleTree}
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
                  undoLabel={labels.undoEdit}
                  display={
                    column.Cell ? (
                      <column.Cell row={row} rowIndex={focusIndex} />
                    ) : (
                      column.accessor?.(row)
                    )
                  }
                />
              </TreeCell>
              <FillHandle
                focus={gridFocus}
                windowIndex={focusIndex}
                col={columnIndex}
              />
            </Table.Cell>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <Table.Cell
            textAlign="end"
            style={{
              ...edgeCellStyle("end", hasEndPin || actionsPinned, PIN_Z.body),
              ...edgeRowPin,
            }}
          >
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
                accentColor={accentColor}
              />
            )}
          </Table.Cell>
        )}
      </Table.Row>
      {expandable && expanded && (
        <Table.Row>
          <Table.Cell colSpan={columnSpan}>{renderDetail(row)}</Table.Cell>
        </Table.Row>
      )}
    </>
  );
}

function LeafHeader<TRow>({
  leaf,
  stickyTh,
  flexShares,
  columnWidths,
  filterRegistry,
  closeHeaderFilterOnSelect,
  source,
  labels,
  resizeHandleStyle,
}: Readonly<{
  leaf: DesktopHeaderLeaf<TRow>;
  stickyTh: Record<string, unknown>;
  flexShares: ReturnType<typeof columnFlexShares>;
  columnWidths: SharedTableRenderProps<TRow>["columnWidths"];
  filterRegistry: SharedTableRenderProps<TRow>["filterRegistry"];
  closeHeaderFilterOnSelect: boolean | undefined;
  source: SharedTableRenderProps<TRow>["table"]["source"];
  labels: Required<TableLabels>;
  resizeHandleStyle: CSSProperties;
}>): ReactElement {
  const { column } = leaf;
  const ariaSort = leaf.headerProps["aria-sort"] as
    | "ascending"
    | "descending"
    | "none"
    | undefined;
  const leafStyle = {
    ...leaf.style,
    ...columnSizeStyle(column, flexShares, columnWidths?.[column.key]),
  };
  return (
    <Table.ColumnHeader
      key={column.key}
      data-adapttable-part="header-cell"
      {...leaf.columnHeaderProps}
      textAlign={logicalAlign(column.align)}
      width={column.width}
      aria-sort={ariaSort}
      data-column-key={column.key}
      rowSpan={leaf.rowSpan > 1 ? leaf.rowSpan : undefined}
      {...stickyTh}
      style={leafStyle}
    >
      {column.sortable ? (
        <chakra.button
          type="button"
          cursor="pointer"
          aria-label={`${labels.sortBy}: ${leaf.columnName}`}
          onClick={leaf.sortButtonProps.onClick}
          title={column.headerTooltip}
        >
          {leaf.caption}
          <Text as="span" aria-hidden>
            {sortGlyph(ariaSort)}
          </Text>
          {leaf.sortIndex !== undefined && (
            <Text
              as="span"
              aria-hidden
              data-sort-index={leaf.sortIndex}
              fontSize="0.7em"
              fontWeight="bold"
              borderRadius="full"
              px={1.5}
              ms={1}
              bg="blackAlpha.200"
              _dark={{ bg: "whiteAlpha.300" }}
            >
              {leaf.sortIndex}
            </Text>
          )}
        </chakra.button>
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
        <Box as="span" style={resizeHandleStyle} {...leaf.resizeHandleProps} />
      )}
    </Table.ColumnHeader>
  );
}

/** Desktop Chakra table. */
export function DesktopTable<TRow>(props: Readonly<SharedProps<TRow>>) {
  const {
    size,
    accentColor,
    dir,
    className,
    filterRegistry,
    closeHeaderFilterOnSelect,
    columnWidths,
    fitColumns,
    stickyHeader = false,
    maxHeight,
  } = props;
  const assembly = useDesktopTableAssembly(props, { widths: KIT_WIDTHS });
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
  const stickyTh = stickyHeader
    ? {
        position: "sticky" as const,
        top: pin.inScrollBox ? "0px" : `${pin.headerStickTop}px`,
        zIndex: PIN_Z.header,
        bg: "bg",
      }
    : {};
  const leafProps = {
    stickyTh,
    flexShares,
    columnWidths,
    filterRegistry,
    closeHeaderFilterOnSelect,
    source: props.table.source,
    labels,
    resizeHandleStyle,
  };

  const renderPlanCell = (cell: HtmlGroupedHeaderCell): ReactElement => {
    if (cell.kind === "leaf") {
      return (
        <LeafHeader
          key={cell.key}
          leaf={header.leaf(
            columns[cell.columnIndex]!,
            cell.columnIndex,
            cell.rowSpan
          )}
          {...leafProps}
        />
      );
    }
    return (
      <Table.ColumnHeader
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        textAlign={groupedHeaderAlign(cell.cell.align)}
        fontWeight="semibold"
        textTransform="none"
        data-adapttable-part="header-group-cell"
        style={groupedHeaderCellStyle(
          cell,
          "var(--chakra-colors-border, color-mix(in srgb, currentColor 22%, transparent))"
        )}
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
      </Table.ColumnHeader>
    );
  };

  const leadingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.leading.expand && (
        <Table.ColumnHeader
          {...stickyTh}
          aria-label={labels.expandRow}
          width={`${EXPANSION_WIDTH}px`}
          px={1}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={edgeCellStyle("start", pin.hasStartPin, PIN_Z.headerPinned)}
        />
      )}
      <When show={header.leading.reorder}>
        <Table.ColumnHeader
          {...stickyTh}
          aria-label={labels.reorderRow}
          data-adapttable-part="reorder-header"
          width={`${REORDER_COLUMN_WIDTH}px`}
          px={1}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={edgeCellStyle(
            "start",
            pin.hasStartPin || Boolean(props.reorderPinned),
            PIN_Z.headerPinned,
            pin.expansionLead
          )}
        />
      </When>
      {header.leading.selection && selection && (
        <Table.ColumnHeader
          data-adapttable-part="selection-header"
          {...stickyTh}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={edgeCellStyle(
            "start",
            pin.hasStartPin,
            PIN_Z.headerPinned,
            pin.selectionLead
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
        <Table.ColumnHeader
          textAlign="end"
          {...stickyTh}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={edgeCellStyle(
            "end",
            pin.hasEndPin || pin.stickActions,
            PIN_Z.headerPinned
          )}
        >
          {labels.actions}
        </Table.ColumnHeader>
      )}
    </>
  );

  const minWidth =
    typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;

  return (
    <Box
      ref={scroll.bindScrollBox}
      maxH={maxHeight == null ? undefined : `${maxHeight}px`}
      overflowX={
        maxHeight != null || pin.hasPinned || scroll.overflowing
          ? "auto"
          : undefined
      }
      overflowY={maxHeight == null ? undefined : "auto"}
    >
      <Table.Root
        data-adapttable-part="table"
        size={size}
        data-size={size}
        className={className}
        minW={minWidth > 0 ? `${minWidth}px` : undefined}
        aria-label={tableProps["aria-label"]}
        {...gridProps}
        style={
          tableStyle
            ? { tableLayout: tableStyle.tableLayout, width: tableStyle.width }
            : undefined
        }
      >
        <Table.Header data-adapttable-part="thead" ref={header.theadRef}>
          {headerPlan ? (
            headerPlan.map((row, rowIndex) => {
              const last = rowIndex === headerPlan.length - 1;
              return (
                <Table.Row
                  key={row.map((cell) => cell.key).join("|")}
                  ref={last ? header.headerRowRef : undefined}
                  data-adapttable-part={
                    last ? "header-row" : "header-group-row"
                  }
                >
                  {rowIndex === 0 ? leadingHeaders(headerBand) : null}
                  {row.map(renderPlanCell)}
                  {rowIndex === 0 ? trailingHeaders(headerBand) : null}
                </Table.Row>
              );
            })
          ) : (
            <Table.Row
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
            </Table.Row>
          )}
        </Table.Header>
        <Table.Body data-adapttable-part="tbody">
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
                <Table.Row key={slot.key} aria-hidden>
                  <Table.Cell
                    colSpan={slot.colSpan}
                    style={{ height: slot.height, padding: 0 }}
                  />
                </Table.Row>
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
                  dir={dir}
                  accentColor={accentColor}
                  onToggleCollapse={callbacks.onToggleGroup}
                  onShowMore={props.grouping?.showMore ?? (() => undefined)}
                />
              );
            }
            return (
              <Row
                key={slot.key}
                {...slot.wiring}
                size={size}
                accentColor={accentColor}
                dir={dir}
              />
            );
          })}
        </Table.Body>
        {showColumnFooter && (
          <Table.Footer>
            <Table.Row>
              {header.leading.expand && <Table.Cell px={1} />}
              <When show={showReorder}>
                <Table.Cell px={1} />
              </When>
              {selection && <Table.Cell />}
              {columns.map((column) => (
                <Table.Cell
                  key={column.key}
                  textAlign={logicalAlign(column.align)}
                >
                  {resolveColumnFooter(column, summary?.[column.key])}
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
