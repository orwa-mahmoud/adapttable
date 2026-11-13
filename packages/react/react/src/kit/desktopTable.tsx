/**
 * The desktop table, drawn once for every kit.
 *
 * The binding owns each row and header cell: the leading rails (expand,
 * reorder, select), the column-window spacers, the data cells with their tree,
 * editing and fill-handle chrome, the trailing actions rail, the detail row,
 * the header leaves and groups, the virtual spacers and the column summary.
 * A kit hands over its table elements, a checkbox, its sort control and row
 * actions, and the paint that keeps rails and pinned cells opaque in its own
 * colours.
 */
import {
  cellFlashAttr,
  PINNED_SUMMARY_BOTTOM_PART,
  PINNED_SUMMARY_TOP_PART,
} from "@adapttable/core";
import {
  cellSpanMark,
  columnGroupHeaderCaption,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  groupedHeaderLabelStyle,
  type HtmlGroupedHeaderCell,
} from "@adapttable/core/binding";
import {
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useMemo,
} from "react";

import { VISUALLY_HIDDEN } from "../a11y/visuallyHidden";
import type { ColumnDef } from "../columnDef";
import { resolveColumnFooter } from "../columns/columnHeader";
import {
  cellHighlightStyle,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  mergedCellStyle,
} from "../display";
import {
  resolveRowEditTrigger,
  rowEditConflict,
} from "../editing/rowEditTrigger";
import {
  createDesktopRow,
  type DesktopHeaderLeaf,
  type DesktopRowWiring,
  type DesktopTableAssembly,
  type DesktopTablePin,
  useDesktopTableAssembly,
} from "../layout/desktopTableAssembly";
import {
  DesktopTableChrome,
  type DesktopTableChromeProps,
} from "../layout/desktopTableChrome";
import { REORDER_COLUMN_WIDTH } from "../rows/rowReorder";
import type { SharedTableRenderProps } from "../tableRenderProps";
import type { SortButtonElementProps } from "../useDataTable/useDataTable";
import { ColumnSpacer } from "../virtual/ColumnSpacer";
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
import { type KitUsePartClass, noPartClass } from "./partClass";
import type { KitCheckboxProps, KitDataAttributes } from "./primitives";

/**
 * Which body or summary cell a kit is drawing: a leading rail cell, a data
 * cell, the trailing actions cell, a detail, extra or spacer row's cell, or a
 * column summary.
 *
 * @public
 */
export type KitDesktopCellKind =
  "lead" | "data" | "actions" | "detail" | "extra" | "pad" | "summary";

/**
 * A body or summary cell: the binding's attributes and style, plus which
 * cell it is so the kit can give it its padding and type.
 *
 * @public
 */
export interface KitDesktopCellProps
  extends
    Omit<TdHTMLAttributes<HTMLTableCellElement>, "align">,
    KitDataAttributes {
  /** Which cell this is. */
  readonly kind: KitDesktopCellKind;
}

/**
 * Which header cell a kit is drawing: a leading rail, a column leaf, a group
 * over columns, or the trailing actions rail.
 *
 * @public
 */
export type KitDesktopHeaderCellKind = "lead" | "leaf" | "group" | "actions";

/**
 * A header cell: the binding's attributes and style, plus which cell it is
 * and, for a rail, the width the table reserves for it.
 *
 * @public
 */
export interface KitDesktopHeaderCellProps
  extends
    Omit<ThHTMLAttributes<HTMLTableCellElement>, "align">,
    KitDataAttributes {
  /** Which header cell this is. */
  readonly kind: KitDesktopHeaderCellKind;
  /** The reserved width of a rail column, in pixels. */
  readonly railWidth?: number;
}

/**
 * A body row: the binding's attributes, its measuring ref and whether the row
 * is selected, which the kit shows its own way.
 *
 * @public
 */
export interface KitDesktopRowProps
  extends HTMLAttributes<HTMLTableRowElement>, KitDataAttributes {
  /** A data row, its detail, an extra row, a virtual spacer or the summary. */
  readonly kind: "body" | "detail" | "extra" | "pad" | "summary";
  /** The row element, measured by the virtualizer. */
  readonly elementRef?: Ref<HTMLTableRowElement>;
  /** Whether the row is selected. Absent on rows that cannot be. */
  readonly selected?: boolean;
}

