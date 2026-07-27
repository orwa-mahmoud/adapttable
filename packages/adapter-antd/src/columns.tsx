import {
  ACTIONS_COLUMN_KEY,
  type ColumnDef,
  columnResizeHandleProps,
  type ConfirmHandler,
  type EditableCellEditing,
  type GroupCollapseState,
  type PinSide,
  type RowAction,
  runRowAction,
  type SortDirection,
  type SortLevel,
  type TableLabels,
} from "@adapttable/core";
import {
  headerGroupRow,
  resolveDisabledReason,
} from "@adapttable/core/adapter";
import { Button, type TableColumnsType, Tooltip, Typography } from "antd";
import type {
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";

import { isDangerColor } from "./colors";
import { EditableDataCell } from "./components/EditableCell";
import {
  type AdaptTableGroupRow,
  type GroupedDataRecord,
  GroupHeaderCell,
  isAdaptTableGroupRow,
} from "./components/grouping";

/**
 * Map a logical pin side to antd's native physical `fixed` value. antd mirrors
 * `fixed: "left"/"right"` under RTL itself (via `ConfigProvider` direction), so
 * `"start"` → `"left"` and `"end"` → `"right"` lands on the correct edge in
 * both writing directions.
 */
function antdFixed(side: PinSide | undefined): "left" | "right" | undefined {
  if (side === "start") return "left";
  if (side === "end") return "right";
  return undefined;
}

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

/** Readable column label for the resize handle's accessible name. */
function columnLabel<TRow>(column: ColumnDef<TRow>): string {
  return typeof column.header === "string" ? column.header : column.key;
}

/** Logical (RTL-aware) text alignment for a column. */
export type LogicalTextAlign = "start" | "center" | "end";

export function logicalAlign(
  align: ColumnDef<unknown>["align"]
): LogicalTextAlign {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

/** antd cell/header props applying logical alignment. */
function cellStyle(align: ColumnDef<unknown>["align"]): {
  style: { textAlign: LogicalTextAlign };
} {
  return { style: { textAlign: logicalAlign(align) } };
}

/** Map our sort state onto antd's `sortOrder` for a column. */
function sortOrderFor(
  columnKey: string,
  sortBy: string | undefined,
  sortDir: SortDirection | undefined
): "ascend" | "descend" | null {
  if (sortBy !== columnKey) return null;
  return sortDir === "desc" ? "descend" : "ascend";
}

/** `aria-sort` for a sortable header — antd's `<Table>` doesn't emit it. */
function ariaSortFor(
  columnKey: string,
  sortBy: string | undefined,
  sortDir: SortDirection | undefined
): "ascending" | "descending" | "none" {
  if (sortBy !== columnKey) return "none";
  return sortDir === "desc" ? "descending" : "ascending";
}

/** The column's direction within the multi-sort chain, if it has one. */
function chainDir(
  sortLevels: readonly SortLevel[],
  key: string
): SortDirection | undefined {
  return sortLevels.find((level) => level.key === key)?.dir;
}

/** 1-based chain position for the header badge, or `undefined`. */
function chainIndex(
  sortLevels: readonly SortLevel[],
  key: string
): number | undefined {
  const index = sortLevels.findIndex((level) => level.key === key);
  return index === -1 ? undefined : index + 1;
}

/**
 * The visible 1-based chain badge for a multi-sorted header (the rendered
 * counterpart of the `data-sort-index` attribute core's headless headers
 * expose). Presentational only — `aria-sort` + `data-sort-index` on the
 * header cell carry the machine-readable state.
 */
function SortIndexBadge({ index }: Readonly<{ index: number | undefined }>) {
  if (index === undefined) return null;
  return (
    <Typography.Text
      aria-hidden="true"
      style={{
        fontSize: "0.75em",
        verticalAlign: "super",
        marginInlineStart: 4,
      }}
    >
      {index}
    </Typography.Text>
  );
}

/** Header-cell props: HTML attributes plus the shared sort-badge data hook. */
interface HeaderCellProps extends HTMLAttributes<HTMLElement> {
  "data-sort-index"?: number;
}

/**
 * Per-header-cell props: logical alignment, `aria-sort` (chain-aware), the
 * `data-sort-index` badge hook, and — when multi-sort is on — the
 * shift-click interceptor.
 *
 * antd-specific multi-sort approach: antd renders its own header cells and
 * composes its sort trigger IN FRONT of any user `onClick` returned from
 * `onHeaderCell`, so a bubble-phase handler can never veto the built-in
 * single-sort. Shift-clicks are therefore intercepted in the CAPTURE phase:
 * `stopPropagation()` there keeps the native event from ever reaching antd's
 * bubble listener, so shift-click feeds OUR sort chain
 * (`source.toggleSortLevel`) while a plain click still drives antd's native
 * single-sort UI (reported back through `onChange`).
 */
function headerCellProps<TRow>(
  column: ColumnDef<TRow>,
  sortBy: string | undefined,
  sortDir: SortDirection | undefined,
  sortIndex: number | undefined,
  hasResizeHandle: boolean,
  isPinned: boolean,
  onToggleSortLevel: ((key: string) => void) | undefined
): HeaderCellProps {
  const style: CSSProperties = { textAlign: logicalAlign(column.align) };
  // The absolute resize handle needs a positioning context — but only set
  // `position: relative` when the column is NOT pinned. A pinned column gets
  // `position: sticky` from antd's native fixed-column styling (itself a
  // positioning context); forcing `relative` here would override that sticky,
  // so a left-pinned column would scroll away instead of sticking.
  if (hasResizeHandle && !isPinned) style.position = "relative";
  if (!column.sortable) return { style };
  const props: HeaderCellProps = {
    style,
    "aria-sort": ariaSortFor(column.key, sortBy, sortDir),
    "data-sort-index": sortIndex,
  };
  if (onToggleSortLevel) {
    props.onClickCapture = (event: MouseEvent<HTMLElement>) => {
      if (!event.shiftKey) return;
      event.stopPropagation();
      onToggleSortLevel(column.key);
    };
    // Keyboard parity for the shift-click chain: Shift+Enter on the
    // focused header toggles the column's multi-sort level (plain Enter
    // stays antd's single sort).
    props.onKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
      if (!event.shiftKey || event.key !== "Enter") return;
      event.stopPropagation();
      event.preventDefault();
      onToggleSortLevel(column.key);
    };
  }
  return props;
}

/**
 * Fold contiguous same-`group` leaves into antd's NATIVE grouped columns.
 * Core's `headerGroupRow` owns the ordering rules (adjacency-based, a
 * reorder splits the group), so the antd column tree always mirrors the
 * shared group-row model: labelled cells become parent columns with
 * `children`, unlabelled gap cells leave their leaves at the top level.
 */
function groupColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  leaves: TableColumnsType<TRow>
): TableColumnsType<TRow> {
  const cells = headerGroupRow(columns);
  if (!cells) return leaves;
  const grouped: TableColumnsType<TRow> = [];
  let cursor = 0;
  for (const cell of cells) {
    const run = leaves.slice(cursor, cursor + cell.span);
    cursor += cell.span;
    if (cell.label === null) grouped.push(...run);
    else grouped.push({ key: cell.key, title: cell.label, children: run });
  }
  return grouped;
}

