/**
 * The desktop table body: header, rows, reorder handles and cell editors.
 */
import {
  AdaptAttrs,
  AdaptCell,
  AdaptColumnSpacer,
  AdaptExtraRowContent,
  AdaptFooter,
  AdaptHeader,
  AdaptRowDetail,
  AdaptSlot,
  type Attrs,
  COLUMN_GROUP_TOGGLE,
  COLUMN_SELECT,
  columnGroupHeaderCaption,
  type ColumnGroupToggleProps,
  type ColumnSelectCheckboxChromeProps,
  columnSelectLabel,
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
  injectColumnResize,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  mergedCellStyle,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_HANDLE,
  type RowReorderHandleProps,
  type RowReorderState,
  type TableLabels,
  type TableTree,
  TREE_CELL,
  type TreeCellProps,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzTableModule } from "ng-zorro-antd/table";

import type { BodyCellView, BodyRow, TableView } from "../dataTable";
import { AdaptColumnHeaderRename } from "./columnHeaderRename";
import { AdaptRowActions } from "./rowActionButtons";
import { AdaptSelectionCheckbox } from "./selectionCheckbox";

/**
 * The NG-ZORRO desktop table: sticky header, body rows,
 * selection, reorder and in-place cell editors.
 *
 * Editable cells go through the {@link EDITABLE_CELL} slot when editing is
 * composed; otherwise the column cell renders as usual.
 *
 * @internal
 */