/**
 * A column header's sort control: the caption it wraps and the state the
 * kit shows.
 *
 * @public
 */
export interface KitSortLabelProps {
  /** Whether the column is sorted. */
  readonly active: boolean;
  /** Its direction while sorted. */
  readonly dir: "asc" | "desc" | undefined;
  /** Its place among several sorted columns, when there are several. */
  readonly index: number | undefined;
  /** The header's tooltip. */
  readonly title: string | undefined;
  /** The control's name, click and keyboard wiring. */
  readonly buttonProps: SortButtonElementProps;
  /** The caption. */
  readonly children: ReactNode;
}

/**
 * The state a row's paint depends on.
 *
 * @public
 */
export interface KitDesktopRowState {
  /** The row sticks above or below the scrolling rows. */
  readonly rowPinned: boolean;
  /** The header sticks over the rows. */
  readonly stickyHeader: boolean;
}

/**
 * What a column leaf header's paint depends on.
 *
 * @public
 */
export interface KitDesktopLeafState {
  /** The leaf's own style: where it sticks while its column is pinned. */
  readonly style: CSSProperties;
  /** Whether the column sticks while the others scroll. */
  readonly pinned: boolean;
  /** How many header rows the leaf spans. */
  readonly rowSpan: number;
  /** The column's width and alignment, as its cells take them. */
  readonly size: CSSProperties;
}

/**
 * How a kit paints rails and pinned cells so the rows scrolling beneath them
 * never show through, in its own surface colours.
 *
 * @public
 */
export interface KitDesktopPaint {
  /**
   * A body rail cell.
   *
   * @param side - Which edge the rail is on.
   * @param pinned - Whether it sticks while columns scroll.
   * @param inset - How far from its edge it sticks, past the rails before it.
   * @param row - The row it is in.
   */
  readonly rail: (
    side: "start" | "end",
    pinned: boolean,
    inset: number,
    row: KitDesktopRowState
  ) => CSSProperties | undefined;
  /**
   * A body data cell.
   *
   * @param pin - The column's sticky style, while the column is pinned.
   * @param row - The row it is in.
   */
  readonly cell: (
    pin: CSSProperties | undefined,
    row: KitDesktopRowState
  ) => CSSProperties | undefined;
  /** What a cell inside the cell selection adds. */
  readonly selectedCell: CSSProperties;
  /**
   * The kit marks selected and matched cells by class alone: the binding
   * adds no inline highlight to them, and a merged cell's fill steps aside
   * so the class shows.
   */
  readonly classHighlight?: boolean;
  /** What a data cell of a pinned total row adds; absent, semibold type. */
  readonly summaryCell?: CSSProperties;
  /**
   * A header rail cell, like {@link KitDesktopPaint.rail}.
   *
   * @param pin - The table's pin geometry: where the header sticks.
   */
  readonly headRail: (
    side: "start" | "end",
    pinned: boolean,
    inset: number,
    pin: DesktopTablePin
  ) => CSSProperties | undefined;
  /** A column leaf header's whole style. */
  readonly leaf: (
    leaf: KitDesktopLeafState,
    pin: DesktopTablePin
  ) => CSSProperties | undefined;
  /** A header over a group of columns. */
  readonly group: (
    cell: Exclude<HtmlGroupedHeaderCell, { readonly kind: "leaf" }>
  ) => CSSProperties;
  /** The column resize handle, given the binding's own style for it. */
  readonly resizeHandle: (style: CSSProperties) => CSSProperties;
  /**
   * The row that holds a column header's caption, given the column's
   * alignment. Absent, the caption row is inline and follows the cell's
   * alignment.
   */
  readonly captionRow?: (align: ColumnDef<unknown>["align"]) => CSSProperties;
}

/**
 * The props a kit's desktop table takes: the shared render bundle, plus what
 * the kit itself adds.
 *
 * @public
 */
export type KitDesktopTableProps<TRow, TExtra> =
  SharedTableRenderProps<TRow> & {
    /** Text direction, when the host set one. */
    readonly dir?: "ltr" | "rtl";
  } & TExtra;

/**
 * What a kit hands {@link createDesktopTable}.
 *
 * @typeParam TExtra - The props the kit's table takes beyond the shared ones.
 *
 * @public
 */