/** Opt-in grouping chrome passed into {@link buildColumns} when armed. */
export interface BuildColumnsGrouping {
  collapsed: GroupCollapseState;
  /** Number of leaf data columns (for group-header colSpan). */
  dataColumnCount: number;
}

/** Options for {@link buildColumns}. */
export interface BuildColumnsOptions<TRow> {
  columns: readonly ColumnDef<TRow>[];
  rowActions?: readonly RowAction<TRow>[];
  sortBy: string | undefined;
  sortDir: SortDirection | undefined;
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  /** Opt-in editing bundle — omit and cells stay display-only. */
  editing?: EditableCellEditing<TRow>;
  /** Current page rows (Tab advance); required when editing is set. */
  rows?: readonly TRow[];
  getRowId?: (row: TRow) => string;
  /** Per-column edge pinning (logical start/end), mapped to antd's native
   *  physical `fixed` via {@link antdFixed}. */
  pinned?: Readonly<Record<string, PinSide>>;
  /** Layout width mutator; enables a resize handle when provided. */
  setWidth?: (key: string, width: number) => void;
  /** Per-column pixel widths from the layout state. */
  columnWidths?: Readonly<Record<string, number>>;
  /** Accessible label prefix for the resize handle. */
  resizeLabel?: string;
  /** The active multi-sort chain (drives badges + chain-aware sort state). */
  sortLevels?: readonly SortLevel[];
  /** Shift-click chain toggler; provided only when `multiSort` is on. */
  onToggleSortLevel?: (key: string) => void;
  /**
   * When set, column cells detect synthetic group rows and render a spanning
   * group header (or per-column aggregates). Omit and grouping stays dormant.
   */
  grouping?: BuildColumnsGrouping;
}

