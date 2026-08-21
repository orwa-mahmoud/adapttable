/** The desktop `<table>`: header, pinned columns, rows and summary. */
import {
  columnGroupHeaderCaption,
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
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";

import type { BaseUiAccentColor } from "../types";
import { Box, Table, Text } from "../ui";
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

type TableSize = "1" | "2" | "3";

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

/** Opaque background for sticky/pinned cells (the panel surface). */
const PIN_BG = "var(--adapttable-surface, #ffffff)";

/**
 * Ensure pinned columns stick against our scroll wrapper via a min-width
 * custom property on the wrapper.
 */
const STICKY_FIX_CLASS = "adapttable-base-ui-scroll";

const STICKY_FIX_CSS = `.${STICKY_FIX_CLASS} table{overflow:visible;min-width:var(--adapttable-min-width,0)}`;

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
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

const justifyFor = logicalAlign;
const sortGlyph = (sort: unknown): string => sortArrow(sort) + "\uFE0E";
const edgeCellStyle = (side: PinSide, active: boolean, z: number, shift = 0) =>
  pinnedEdgeCellStyle(side, active, z, PIN_BG, shift);

interface DesktopRowProps<TRow> extends DesktopRowWiring<TRow> {
  size: TableSize;
  accentColor?: BaseUiAccentColor;
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
        style={{
          background: selected ? "var(--gray-a3)" : undefined,
          ...(rowDomProps.style as CSSProperties | undefined),
        }}
        onMouseEnter={hasPrefetch ? () => onPrefetch(row) : undefined}
      >
        {expandable && (
          <Table.Cell
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
              justify={
                mergedCellStyle(colSpan, rowSpan, cellSpanAppearance)
                  ? "center"
                  : justifyFor(column.align)
              }
              style={cellHighlightStyle(
                focusProps,
                {
                  ...dataPinStyle(column.key),
                  ...mergedCellStyle(colSpan, rowSpan, cellSpanAppearance),
                },
                {
                  background:
                    "var(--adapttable-cell-selected, rgba(59, 130, 246, 0.14))",
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
            justify="end"
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
  stickify,
  flexShares,
  columnWidths,
  filterRegistry,
  closeHeaderFilterOnSelect,
  source,
  labels,
  resizeHandleStyle,
}: Readonly<{
  leaf: DesktopHeaderLeaf<TRow>;
  stickify: (base: CSSProperties | undefined) => CSSProperties | undefined;
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
  const style = stickify({
    ...leaf.style,
    ...columnSizeStyle(column, flexShares, columnWidths?.[column.key]),
  });
  return (
    <Table.ColumnHeaderCell
      key={column.key}
      data-adapttable-part="header-cell"
      {...leaf.columnHeaderProps}
      justify={justifyFor(column.align)}
      aria-sort={ariaSort}
      data-column-key={column.key}
      rowSpan={leaf.rowSpan > 1 ? leaf.rowSpan : undefined}
      style={style}
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
              size="1"
              weight="bold"
              ml="1"
              style={{
                borderRadius: "9999px",
                padding: "0 0.4em",
                background: "var(--gray-a3)",
              }}
            >
              {leaf.sortIndex}
            </Text>
          )}
        </button>
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
        <span style={resizeHandleStyle} {...leaf.resizeHandleProps} />
      )}
    </Table.ColumnHeaderCell>
  );
}

/** Desktop Base UI table. */
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
  const stickify = (
    base: CSSProperties | undefined
  ): CSSProperties | undefined => {
    if (!stickyHeader) return base;
    const top = pin.inScrollBox ? 0 : pin.headerStickTop;
    if (base?.position === "sticky")
      return { ...base, top, background: PIN_BG };
    return {
      ...base,
      position: "sticky",
      top,
      zIndex: PIN_Z.header,
      background: PIN_BG,
    };
  };
  const leafProps = {
    stickify,
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
      <Table.ColumnHeaderCell
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        justify={groupedHeaderAlign(cell.cell.align)}
        data-adapttable-part="header-group-cell"
        style={groupedHeaderCellStyle(
          cell,
          "var(--gray-a6, color-mix(in srgb, currentColor 22%, transparent))"
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
      </Table.ColumnHeaderCell>
    );
  };

  const leadingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.leading.expand && (
        <Table.ColumnHeaderCell
          aria-label={labels.expandRow}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={stickify(
            edgeCellStyle("start", pin.hasStartPin, PIN_Z.headerPinned)
          )}
        />
      )}
      <When show={header.leading.reorder}>
        <Table.ColumnHeaderCell
          aria-label={labels.reorderRow}
          data-adapttable-part="reorder-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={stickify(
            edgeCellStyle(
              "start",
              pin.hasStartPin || Boolean(props.reorderPinned),
              PIN_Z.headerPinned,
              pin.expansionLead
            )
          )}
        />
      </When>
      {header.leading.selection && selection && (
        <Table.ColumnHeaderCell
          data-adapttable-part="selection-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={stickify(
            edgeCellStyle(
              "start",
              pin.hasStartPin,
              PIN_Z.headerPinned,
              pin.selectionLead
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
        <Table.ColumnHeaderCell
          justify="end"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          style={stickify(
            edgeCellStyle(
              "end",
              pin.hasEndPin || pin.stickActions,
              PIN_Z.headerPinned
            )
          )}
        >
          {labels.actions}
        </Table.ColumnHeaderCell>
      )}
    </>
  );

  const minWidth =
    typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        scroll.bindScrollBox(node);
        node?.style.setProperty(
          "--adapttable-min-width",
          minWidth > 0 ? `${minWidth}px` : "0"
        );
      }}
      className={STICKY_FIX_CLASS}
      style={{
        maxHeight: maxHeight == null ? undefined : `${maxHeight}px`,
        overflowX:
          maxHeight != null || pin.hasPinned || scroll.overflowing
            ? "auto"
            : undefined,
        overflowY: maxHeight == null ? undefined : "auto",
      }}
    >
      <style>{STICKY_FIX_CSS}</style>
      <Table.Root
        size={size}
        variant="surface"
        data-size={size}
        className={className}
        aria-label={tableProps["aria-label"]}
        {...gridProps}
        tableStyle={
          tableStyle
            ? { tableLayout: tableStyle.tableLayout, width: tableStyle.width }
            : undefined
        }
      >
        <thead data-adapttable-part="thead" ref={header.theadRef}>
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
        </thead>
        <tbody data-adapttable-part="tbody">
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
                <tr key={slot.key} aria-hidden>
                  <td
                    colSpan={slot.colSpan}
                    style={{ height: slot.height, padding: 0 }}
                  />
                </tr>
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
          {showColumnFooter && (
            <Table.Row data-summary="">
              {header.leading.expand && <Table.Cell />}
              <When show={showReorder}>
                <Table.Cell />
              </When>
              {selection && <Table.Cell />}
              {columns.map((column) => (
                <Table.Cell key={column.key} justify={justifyFor(column.align)}>
                  {resolveColumnFooter(column, summary?.[column.key])}
                </Table.Cell>
              ))}
              {showActions && <Table.Cell />}
            </Table.Row>
          )}
        </tbody>
      </Table.Root>
    </Box>
  );
}