export interface KitDesktopTable<TExtra> {
  /** The width of each rail column, in pixels. */
  readonly widths: {
    readonly expansion: number;
    readonly selection: number;
    readonly actions: number;
  };
  /** A body row. */
  readonly Row: ComponentType<KitDesktopRowProps>;
  /** A body or summary cell. */
  readonly Cell: ComponentType<KitDesktopCellProps>;
  /** A header cell. */
  readonly HeaderCell: ComponentType<KitDesktopHeaderCellProps>;
  /** The summary row's section. */
  readonly Foot: ComponentType<{
    readonly "data-adapttable-part": string;
    readonly children: ReactNode;
  }>;
  /** The selection checkboxes. */
  readonly Checkbox: ComponentType<KitCheckboxProps>;
  /** A sortable column's caption. */
  readonly SortLabel: ComponentType<KitSortLabelProps>;
  /** A row's actions. */
  readonly RowActions: <TRow>(props: {
    readonly row: TRow;
    readonly actions: ReturnType<typeof resolveRowEditTrigger<TRow>>["actions"];
    readonly confirm: DesktopRowWiring<TRow>["confirm"];
    readonly labels: DesktopRowWiring<TRow>["labels"];
    readonly layout: DesktopRowWiring<TRow>["rowActionsLayout"];
    readonly render: DesktopRowWiring<TRow>["renderRowActions"];
  }) => ReactNode;
  /** The paint, as a hook so it can read the kit's theme. */
  readonly usePaint: (stickyHeader: boolean) => KitDesktopPaint;
  /**
   * The host's class for a part the binding draws itself: the caption
   * control, header actions and resize handle, and the tree, reorder,
   * column-select and column-group controls. A hook, so it can read the
   * kit's class map; absent, those parts carry no class.
   */
  readonly usePartClass?: KitUsePartClass;
  /**
   * The table elements and their props: the kit's own scroll box, table,
   * head and body, and anything its look puts around them.
   */
  readonly useChrome: <TRow>(
    props: KitDesktopTableProps<TRow, TExtra>,
    assembly: DesktopTableAssembly<TRow>
  ) => Omit<
    DesktopTableChromeProps<TRow>,
    | "assembly"
    | "renderLeading"
    | "renderTrailing"
    | "renderPlanCell"
    | "renderLeaf"
    | "renderRow"
    | "renderGroup"
    | "renderExtra"
    | "renderVirtualPad"
    | "renderSummary"
  >;
}

interface RowExtras {
  readonly stickyHeader: boolean;
  readonly dir: "ltr" | "rtl" | undefined;
}

function rowExtrasEqual(prev: RowExtras, next: RowExtras): boolean {
  return prev.stickyHeader === next.stickyHeader && prev.dir === next.dir;
}

const span = (count: number): number | undefined =>
  count > 1 ? count : undefined;

const CAPTION_ROW: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexWrap: "nowrap",
};

/**
 * Build a kit's desktop table.
 *
 * @param kit - The kit's elements, paint and table chrome.
 * @returns The table component.
 *
 * @public
 */