/**
 * Translate AdaptTable {@link ColumnDef}s into antd's `columns` config,
 * wiring sort order, logical alignment, custom `Cell` renderers, and an
 * optional trailing actions column. antd's `<Table>` then drives the header
 * sort carets and (via the parent's `onChange`) reports clicks back.
 *
 * @typeParam TRow - The row type.
 * @returns The antd column definitions.
 */
/** Whether a group header should span every data column (no aggregates). */
function groupSpansAll(group: AdaptTableGroupRow): boolean {
  const cells = group.aggregateCells;
  if (!cells) return true;
  return Object.keys(cells).length === 0;
}

/** Cell props for a data column when grouping may produce synthetic rows. */
function groupedOnCell<TRow>(
  columnIndex: number,
  align: ColumnDef<unknown>["align"],
  grouping: BuildColumnsGrouping | undefined,
  record: GroupedDataRecord<TRow>
): { style: { textAlign: LogicalTextAlign }; colSpan?: number } {
  const base = cellStyle(align);
  if (!grouping || !isAdaptTableGroupRow(record)) return base;
  if (groupSpansAll(record)) {
    if (columnIndex === 0) {
      return { ...base, colSpan: grouping.dataColumnCount };
    }
    return { ...base, colSpan: 0 };
  }
  return base;
}

/** Normalize optional aggregate content to a ReactNode (never bare `false`). */
function aggregateCellContent(value: ReactNode | undefined): ReactNode {
  if (value == null || value === false) return null;
  return value;
}

/** Render group-header cell content for a data column. */
function renderGroupDataCell<TRow>(
  column: ColumnDef<TRow>,
  columnIndex: number,
  record: AdaptTableGroupRow,
  options: {
    labels: Required<TableLabels>;
    grouping?: BuildColumnsGrouping;
  }
): ReactNode {
  let content: ReactNode = null;
  if (groupSpansAll(record)) {
    if (columnIndex === 0) {
      content = (
        <GroupHeaderCell
          group={record}
          labels={options.labels}
          onToggle={() => options.grouping?.collapsed.toggle(record.key)}
        />
      );
    }
  } else if (columnIndex === 0) {
    content = (
      <GroupHeaderCell
        group={record}
        labels={options.labels}
        onToggle={() => options.grouping?.collapsed.toggle(record.key)}
        aggregate={record.aggregateCells?.[column.key]}
      />
    );
  } else {
    content = aggregateCellContent(record.aggregateCells?.[column.key]);
  }
  return content;
}

/** Render a normal editable leaf cell. */
function renderLeafDataCell<TRow>(
  column: ColumnDef<TRow>,
  record: TRow,
  index: number,
  options: {
    editing?: EditableCellEditing<TRow>;
    rows: readonly TRow[];
    columns: readonly ColumnDef<TRow>[];
    getRowId: (row: TRow) => string;
    labels: Required<TableLabels>;
  }
): ReactNode {
  return (
    <EditableDataCell
      editing={options.editing}
      row={record}
      column={column}
      rowId={options.getRowId(record)}
      rowIndex={index}
      rows={options.rows}
      columns={options.columns}
      rowKey={options.getRowId}
      editLabel={options.labels.editCell}
    />
  );
}

/** Render a group header or a normal editable leaf cell. */
function renderDataCell<TRow>(
  column: ColumnDef<TRow>,
  columnIndex: number,
  record: GroupedDataRecord<TRow>,
  index: number,
  options: {
    editing?: EditableCellEditing<TRow>;
    rows: readonly TRow[];
    columns: readonly ColumnDef<TRow>[];
    getRowId: (row: TRow) => string;
    labels: Required<TableLabels>;
    grouping?: BuildColumnsGrouping;
  }
): ReactNode {
  if (isAdaptTableGroupRow(record)) {
    return renderGroupDataCell(column, columnIndex, record, options);
  }
  return renderLeafDataCell(column, record, index, options);
}

