import { type TableLabels } from "@adapttable/core";
import {
  COLUMN_GROUP_TOGGLE,
  COLUMN_SELECT,
  columnGroupHeaderCaption,
  type ColumnSelectCheckboxChromeProps,
  EDITABLE_CELL,
  EXPAND_TOGGLE,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  FILL_HANDLE,
  FILTER_HEADER,
  GROUP_HEADER_ROW,
  groupedHeaderCellStyle,
  groupedHeaderLabelStyle,
  htmlGroupedHeaderPlan,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  mergedCellStyle,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_HANDLE,
  TREE_CELL,
  type TreeCellProps,
} from "@adapttable/core/binding";
import {
  computed,
  Directive,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { type Attrs } from "../attrs";
import { type ColumnGroupToggleProps } from "../columns/columnGroupToggle";
import { injectColumnResize } from "../columns/columnResize";
import { type TableTree } from "../features/tree";
import { columnSelectLabel } from "../focus/columnSelectCheckbox";
import { type RowReorderState } from "../rows/rowReorder";
import { type RowReorderHandleProps } from "../rows/rowReorderHandle";
import {
  type BodyCellView,
  type BodyRow,
  type TableView,
} from "./dataTableShell";

/** Shared AdaptDesktopTable signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptDesktopTableModel<TRow> {
  readonly view = input.required<TableView<TRow>>();
  readonly rowKey = input.required<(row: TRow) => string>();
  readonly maxHeight = input<number | string>();
  protected readonly filterSlots = { header: FILTER_HEADER };
  protected readonly reorderHandleSlot = ROW_REORDER_HANDLE;
  protected readonly editableCellSlot = EDITABLE_CELL;
  protected readonly fillHandleSlot = FILL_HANDLE;
  protected readonly rowEditActionsSlot = ROW_EDIT_ACTIONS;
  protected readonly groupHeaderRowSlot = GROUP_HEADER_ROW;
  protected readonly columnSelectSlot = COLUMN_SELECT;
  protected readonly columnGroupToggleSlot = COLUMN_GROUP_TOGGLE;
  protected readonly noAttrs: Attrs = {};
  protected readonly extraParts = EXTRA_ROW_PARTS;
  protected readonly extraRowStyle = EXTRA_OVER_SPAN_ROW_STYLE;
  protected readonly groupLabelAttrs: Attrs = {
    style: groupedHeaderLabelStyle(),
  };
  protected sortIndex(column: { key: string }): number | undefined {
    const index = this.view().table.sortButtonAttrs(column)["data-sort-index"];
    return typeof index === "number" ? index : undefined;
  }
  protected columnName(column: { key: string; header?: unknown }): string {
    const override = this.view().table.layout().state.names?.[column.key];
    if (override !== undefined) return override;
    return typeof column.header === "string" ? column.header : column.key;
  }
  protected readonly renameColumn = (key: string, name: string): void => {
    this.view().table.layout().setName(key, name);
  };
  protected resizeHandle(column: {
    key: string;
    header?: unknown;
  }): Attrs | undefined {
    const table = this.view().table;
    if (table.featureOptions.resizableColumns !== true) return undefined;
    return injectColumnResize(
      column.key,
      table.layout().setWidth,
      `${table.labels().resizeColumn}: ${this.columnName(column)}`
    ) as unknown as Attrs;
  }
  protected readonly headerPlan = computed(() => {
    const view = this.view();
    const table = view.table;
    return htmlGroupedHeaderPlan(
      view.columns(),
      table.layout().state.collapsedGroups ?? [],
      table.featureOptions.collapsibleColumnGroups === true,
      table.columnGroups()
    );
  });
  protected readonly groupCells = computed(() => {
    const view = this.view();
    const table = view.table;
    const labels = table.labels();
    const layout = table.layout();
    const toggles = table.hasSlot(COLUMN_GROUP_TOGGLE);
    const cells = new Map<
      string,
      {
        readonly attrs: Attrs;
        readonly caption: string | null;
        readonly toggle: ColumnGroupToggleProps | undefined;
      }
    >();
    for (const row of this.headerPlan() ?? []) {
      for (const cell of row) {
        if (cell.kind !== "group") continue;
        cells.set(cell.key, {
          attrs: {
            style: groupedHeaderCellStyle(
              cell,
              "color-mix(in srgb, CanvasText 22%, transparent)"
            ),
          },
          caption: columnGroupHeaderCaption(cell.cell),
          toggle: toggles
            ? { cell: cell.cell, labels, onToggle: layout.toggleColumnGroup }
            : undefined,
        });
      }
    }
    return cells;
  });
  protected readonly columnSelects = computed(() => {
    const view = this.view();
    const selects = new Map<string, ColumnSelectCheckboxChromeProps>();
    const grid = view.grid;
    if (!view.columnSelect || !grid) return selects;
    const label = view.table.labels().selectColumn;
    const index = view.columnIndex();
    for (const column of view.columns()) {
      const col = index.get(column.key);
      if (col === undefined) continue;
      selects.set(column.key, {
        label: columnSelectLabel(label, column),
        checked: grid.isColumnSelected(col),
        onToggle: () => {
          grid.toggleColumn(col);
        },
      });
    }
    return selects;
  });
  protected readonly expandToggleSlot = EXPAND_TOGGLE;
  protected readonly treeCellSlot = TREE_CELL;
  private handlePropsCache = new Map<string, RowReorderHandleProps<TRow>>();
  private handlePropsToken = "";
  private handlePropsLabels: TableLabels | undefined;
  private treeCellCache = new Map<string, TreeCellProps<never>>();
  private treeCellModel: TableTree<TRow> | undefined;
  private treeCellLabels: TableLabels | undefined;
  protected readonly scrollBox =
    viewChild<ElementRef<HTMLElement>>("scrollBox");
  scrollElement(): HTMLElement | null {
    return this.scrollBox()?.nativeElement ?? null;
  }
  protected readonly headerCells = computed(() => {
    const view = this.view();
    const panel = view.groupingPanel?.().state;
    const cells = new Map<string, Attrs>();
    view.table.columns().forEach((column, index) => {
      const base = view.grid
        ? view.grid.headerCellAttrs(column, index)
        : view.table.headerCellAttrs(column);
      cells.set(
        column.key,
        panel === undefined || column.groupable === false
          ? base
          : { ...base, ...panel.headerDragProps(column.key) }
      );
    });
    return cells;
  });
  protected extraCellStyle(fill: unknown): Record<string, unknown> {
    return typeof fill === "object" && fill !== null
      ? { ...EXTRA_OVER_SPAN_STYLE, ...fill }
      : EXTRA_OVER_SPAN_STYLE;
  }
  protected spanned(attrs: Attrs, cell: BodyCellView<TRow>): Attrs {
    if (cell.mark === undefined) return attrs;
    const painted =
      isSelectedCell(attrs) ||
      isMatchedCell(attrs) ||
      isCurrentMatchCell(attrs);
    const base = attrs.style;
    return {
      ...attrs,
      colspan: cell.colSpan > 1 ? cell.colSpan : undefined,
      rowspan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
      "data-cell-span": cell.mark,
      style: {
        ...(typeof base === "object" && base !== null ? base : {}),
        ...mergedCellStyle(
          cell.colSpan,
          cell.rowSpan,
          this.view().cellSpanAppearance,
          painted ? "off" : "on"
        ),
      },
    };
  }
  protected rowId(row: TRow): string {
    return this.rowKey()(row);
  }
  protected reorderHandleProps(
    reorder: RowReorderState<TRow>,
    row: TRow,
    localIndex: number
  ): RowReorderHandleProps<never> {
    const view = this.view();
    const windowStart = view.table.windowStart();
    const rowCount = view.table.source().rows.length;
    const labels = view.table.labels();
    const token = [
      reorder.lifted?.rowId ?? "",
      String(reorder.overIndex ?? ""),
      reorder.overPosition ?? "",
      String(reorder.hostConfirmPending),
      reorder.announcement,
      String(windowStart),
      String(rowCount),
      reorder.pendingMove ? "1" : "0",
    ].join("|");
    if (token !== this.handlePropsToken || labels !== this.handlePropsLabels) {
      this.handlePropsCache = new Map();
      this.handlePropsToken = token;
      this.handlePropsLabels = labels;
    }
    const rowId = this.rowId(row);
    const key = `${rowId}:${String(localIndex)}`;
    const cached = this.handlePropsCache.get(key);
    if (cached?.reorder === reorder && cached.row === row) {
      return cached as unknown as RowReorderHandleProps<never>;
    }
    const props: RowReorderHandleProps<TRow> = {
      reorder,
      labels,
      rowId,
      localIndex,
      row,
      windowStart,
      rowCount,
    };
    this.handlePropsCache.set(key, props);
    return props as unknown as RowReorderHandleProps<never>;
  }
  protected treeCellProps(
    entry: BodyRow<TRow>,
    columnKey: string,
    children: TemplateRef<unknown>
  ): TreeCellProps<never> | undefined {
    const view = this.view();
    const tree = view.tree?.();
    if (!tree || !view.treeCellFilled || !entry.treeEntry) return undefined;
    if (columnKey !== tree.columnKey) return undefined;
    const labels = view.table.labels();
    if (tree !== this.treeCellModel || labels !== this.treeCellLabels) {
      this.treeCellCache = new Map();
      this.treeCellModel = tree;
      this.treeCellLabels = labels;
    }
    const cached = this.treeCellCache.get(entry.treeEntry.key);
    if (cached?.children === children) return cached;
    // Slot props erase the row type: core types every slot's row as `never`.
    const props = {
      entry: entry.treeEntry,
      columnKey,
      treeColumnKey: tree.columnKey,
      labels,
      onToggle: tree.expansion.toggle,
      children,
    } as unknown as TreeCellProps<never>;
    this.treeCellCache.set(entry.treeEntry.key, props);
    return props;
  }
  protected scrollBoxStyle(): Record<string, string> | null {
    const maxHeight = this.maxHeight();
    if (maxHeight == null) return null;
    return {
      maxHeight:
        typeof maxHeight === "number" ? `${String(maxHeight)}px` : maxHeight,
      overflow: "auto",
    };
  }
}