export function createDesktopTable<TExtra>(
  kit: KitDesktopTable<TExtra>
): <TRow>(props: Readonly<KitDesktopTableProps<TRow, TExtra>>) => ReactElement {
  const { Cell, HeaderCell, Checkbox, SortLabel, RowActions } = kit;
  const KitRow = kit.Row;
  const usePartClass = kit.usePartClass ?? noPartClass;

  function RowBase<TRow>(
    props: Readonly<DesktopRowWiring<TRow> & RowExtras>
  ): ReactElement {
    // Rows memoize through the wiring's own equality; a cache inside would
    // repeat it.
    "use no memo";
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
      treeColumnKey,
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
      bodyPinSide,
      rowPinSide,
      pinPart,
      stickyHeader,
      dir,
    } = props;
    const paint = kit.usePaint(stickyHeader);
    const classOf = usePartClass();
    const state: KitDesktopRowState = {
      rowPinned: rowPinSide !== undefined,
      stickyHeader,
    };
    const expandable = expanded !== undefined;
    const expansionLead = expandable ? kit.widths.expansion : 0;
    const selectionLead =
      expansionLead + (showReorder ? REORDER_COLUMN_WIDTH : 0);
    // A pinned total is the host's figure, not a person: it reads semibold,
    // as the column footer's summary does.
    const summaryRow =
      pinPart === PINNED_SUMMARY_TOP_PART ||
      pinPart === PINNED_SUMMARY_BOTTOM_PART;
    const rail = (side: "start" | "end", pinned: boolean, inset = 0) => ({
      ...paint.rail(side, pinned, inset, state),
      ...edgeRowPin,
    });
    const rowEdit = resolveRowEditTrigger(
      rowActions,
      editing?.rowEditing,
      row,
      id
    );
    return (
      <>
        <KitRow
          {...rowDomProps}
          kind="body"
          elementRef={measureRef}
          className={rowClass}
          selected={selected === true}
          onMouseEnter={hasPrefetch ? () => onPrefetch(row) : undefined}
        >
          {expandable && (
            <Cell
              kind="lead"
              data-adapttable-part="expand-cell"
              data-pinned={pinnedSide("start", hasStartPin)}
              style={rail("start", hasStartPin)}
            >
              <OptionalExpandToggle
                id={id}
                expanded={expanded}
                onToggle={onToggleExpand}
                dir={dir}
                expandLabel={labels.expandRow}
                collapseLabel={labels.collapseRow}
              />
            </Cell>
          )}
          {showReorder && rowReorder && (
            <Cell
              kind="lead"
              data-adapttable-part="reorder-cell"
              data-pinned={pinnedSide("start", hasStartPin || reorderPinned)}
              style={rail("start", hasStartPin || reorderPinned, expansionLead)}
            >
              <OptionalRowReorderHandle
                reorder={rowReorder}
                labels={labels}
                rowId={id}
                localIndex={index}
                row={row}
                windowStart={windowStart}
                rowCount={rowCount}
                className={classOf("row-reorder-handle")}
              />
            </Cell>
          )}
          {selected !== undefined && (
            <Cell
              kind="lead"
              data-adapttable-part="selection-cell"
              data-pinned={pinnedSide("start", hasStartPin)}
              style={rail("start", hasStartPin, selectionLead)}
            >
              <Checkbox
                aria-label={labels.selectRow}
                checked={selected}
                onCheckedChange={() => onToggleSelect(id)}
              />
            </Cell>
          )}
          {columnSpacers && (
            <ColumnSpacer width={columnSpacers.start} side="start" />
          )}
          {bodyCells.map((cell) => {
            const { column, columnIndex, colSpan, rowSpan } = cell;
            const focusProps = gridFocus?.getCellPropsAt(
              focusIndex,
              columnIndex
            );
            const cellProps = table.getCellProps(column as ColumnDef<TRow>);
            return (
              <Cell
                key={column.key}
                kind="data"
                colSpan={span(colSpan)}
                rowSpan={span(rowSpan)}
                {...cellProps}
                data-pinned={bodyPinSide(column.key)}
                data-adapttable-part="cell"
                data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                data-cell-span={cellSpanMark(colSpan, rowSpan)}
                {...focusProps}
                style={cellStyle(
                  paint,
                  focusProps,
                  {
                    ...cellProps.style,
                    ...paint.cell(bodyPinStyle(column.key), state),
                    ...(summaryRow
                      ? (paint.summaryCell ?? SEMIBOLD)
                      : undefined),
                  },
                  colSpan,
                  rowSpan,
                  cellSpanAppearance
                )}
              >
                <OptionalTreeCell
                  entry={treeEntry}
                  columnKey={column.key}
                  treeColumnKey={treeColumnKey}
                  labels={{
                    expandRow: labels.expandRow,
                    collapseRow: labels.collapseRow,
                  }}
                  onToggle={onToggleTree}
                  className={classOf("tree-cell")}
                  toggleClassName={classOf("tree-toggle")}
                  spacerClassName={classOf("tree-spacer")}
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
              </Cell>
            );
          })}
          {columnSpacers && (
            <ColumnSpacer width={columnSpacers.end} side="end" />
          )}
          {showActions && (
            <Cell
              kind="actions"
              data-adapttable-part="actions-cell"
              data-pinned={pinnedSide("end", hasEndPin || actionsPinned)}
              style={rail("end", hasEndPin || actionsPinned)}
            >
              {editing?.rowEditing && (
                <OptionalRowEditActions
                  rowEditing={editing.rowEditing}
                  row={row}
                  rowId={id}
                  showBegin={rowEdit.showBegin}
                  icons={editing.rowEditIcons}
                  conflict={rowEditConflict(editing, id)}
                  labels={{
                    editRow: labels.editRow,
                    saveRow: labels.saveRow,
                    cancel: labels.cancel,
                  }}
                />
              )}
              {rowEdit.actions.length > 0 && (
                <RowActions
                  row={row}
                  actions={rowEdit.actions}
                  confirm={confirm}
                  labels={labels}
                  layout={rowActionsLayout}
                  render={renderRowActions}
                />
              )}
            </Cell>
          )}
        </KitRow>
        {expandable && expanded && (
          <KitRow
            kind="detail"
            elementRef={detailMeasureRef}
            data-adapttable-part="detail-row"
          >
            <Cell
              kind="detail"
              data-adapttable-part="detail-cell"
              colSpan={columnSpan}
            >
              {renderDetail(row)}
            </Cell>
          </KitRow>
        )}
      </>
    );
  }

  function LeafHeader<TRow>({
    leaf,
    paint,
    assembly,
    props,
  }: Readonly<{
    leaf: DesktopHeaderLeaf<TRow>;
    paint: KitDesktopPaint;
    assembly: DesktopTableAssembly<TRow>;
    props: KitDesktopTableProps<TRow, TExtra>;
  }>): ReactElement {
    "use no memo";
    const { column } = leaf;
    const { labels } = props.table;
    const classOf = usePartClass();
    const caption = column.sortable ? (
      <SortLabel
        active={leaf.sortActive}
        dir={leaf.sortDir}
        index={leaf.sortIndex}
        title={column.headerTooltip}
        buttonProps={leaf.sortButtonProps}
      >
        {leaf.caption}
      </SortLabel>
    ) : (
      <span title={column.headerTooltip}>{leaf.caption}</span>
    );
    const control = (
      <span
        data-adapttable-part="header-caption-control"
        className={classOf("header-caption-control")}
      >
        {caption}
      </span>
    );
    return (
      <HeaderCell
        kind="leaf"
        data-adapttable-part="header-cell"
        // Every header prop core states, in full; the binding's own below
        // still win where they overlap.
        {...leaf.headerProps}
        {...leaf.columnHeaderProps}
        rowSpan={span(leaf.rowSpan)}
        data-sorted={leaf.sortDir}
        data-sticky={assembly.pin.stickyAttr}
        data-pinned={leaf.pinSide}
        style={paint.leaf(
          {
            style: leaf.style,
            pinned: leaf.pinSide !== undefined,
            rowSpan: leaf.rowSpan,
            size: props.table.getCellProps(column).style ?? {},
          },
          assembly.pin
        )}
      >
        <div style={paint.captionRow?.(column.align) ?? CAPTION_ROW}>
          {column.renameable === true && props.onRenameColumn ? (
            <OptionalColumnHeaderRename
              columnKey={column.key}
              name={leaf.columnName}
              labels={labels}
              onRenameColumn={props.onRenameColumn}
            >
              {control}
            </OptionalColumnHeaderRename>
          ) : (
            control
          )}
        </div>
        {leaf.showColumnCheckbox && leaf.onToggleColumn ? (
          <OptionalColumnSelect
            label={leaf.columnSelectAriaLabel}
            checked={leaf.columnCheckboxChecked}
            onToggle={leaf.onToggleColumn}
            className={classOf("column-select")}
          />
        ) : null}
        {column.headerActions ? (
          <span
            data-adapttable-part="header-actions"
            className={classOf("header-actions")}
          >
            {column.headerActions}
          </span>
        ) : null}
        {leaf.headerDef ? (
          <OptionalFilterHeader
            def={leaf.headerDef}
            source={props.table.source}
            labels={labels}
            registry={props.filterRegistry}
            closeOnSelect={props.closeHeaderFilterOnSelect}
          />
        ) : null}
        {leaf.resizeHandleProps && (
          <span
            {...leaf.resizeHandleProps}
            className={classOf("resize-handle")}
            style={paint.resizeHandle(assembly.resizeHandleStyle)}
          />
        )}
      </HeaderCell>
    );
  }

  return function DesktopTable<TRow>(
    props: Readonly<KitDesktopTableProps<TRow, TExtra>>
  ): ReactElement {
    // The compiler's cache around these slots is larger than the slots.
    "use no memo";
    const stickyHeader = props.stickyHeader ?? false;
    const assembly = useDesktopTableAssembly(props, { widths: kit.widths });
    const Row = useMemo(
      () =>
        createDesktopRow<TRow, DesktopRowWiring<TRow> & RowExtras>(
          RowBase,
          rowExtrasEqual
        ),
      []
    );
    const chrome = kit.useChrome(props, assembly);
    const paint = kit.usePaint(stickyHeader);
    const classOf = usePartClass();
    const { model, summary, showColumnFooter, header, pin, callbacks } =
      assembly;
    const { columns, selection, labels, showActions, showReorder } = model;

    const leadingHeaders = (rowSpan: number): ReactElement => (
      <>
        {header.leading.expand && (
          <HeaderCell
            kind="lead"
            railWidth={kit.widths.expansion}
            data-adapttable-part="expand-header"
            data-sticky={pin.stickyAttr}
            data-pinned={pinnedSide("start", pin.hasStartPin)}
            rowSpan={span(rowSpan)}
            style={paint.headRail("start", pin.hasStartPin, 0, pin)}
          >
            <span style={VISUALLY_HIDDEN}>{labels.expandRow}</span>
          </HeaderCell>
        )}
        {header.leading.reorder && (
          <HeaderCell
            kind="lead"
            railWidth={REORDER_COLUMN_WIDTH}
            aria-label={labels.reorderRow}
            data-adapttable-part="reorder-header"
            data-sticky={pin.stickyAttr}
            data-pinned={pinnedSide(
              "start",
              pin.hasStartPin || Boolean(props.reorderPinned)
            )}
            rowSpan={span(rowSpan)}
            style={paint.headRail(
              "start",
              pin.hasStartPin || Boolean(props.reorderPinned),
              pin.expansionLead,
              pin
            )}
          />
        )}
        {header.leading.selection && selection && (
          <HeaderCell
            kind="lead"
            railWidth={kit.widths.selection}
            data-adapttable-part="selection-header"
            data-sticky={pin.stickyAttr}
            data-pinned={pinnedSide("start", pin.hasStartPin)}
            rowSpan={span(rowSpan)}
            style={paint.headRail(
              "start",
              pin.hasStartPin,
              pin.selectionLead,
              pin
            )}
          >
            <Checkbox
              aria-label={labels.selectAll}
              checked={selection.headerState === "all"}
              indeterminate={selection.headerState === "some"}
              onCheckedChange={() => selection.toggleAll()}
            />
          </HeaderCell>
        )}
        {header.leading.spacerStart && model.columnSpacers && (
          <ColumnSpacer
            width={model.columnSpacers.start}
            side="start"
            as="th"
          />
        )}
      </>
    );

    const trailingHeaders = (rowSpan: number): ReactElement => (
      <>
        {header.trailing.spacerEnd && model.columnSpacers && (
          <ColumnSpacer width={model.columnSpacers.end} side="end" as="th" />
        )}
        {header.trailing.actions && (
          <HeaderCell
            kind="actions"
            railWidth={kit.widths.actions}
            data-adapttable-part="actions-header"
            data-sticky={pin.stickyAttr}
            data-pinned={pinnedSide("end", pin.hasEndPin || pin.stickActions)}
            rowSpan={span(rowSpan)}
            style={paint.headRail(
              "end",
              pin.hasEndPin || pin.stickActions,
              0,
              pin
            )}
          >
            {labels.actions}
          </HeaderCell>
        )}
      </>
    );

    const renderLeaf = (leaf: DesktopHeaderLeaf<TRow>, key: string) => (
      <LeafHeader
        key={key}
        leaf={leaf}
        paint={paint}
        assembly={assembly}
        props={props}
      />
    );

    return (
      <DesktopTableChrome
        {...chrome}
        assembly={assembly}
        renderLeading={leadingHeaders}
        renderTrailing={trailingHeaders}
        renderPlanCell={(cell) => {
          if (cell.kind === "leaf") {
            const column = columns[cell.columnIndex];
            if (!column) return null;
            return renderLeaf(
              header.leaf(column, cell.columnIndex, cell.rowSpan),
              cell.key
            );
          }
          return (
            <HeaderCell
              key={cell.key}
              kind="group"
              colSpan={cell.colSpan}
              rowSpan={span(cell.rowSpan)}
              data-adapttable-part="header-group-cell"
              style={paint.group(cell)}
            >
              <span style={groupedHeaderLabelStyle()}>
                {props.onToggleColumnGroup ? (
                  <OptionalColumnGroupToggle
                    cell={cell.cell}
                    labels={labels}
                    onToggle={props.onToggleColumnGroup}
                    className={classOf("column-group-toggle")}
                  />
                ) : null}
                {columnGroupHeaderCaption(cell.cell)}
              </span>
            </HeaderCell>
          );
        }}
        renderLeaf={(leaf, column) => renderLeaf(leaf, column.key)}
        renderRow={(slot) => (
          <Row
            key={slot.key}
            {...slot.wiring}
            stickyHeader={stickyHeader}
            dir={props.dir}
          />
        )}
        renderGroup={(slot) => (
          <OptionalGroupHeaderRow
            key={slot.key}
            entry={slot.entry}
            columns={columns}
            leadingCells={model.leadingCells}
            showActions={showActions}
            getCellProps={props.table.getCellProps}
            selection={selection}
            labels={labels}
            onToggleCollapse={callbacks.onToggleGroup}
            onShowMore={props.grouping?.showMore ?? NO_MORE}
          />
        )}
        renderExtra={(slot) => {
          const parts = EXTRA_ROW_PARTS[slot.extraKind];
          const separator = slot.extraKind === "separator";
          return (
            <KitRow
              key={slot.key}
              kind="extra"
              data-adapttable-part={parts.row}
              style={EXTRA_OVER_SPAN_ROW_STYLE}
            >
              <Cell
                kind="extra"
                colSpan={slot.colSpan}
                data-adapttable-part={parts.cell}
                role={separator ? "separator" : undefined}
                aria-label={separator ? labels.rowSeparator : undefined}
                style={{ ...EXTRA_OVER_SPAN_STYLE, ...slot.fillStyle }}
              >
                {separator ? null : slot.render?.()}
              </Cell>
            </KitRow>
          );
        }}
        renderVirtualPad={(slot) => (
          <KitRow
            key={slot.key}
            kind="pad"
            data-adapttable-part="virtual-spacer"
            aria-hidden
          >
            <Cell
              kind="pad"
              colSpan={slot.colSpan}
              style={{ height: slot.height, padding: 0 }}
            />
          </KitRow>
        )}
        renderSummary={() =>
          showColumnFooter ? (
            <kit.Foot data-adapttable-part="summary">
              <KitRow kind="summary" data-adapttable-part="summary-row">
                {header.leading.expand && (
                  <Cell kind="lead" data-adapttable-part="summary-cell" />
                )}
                {showReorder && (
                  <Cell kind="lead" data-adapttable-part="summary-cell" />
                )}
                {selection && (
                  <Cell kind="lead" data-adapttable-part="summary-cell" />
                )}
                {columns.map((column) => (
                  <Cell
                    key={column.key}
                    kind="summary"
                    {...props.table.getCellProps(column)}
                    data-adapttable-part="summary-cell"
                  >
                    {resolveColumnFooter(column, summary?.[column.key])}
                  </Cell>
                ))}
                {showActions && (
                  <Cell kind="actions" data-adapttable-part="summary-cell" />
                )}
              </KitRow>
            </kit.Foot>
          ) : null
        }
      />
    );
  };
}

