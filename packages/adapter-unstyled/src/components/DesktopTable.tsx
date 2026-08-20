/** The desktop table: header, pinned columns, rows and summary. */
import {
  columnGroupHeaderCaption,
  edgePinStyle,
  PIN_Z,
  resolveColumnFooter,
  type TableLabels,
} from "@adapttable/core";
import {
  cellSpanMark,
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
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  mergedCellStyle,
  type SharedTableRenderProps,
  useDesktopTableAssembly,
} from "@adapttable/core/adapter";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useMemo } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { ColumnSelectCheckbox } from "./ColumnSelectCheckbox";
import { EditableDataCell } from "./EditableCell";
import { ExpandButton } from "./ExpandToggle";
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
  classNames,
  fillStyle,
}: Readonly<{
  kind: "separator" | "fullWidth";
  colSpan: number;
  render?: () => ReactNode;
  labels: TableLabels;
  classNames: DataTableClassNames;
  fillStyle?: CSSProperties;
}>): ReactElement {
  const parts = EXTRA_ROW_PARTS[kind];
  return (
    <tr
      data-adapttable-part={parts.row}
      className={
        kind === "separator" ? classNames.separatorRow : classNames.fullWidthRow
      }
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <td
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        className={
          kind === "separator"
            ? classNames.separatorCell
            : classNames.fullWidthCell
        }
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </td>
    </tr>
  );
}

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  classNames: DataTableClassNames;
  /**
   * Whether the user pinned the injected actions column to the inline end
   * (one click in the Columns menu) — sticks it independently of any data
   * pin on that side.
   */
  actionsPinned?: boolean;
}

interface DesktopRowProps<TRow> extends DesktopRowWiring<TRow> {
  classNames: DataTableClassNames;
}

function rowExtrasEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return prev.classNames === next.classNames;
}

function sortGlyph(active: boolean, dir: "asc" | "desc" | undefined): string {
  if (!active) return "↕";
  return dir === "asc" ? "↑" : "↓";
}