export function buildColumns<TRow>({
  columns,
  rowActions,
  sortBy,
  sortDir,
  confirm,
  labels,
  editing,
  rows = [],
  getRowId = () => "",
  pinned,
  setWidth,
  columnWidths,
  resizeLabel = "Resize column",
  sortLevels = [],
  onToggleSortLevel,
  grouping,
}: BuildColumnsOptions<TRow>): TableColumnsType<GroupedDataRecord<TRow>> {
  const cellOpts = {
    editing,
    rows,
    columns,
    getRowId,
    labels,
    grouping,
  };
  const leaves: TableColumnsType<GroupedDataRecord<TRow>> = columns.map(
    (column, columnIndex) => {
      // An active chain level supersedes the single sort for this column's
      // caret and `aria-sort`, mirroring core's headless header cells.
      const dir = chainDir(sortLevels, column.key);
      const effectiveSortBy = dir ? column.key : sortBy;
      const effectiveSortDir = dir ?? sortDir;
      const sortIndex = chainIndex(sortLevels, column.key);
      return {
        key: column.key,
        // A real element (not a Fragment): antd v6 attaches a `ref` to the
        // column title to measure it, which logs "ref on React.Fragment" in
        // dev. The wrapper takes the ref; the absolute resize handle still
        // anchors to the (positioned) header cell, so the layout is unchanged.
        title: (
          <span>
            {column.header}
            <SortIndexBadge index={sortIndex} />
            {setWidth && (
              <span
                {...columnResizeHandleProps(
                  column.key,
                  setWidth,
                  `${resizeLabel}: ${columnLabel(column)}`
                )}
                style={RESIZE_HANDLE_STYLE}
              />
            )}
          </span>
        ),
        width: columnWidths?.[column.key] ?? column.width,
        fixed: antdFixed(pinned?.[column.key]),
        sorter: column.sortable ? true : undefined,
        sortOrder: column.sortable
          ? sortOrderFor(column.key, effectiveSortBy, effectiveSortDir)
          : undefined,
        showSorterTooltip: false,
        onCell: (record: GroupedDataRecord<TRow>) =>
          groupedOnCell(columnIndex, column.align, grouping, record),
        onHeaderCell: () =>
          headerCellProps(
            column,
            effectiveSortBy,
            effectiveSortDir,
            sortIndex,
            Boolean(setWidth),
            pinned?.[column.key] != null,
            onToggleSortLevel
          ),
        render: (
          _value: unknown,
          record: GroupedDataRecord<TRow>,
          index: number
        ) => renderDataCell(column, columnIndex, record, index, cellOpts),
      };
    }
  );
  const cols = groupColumns(
    columns,
    leaves as TableColumnsType<TRow>
  ) as TableColumnsType<GroupedDataRecord<TRow>>;

  if (rowActions && rowActions.length > 0) {
    // The actions column rides antd's `fixed: "right"` when the user pins it
    // from the Columns menu (its reserved layout key, one click, no data pins
    // required) — OR'd with any end-pinned data column, which drags it
    // along so antd's right-fixed run stays contiguous through the trailing
    // edge.
    const actionsFixed =
      pinned?.[ACTIONS_COLUMN_KEY] === "end" ||
      columns.some((column) => pinned?.[column.key] === "end");
    cols.push({
      key: "__actions__",
      title: labels.actions,
      width: 1,
      fixed: actionsFixed ? "right" : undefined,
      onCell: (record: GroupedDataRecord<TRow>) => {
        if (isAdaptTableGroupRow(record)) return { colSpan: 0 };
        return cellStyle("end");
      },
      onHeaderCell: () => cellStyle("end"),
      render: (_value: unknown, record: GroupedDataRecord<TRow>) => {
        if (isAdaptTableGroupRow(record)) return null;
        const row = record;
        return (
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            {rowActions.map((action) => {
              if (action.isHidden?.(row)) return null;
              const reason = resolveDisabledReason(
                action.disabledReason?.(row)
              );
              const disabled =
                reason !== undefined || (action.isDisabled?.(row) ?? false);
              return (
                <Tooltip key={action.key} title={reason ?? action.label}>
                  <Button
                    size="small"
                    type="text"
                    danger={isDangerColor(action.color)}
                    disabled={disabled}
                    title={reason}
                    aria-label={action.label}
                    // The disabled attribute already blocks activation, so
                    // attach the handler only when the action can run.
                    onClick={
                      disabled
                        ? undefined
                        : (e) => {
                            e.stopPropagation();
                            runRowAction(action, row, confirm, labels.cancel);
                          }
                    }
                  >
                    {action.icon ?? action.label}
                  </Button>
                </Tooltip>
              );
            })}
          </div>
        );
      },
    });
  }

  return cols;
}
