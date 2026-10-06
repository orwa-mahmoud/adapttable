import {
  type Attrs,
  type CellContext,
  type ColumnDef,
  type DataTableClassNames,
  type MobileCardContext,
  type MobileCardField,
} from "@adapttable/angular";
import {
  mobileCardListStyle,
  type TableLabels,
  treeCardStyle,
} from "@adapttable/core";
import {
  EDITABLE_CELL,
  EXPAND_TOGGLE,
  EXTRA_ROW_PARTS,
  GROUP_HEADER_CARD,
  resolveMobileLabel,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_BUTTONS,
  TREE_TOGGLE,
} from "@adapttable/core/binding";
import {
  computed,
  Directive,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { resolveRenderer } from "../cell";
import { type RowReorderState } from "../rows/rowReorder";
import { type RowReorderButtonsProps } from "../rows/rowReorderHandle";
import { type TreeToggleProps } from "../tree/treeToggle";
import { type TableView } from "./dataTableShell";

/** Shared AdaptMobileCards signals; adapters supply native templates and controls. @public */
@Directive({})
export abstract class AdaptMobileCardsModel<TRow> {
  readonly view = input.required<TableView<TRow>>();
  readonly rowKey = input.required<(row: TRow) => string>();
  protected readonly reorderButtonsSlot = ROW_REORDER_BUTTONS;
  protected readonly editableCellSlot = EDITABLE_CELL;
  protected readonly rowEditActionsSlot = ROW_EDIT_ACTIONS;
  protected readonly groupHeaderCardSlot = GROUP_HEADER_CARD;
  protected readonly extraParts = EXTRA_ROW_PARTS;
  protected readonly expandToggleSlot = EXPAND_TOGGLE;
  protected readonly treeToggleSlot = TREE_TOGGLE;
  protected readonly treeCards = computed(() => {
    const view = this.view();
    const tree = view.tree?.();
    const cards = new Map<
      string,
      {
        readonly toggle: TreeToggleProps<never>;
        readonly indent: string | null;
      }
    >();
    if (!tree) return cards;
    const labels = view.table.labels();
    const classes = view.classNames();
    for (const entry of tree.entries) {
      cards.set(entry.key, {
        // Slot props erase the row type: core types every slot's row as
        // `never`.
        toggle: {
          entry,
          labels,
          onToggle: tree.expansion.toggle,
          toggleClassName: classes.treeToggle,
          spacerClassName: classes.treeSpacer,
        } as unknown as TreeToggleProps<never>,
        indent: treeCardStyle(entry.level).marginInlineStart ?? null,
      });
    }
    return cards;
  });
  private buttonsPropsCache = new Map<string, RowReorderButtonsProps<TRow>>();
  private buttonsPropsToken = "";
  private buttonsPropsLabels: TableLabels | undefined;
  private buttonsPropsClasses: DataTableClassNames | undefined;
  private readonly fieldValue =
    viewChild<TemplateRef<CellContext<TRow>>>("fieldValue");
  protected readonly cardBodies = computed(() => {
    const view = this.view();
    const value = this.fieldValue();
    const columns = view.table.columns();
    const classes = view.classNames();
    const render = view.renderCard();
    const selection = view.selection?.state();
    const detail = view.rowDetail?.();
    const cards = new Map<
      string,
      {
        readonly attrs: Attrs;
        readonly context: MobileCardContext<TRow>;
        readonly content: ReturnType<
          typeof resolveRenderer<MobileCardContext<TRow>>
        >;
      }
    >();
    for (const slot of view.body()) {
      if (slot.kind !== "row") continue;
      const entry = slot.wiring;
      const summary = entry.summary === true;
      const fields: readonly MobileCardField<TRow>[] = value
        ? columns.map((column) => ({
            column,
            label: resolveMobileLabel(column),
            value,
            context: {
              $implicit: entry.row,
              row: entry.row,
              rowIndex: entry.index,
              column,
              value: view.table.cellValue(column, entry.row),
              summary,
            },
          }))
        : [];
      const context: MobileCardContext<TRow> = {
        $implicit: entry.row,
        row: entry.row,
        index: entry.index,
        fields,
        selected: !summary && (selection?.isSelected(entry.id) ?? false),
        expanded: !summary && (detail?.expansion.isExpanded(entry.id) ?? false),
      };
      const attrs = entry.cardAttrs;
      cards.set(slot.key, {
        attrs: {
          ...attrs,
          class:
            [classes.card, attrs.class].filter(Boolean).join(" ") || undefined,
          style: {
            ...treeCardStyle(summary ? 0 : (entry.treeEntry?.level ?? 0)),
            ...(typeof attrs.style === "object" && attrs.style !== null
              ? attrs.style
              : {}),
          },
        },
        context,
        content: resolveRenderer(summary ? undefined : render, context),
      });
    }
    return cards;
  });
  readonly maxHeight = input<number | string>();
  protected readonly scrollBox =
    viewChild<ElementRef<HTMLElement>>("scrollBox");
  scrollElement(): HTMLElement | null {
    return this.scrollBox()?.nativeElement ?? null;
  }
  protected readonly listStyle = computed(() => {
    const maxHeight = this.maxHeight();
    if (typeof maxHeight === "string") {
      return { maxHeight, overflowY: "auto" };
    }
    const style = mobileCardListStyle(maxHeight);
    return style
      ? { maxHeight: `${String(style.maxHeight)}px`, overflowY: "auto" }
      : null;
  });
  protected readonly listAttrs = computed((): Attrs => ({
    ...this.view().table.tableAttrs(),
    role: undefined,
    "aria-rowcount": undefined,
    "aria-colcount": undefined,
    tabIndex: this.maxHeight() == null ? undefined : 0,
    "data-adapttable-part": "cards",
    class: this.view().classNames().cards,
    style: { margin: 0, padding: 0, ...this.listStyle() },
  }));
  protected caption(column: ColumnDef<TRow>): string | undefined {
    return resolveMobileLabel(column);
  }
  protected rowId(row: TRow): string {
    return this.rowKey()(row);
  }
  protected reorderButtonsProps(
    reorder: RowReorderState<TRow>,
    row: TRow,
    localIndex: number
  ): RowReorderButtonsProps<never> {
    const view = this.view();
    const windowStart = view.table.windowStart();
    const rowCount = view.table.source().rows.length;
    const labels = view.table.labels();
    const classes = view.classNames();
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
    if (
      token !== this.buttonsPropsToken ||
      labels !== this.buttonsPropsLabels ||
      classes !== this.buttonsPropsClasses
    ) {
      this.buttonsPropsCache = new Map();
      this.buttonsPropsToken = token;
      this.buttonsPropsLabels = labels;
      this.buttonsPropsClasses = classes;
    }
    const key = `${this.rowId(row)}:${String(localIndex)}`;
    const cached = this.buttonsPropsCache.get(key);
    if (cached?.reorder === reorder && cached.row === row) {
      return cached as unknown as RowReorderButtonsProps<never>;
    }
    const props: RowReorderButtonsProps<TRow> = {
      reorder,
      labels,
      localIndex,
      row,
      windowStart,
      rowCount,
      className: classes.rowReorderButtons,
      upClassName: classes.rowReorderUp,
      downClassName: classes.rowReorderDown,
    };
    this.buttonsPropsCache.set(key, props);
    return props as unknown as RowReorderButtonsProps<never>;
  }
}