const UNSTYLED_WIDTHS = {
  selection: 44,
  actions: 120,
  includeExpansionInLeads: false,
} as const;

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
    classNames,
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
    pinOffset,
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
  } = props;
  const expandable = expanded !== undefined;
  return (
    <>
      <tr
        {...rowDomProps}
        ref={measureRef}
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
        {showReorder && rowReorder && (
          <td
            data-adapttable-part="reorder-cell"
            data-pinned={hasStartPin || reorderPinned ? "start" : undefined}
            style={{
              ...edgePinStyle(
                "start",
                hasStartPin || reorderPinned,
                PIN_Z.body
              ),
              ...edgeRowPin,
            }}
            className={cx(classNames.cell, classNames.reorderCell)}
          >
            <RowReorderHandle
              reorder={rowReorder}
              labels={labels}
              rowId={id}
              localIndex={index}
              row={row}
              windowStart={windowStart}
              rowCount={rowCount}
              className={classNames.rowReorderHandle}
            />
          </td>
        )}
        {selected !== undefined && (
          <td
            data-adapttable-part="selection-cell"
            data-pinned={hasStartPin ? "start" : undefined}
            style={{
              ...edgePinStyle("start", hasStartPin, PIN_Z.body),
              ...edgeRowPin,
            }}
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
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const pinStyle = bodyPinStyle(column.key);
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          const mark = cellSpanMark(colSpan, rowSpan);
          const letClassPaint =
            isSelectedCell(focusProps) ||
            isMatchedCell(focusProps) ||
            isCurrentMatchCell(focusProps);
          return (
            <td
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              {...table.getCellProps(column, {
                style: {
                  ...pinStyle,
                  ...mergedCellStyle(
                    colSpan,
                    rowSpan,
                    cellSpanAppearance,
                    letClassPaint ? "off" : "on"
                  ),
                },
                ...(mark ? { "data-cell-span": mark } : {}),
              })}
              {...focusProps}
              data-adapttable-part="cell"
              data-pinned={pinOffset?.(column.key)?.side}
              className={[
                classNames.cell,
                mark ? classNames.cellSpan : "",
                isSelectedCell(focusProps) ? classNames.cellSelected : "",
                isMatchedCell(focusProps) ? classNames.cellMatch : "",
                isCurrentMatchCell(focusProps)
                  ? classNames.cellMatchCurrent
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <TreeCell
                entry={treeEntry}
                columnKey={column.key}
                treeColumnKey={treeKey}
                labels={labels}
                onToggle={onToggleTree}
                className={classNames.treeCell}
                toggleClassName={classNames.treeToggle}
                spacerClassName={classNames.treeSpacer}
              >
                <EditableDataCell
                  activateClassName={classNames.editCellActivate}
                  errorClassName={classNames.editCellError}
                  saveErrorClassName={classNames.editCellSaveError}
                  rollbackClassName={classNames.editCellRollback}
                  editorClassName={classNames.editCellEditor}
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
            </td>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <td
            data-adapttable-part="actions-cell"
            data-pinned={hasEndPin || actionsPinned ? "end" : undefined}
            style={{
              ...edgePinStyle("end", hasEndPin || actionsPinned, PIN_Z.body),
              ...edgeRowPin,
            }}
            className={cx(classNames.cell, classNames.actionsCell)}
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
                classNames={classNames}
                layout={rowActionsLayout}
                render={renderRowActions}
              />
            )}
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

function LeafHeader<TRow>({
  leaf,
  classNames,
  stickyAttr,
  filterRegistry,
  closeHeaderFilterOnSelect,
  source,
  labels,
  resizeHandleStyle,
}: Readonly<{
  leaf: DesktopHeaderLeaf<TRow>;
  classNames: DataTableClassNames;
  stickyAttr: true | undefined;
  filterRegistry: SharedTableRenderProps<TRow>["filterRegistry"];
  closeHeaderFilterOnSelect: boolean | undefined;
  source: SharedTableRenderProps<TRow>["table"]["source"];
  labels: Required<TableLabels>;
  resizeHandleStyle: CSSProperties;
}>): ReactElement {
  const { column } = leaf;
  return (
    <th
      key={column.key}
      {...leaf.columnHeaderProps}
      {...leaf.headerProps}
      rowSpan={leaf.rowSpan > 1 ? leaf.rowSpan : undefined}
      style={leaf.style}
      data-adapttable-part="header-cell"
      data-sorted={leaf.sortDir}
      data-sticky={stickyAttr}
      data-pinned={leaf.pinSide}
      className={classNames.headerCell}
    >
      {column.sortable ? (
        <button
          {...leaf.sortButtonProps}
          data-adapttable-part="sort-button"
          className={classNames.sortButton}
          title={column.headerTooltip}
        >
          {leaf.caption}
          {typeof leaf.sortIndex === "number" && (
            <span
              data-adapttable-part="sort-index"
              className={classNames.sortIndex}
            >
              {leaf.sortIndex}
            </span>
          )}
          <span aria-hidden> {sortGlyph(leaf.sortActive, leaf.sortDir)}</span>
        </button>
      ) : (
        <span title={column.headerTooltip}>{leaf.caption}</span>
      )}
      {leaf.showColumnCheckbox && leaf.onToggleColumn && (
        <ColumnSelectCheckbox
          label={leaf.columnSelectAriaLabel}
          checked={leaf.columnCheckboxChecked}
          onToggle={leaf.onToggleColumn}
          className={classNames.columnSelect}
        />
      )}
      {column.headerActions ? (
        <span
          data-adapttable-part="header-actions"
          className={classNames.headerActions}
        >
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
          classNames={classNames}
        />
      ) : null}
      {leaf.resizeHandleProps && (
        <span
          {...leaf.resizeHandleProps}
          data-adapttable-part="resize-handle"
          className={classNames.resizeHandle}
          style={resizeHandleStyle}
        />
      )}
    </th>
  );
}

/** Desktop semantic table rendering. */
export function DesktopTable<TRow>(props: Readonly<SharedProps<TRow>>) {
  const { classNames, filterRegistry, closeHeaderFilterOnSelect } = props;
  const assembly = useDesktopTableAssembly(props, { widths: UNSTYLED_WIDTHS });
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
  const { columns, selection, labels, showActions, showReorder, leadingCells } =
    model;

  const leafProps = {
    classNames,
    stickyAttr: pin.stickyAttr,
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
      <th
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        data-adapttable-part="header-group-cell"
        className={classNames.headerGroupCell}
        style={groupedHeaderCellStyle(
          cell,
          "color-mix(in srgb, CanvasText 22%, transparent)"
        )}
      >
        <span style={groupedHeaderLabelStyle()}>
          {props.onToggleColumnGroup ? (
            <ColumnGroupToggle
              cell={cell.cell}
              labels={labels}
              onToggle={props.onToggleColumnGroup}
              className={classNames.columnGroupToggle}
            />
          ) : null}
          {columnGroupHeaderCaption(cell.cell)}
        </span>
      </th>
    );
  };

  const leadingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.leading.expand && (
        <th
          aria-label={labels.expandRow}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-adapttable-part="expand-header"
          data-sticky={pin.stickyAttr}
          style={pin.stickyStyle}
          className={cx(classNames.headerCell, classNames.expandHeader)}
        />
      )}
      {header.leading.reorder && (
        <th
          aria-label={labels.reorderRow}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-adapttable-part="reorder-header"
          data-sticky={pin.stickyAttr}
          data-pinned={
            pin.hasStartPin || props.reorderPinned ? "start" : undefined
          }
          style={pin.edgeHeadStyle(
            "start",
            pin.hasStartPin || Boolean(props.reorderPinned)
          )}
          className={cx(classNames.headerCell, classNames.reorderHeader)}
        />
      )}
      {header.leading.selection && selection && (
        <th
          data-adapttable-part="selection-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-sticky={pin.stickyAttr}
          data-pinned={pin.hasStartPin ? "start" : undefined}
          style={pin.edgeHeadStyle("start", pin.hasStartPin)}
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
      {header.leading.spacerStart && model.columnSpacers && (
        <ColumnSpacer width={model.columnSpacers.start} side="start" as="th" />
      )}
    </>
  );

  const trailingHeaders = (rowSpan: number): ReactElement => (
    <>
      {header.trailing.spacerEnd && model.columnSpacers && (
        <ColumnSpacer width={model.columnSpacers.end} side="end" as="th" />
      )}
      {header.trailing.actions && (
        <th
          data-adapttable-part="actions-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-sticky={pin.stickyAttr}
          data-pinned={pin.hasEndPin || pin.stickActions ? "end" : undefined}
          style={pin.edgeHeadStyle("end", pin.hasEndPin || pin.stickActions)}
          className={cx(classNames.headerCell, classNames.actionsHeader)}
        >
          {labels.actions}
        </th>
      )}
    </>
  );

  const summaryPad = (
    <td
      data-adapttable-part="summary-cell"
      className={classNames.summaryCell}
    />
  );

  const tableEl = (
    <table
      {...tableProps}
      {...gridProps}
      data-adapttable-part="table"
      className={classNames.table}
      style={tableStyle}
    >
      <thead
        ref={header.theadRef}
        data-adapttable-part="thead"
        className={classNames.thead}
      >
        {headerPlan ? (
          headerPlan.map((row, rowIndex) => {
            const last = rowIndex === headerPlan.length - 1;
            return (
              <tr
                key={row.map((cell) => cell.key).join("|")}
                {...(last ? header.headerRowProps : {})}
                ref={last ? header.headerRowRef : undefined}
                data-adapttable-part={last ? "header-row" : "header-group-row"}
                className={
                  last ? classNames.headerRow : classNames.headerGroupRow
                }
              >
                {rowIndex === 0 ? leadingHeaders(headerBand) : null}
                {row.map(renderPlanCell)}
                {rowIndex === 0 ? trailingHeaders(headerBand) : null}
              </tr>
            );
          })
        ) : (
          <tr
            {...header.headerRowProps}
            ref={header.headerRowRef}
            data-adapttable-part="header-row"
            className={classNames.headerRow}
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
          </tr>
        )}
      </thead>
      <tbody data-adapttable-part="tbody" className={classNames.tbody}>
        {bodySlots.map((slot) => {
          if (slot.kind === "extra") {
            return (
              <ExtraSlotRow
                key={slot.key}
                kind={slot.extraKind}
                colSpan={slot.colSpan}
                render={slot.render}
                labels={labels}
                classNames={classNames}
                fillStyle={slot.fillStyle}
              />
            );
          }
          if (slot.kind === "virtualPad") {
            return (
              <tr
                key={slot.key}
                data-adapttable-part="virtual-spacer"
                className={classNames.virtualSpacer}
              >
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
                classNames={classNames}
                onToggleCollapse={callbacks.onToggleGroup}
                onShowMore={props.grouping?.showMore ?? (() => undefined)}
              />
            );
          }
          return (
            <Row key={slot.key} {...slot.wiring} classNames={classNames} />
          );
        })}
      </tbody>
      {showColumnFooter && (
        <tfoot data-adapttable-part="summary" className={classNames.summary}>
          <tr
            data-adapttable-part="summary-row"
            className={classNames.summaryRow}
          >
            {header.leading.expand && summaryPad}
            {showReorder && summaryPad}
            {selection && summaryPad}
            {columns.map((column) => (
              <td
                key={column.key}
                data-adapttable-part="summary-cell"
                className={classNames.summaryCell}
              >
                {resolveColumnFooter(column, summary?.[column.key])}
              </td>
            ))}
            {showActions && summaryPad}
          </tr>
        </tfoot>
      )}
    </table>
  );

  return (
    <div
      ref={scroll.bindScrollBox}
      data-adapttable-part="scroll-box"
      className={classNames.scrollBox}
      style={scroll.boxStyle}
    >
      {tableEl}
    </div>
  );
}