const SEMIBOLD: CSSProperties = { fontWeight: 600 };

/**
 * A data cell's style: its own, its merged-cell look, and the selection or
 * match highlight unless the kit marks those by class.
 */
function cellStyle(
  paint: KitDesktopPaint,
  focusProps: Readonly<Record<string, unknown>> | undefined,
  own: CSSProperties,
  colSpan: number,
  rowSpan: number,
  appearance: DesktopRowWiring<unknown>["cellSpanAppearance"]
): CSSProperties | undefined {
  if (paint.classHighlight !== true) {
    return cellHighlightStyle(
      focusProps,
      { ...own, ...mergedCellStyle(colSpan, rowSpan, appearance) },
      paint.selectedCell
    );
  }
  const highlighted =
    isSelectedCell(focusProps) ||
    isMatchedCell(focusProps) ||
    isCurrentMatchCell(focusProps);
  return {
    ...own,
    ...mergedCellStyle(
      colSpan,
      rowSpan,
      appearance,
      highlighted ? "off" : "on"
    ),
  };
}

/** The side a rail is pinned to, for its `data-pinned`. */
const pinnedSide = <TSide extends "start" | "end">(
  side: TSide,
  pinned: boolean
): TSide | undefined => (pinned ? side : undefined);

const NO_MORE = (): void => undefined;