@Component({
  selector: "adapt-desktop-table",
  imports: [
    NzButtonModule,
    NzTableModule,
    AdaptSelectionCheckbox,
    AdaptAttrs,
    AdaptCell,
    AdaptColumnHeaderRename,
    AdaptColumnSpacer,
    AdaptExtraRowContent,
    AdaptFooter,
    AdaptHeader,
    AdaptRowActions,
    AdaptRowDetail,
    AdaptSlot,
    NgTemplateOutlet,
  ],
  templateUrl: "./desktopTable.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptDesktopTable<TRow> {
  private readonly kitTable = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("kitTable", { read: ElementRef });

  protected readonly tableAttrs = computed((): Attrs => ({
    ...(this.view().grid?.tableAttrs() ?? this.view().table.tableAttrs()),
    "data-adapttable-part": "table",
  }));

  /**
   * NG-ZORRO's host names the composite grid for styling; its single generated
   * table owns all roles, refs and keyboard props. React AntD instead needs a
   * semantic wrapper because its sticky header splits into sibling tables.
   */
  protected readonly tableElement = (): HTMLTableElement | null =>
    this.kitTable()?.nativeElement.querySelector("table") ?? null;

  /** What the table renders from. */
  readonly view = input.required<TableView<TRow>>();
  /** A row's stable id. */
  readonly rowKey = input.required<(row: TRow) => string>();
  /**
   * Cap the table body's height; the body scrolls inside the box and a
   * composed {@link virtualize} tracks the box instead of the page.
   */
  readonly maxHeight = input<number | string>();

  /** The header-filter slot. @internal */
  protected readonly filterSlots = { header: FILTER_HEADER };
  /** The row-reorder grip slot. @internal */
  protected readonly reorderHandleSlot = ROW_REORDER_HANDLE;
  /** The editable-cell slot. @internal */
  protected readonly editableCellSlot = EDITABLE_CELL;
  /** The kit-owned desktop range-fill handle. @internal */
  protected readonly fillHandleSlot = FILL_HANDLE;
  /** The row-edit-actions slot. @internal */
  protected readonly rowEditActionsSlot = ROW_EDIT_ACTIONS;
  /** The group header slot. @internal */
  protected readonly groupHeaderRowSlot = GROUP_HEADER_ROW;
  /** The column-selection checkbox slot. @internal */
  protected readonly columnSelectSlot = COLUMN_SELECT;
  /** The column-group collapse slot. @internal */
  protected readonly columnGroupToggleSlot = COLUMN_GROUP_TOGGLE;
  /** An empty attribute record. @internal */
  protected readonly noAttrs: Attrs = {};
  /** An extra row's parts. */
  protected readonly extraParts = EXTRA_ROW_PARTS;
  /** An extra row rides above a merged cell that reaches under it. */
  protected readonly extraRowStyle = EXTRA_OVER_SPAN_ROW_STYLE;
  /** A group header's caption line. @internal */
  protected readonly groupLabelAttrs: Attrs = {
    style: groupedHeaderLabelStyle(),
  };

  /**
   * The header rows while any rendered column sits in a group, over the
   * columns the body renders, or `null` for one plain row.
   *
   * @internal
   */
  /**
   * A column's 1-based place in a multi-sort chain, for the badge in its
   * sort button. Absent when the column is not in the chain.
   */
  protected sortIndex(column: { key: string }): number | undefined {
    const index = this.view().table.sortButtonAttrs(column)["data-sort-index"];
    return typeof index === "number" ? index : undefined;
  }

  /** The name on the header, including a rename the layout is holding. */
  protected columnName(column: { key: string; header?: unknown }): string {
    const override = this.view().table.layout().state.names?.[column.key];
    if (override !== undefined) return override;
    return typeof column.header === "string" ? column.header : column.key;
  }

  /** Writes a renamed column through the layout, which tells the host. */
  protected readonly renameColumn = (key: string, name: string): void => {
    this.view().table.layout().setName(key, name);
  };

  /** The resize handle, when `resizableColumns()` is composed. */
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

  /**
   * Each group header cell's attributes, caption and collapse control,
   * keyed by cell.
   *
   * @internal
   */
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

  /**
   * Each column's selection checkbox props, keyed by column, while the
   * feature and the keyboard grid are on.
   *
   * @internal
   */
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

  /** The row-expansion toggle slot. @internal */
  protected readonly expandToggleSlot = EXPAND_TOGGLE;
  /** The tree column's cell slot. @internal */
  protected readonly treeCellSlot = TREE_CELL;

  private handlePropsCache = new Map<string, RowReorderHandleProps<TRow>>();
  private handlePropsToken = "";
  private handlePropsLabels: TableLabels | undefined;
  private treeCellCache = new Map<string, TreeCellProps<never>>();
  private treeCellModel: TableTree<TRow> | undefined;
  private treeCellLabels: TableLabels | undefined;

  /**
   * The scroll box that owns `maxHeight`, when virtualization tracks it.
   *
   * @internal
   */
  protected readonly scrollBox =
    viewChild<ElementRef<HTMLElement>>("scrollBox");

  /**
   * The scroll element virtualization tracks, when present.
   *
   * @internal
   */
  scrollElement(): HTMLElement | null {
    return this.scrollBox()?.nativeElement ?? null;
  }

  /**
   * Each header cell's attributes: the table's (or the grid's), plus the
   * grouping panel's drag handle on a column the panel may group by.
   *
   * @internal
   */
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

  /**
   * A row's id, for `@for` to track rows by.
   *
   * @internal
   */
  /** An extra row's cell paint, over the host row's fill when it has one. */
  protected extraCellStyle(fill: unknown): Record<string, unknown> {
    return typeof fill === "object" && fill !== null
      ? { ...EXTRA_OVER_SPAN_STYLE, ...fill }
      : EXTRA_OVER_SPAN_STYLE;
  }

  /**
   * A body cell's attributes with its span: `colspan` and `rowspan`, the
   * `data-cell-span` mark, and the merged paint — without the wash on a
   * selected or found cell, so that paint shows through.
   */
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

  /**
   * Props for the reorder grip slot on one body row. Cached per change-detection
   * token so AdaptSlot does not see a new object every tick.
   *
   * @internal
   */
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

  /**
   * Props for the tree column's cell on one body row, or `undefined` when
   * that cell is drawn plain. Cached per tree model, so the slot sees the
   * same object until the tree or the row's content template changes.
   *
   * @internal
   */
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

  /**
   * Style for the scroll box when `maxHeight` is set.
   *
   * @internal
   */
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
