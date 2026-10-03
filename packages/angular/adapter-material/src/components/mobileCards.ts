/**
 * The card list rendered in place of the table on narrow screens.
 */
import {
  AdaptAttrs,
  AdaptCell,
  AdaptExtraRowContent,
  AdaptRowDetail,
  AdaptSlot,
  type Attrs,
  type CellContext,
  type ColumnDef,
  EDITABLE_CELL,
  EXPAND_TOGGLE,
  EXTRA_ROW_PARTS,
  GROUP_HEADER_CARD,
  type MobileCardContext,
  type MobileCardField,
  mobileCardListStyle,
  resolveMobileLabel,
  resolveRenderer,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_BUTTONS,
  type RowReorderButtonsProps,
  type RowReorderState,
  type TableLabels,
  TREE_TOGGLE,
  treeCardStyle,
  type TreeToggleProps,
} from "@adapttable/angular";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { MatCardModule } from "@angular/material/card";

import type { TableView } from "../dataTable";
import type { DataTableClassNames } from "../types";
import { AdaptRowActions } from "./rowActionButtons";
import { AdaptSelectionCheckbox } from "./selectionCheckbox";

/**
 * The phone card list drawn with native elements.
 *
 * Editable fields go through the {@link EDITABLE_CELL} slot when editing is
 * composed, matching React's mobile cards.
 *
 * @internal
 */
@Component({
  selector: "adapt-mobile-cards",
  imports: [
    MatCardModule,
    AdaptSelectionCheckbox,
    AdaptAttrs,
    AdaptCell,
    AdaptExtraRowContent,
    AdaptRowActions,
    AdaptRowDetail,
    AdaptSlot,
    NgComponentOutlet,
    NgTemplateOutlet,
  ],
  templateUrl: "./mobileCards.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptMobileCards<TRow> {
  /** What the table renders from. */
  readonly view = input.required<TableView<TRow>>();
  /** A row's stable id. */
  readonly rowKey = input.required<(row: TRow) => string>();

  /** The mobile reorder-buttons slot. @internal */
  protected readonly reorderButtonsSlot = ROW_REORDER_BUTTONS;
  /** The editable-cell slot. @internal */
  protected readonly editableCellSlot = EDITABLE_CELL;
  /** The row-edit-actions slot. @internal */
  protected readonly rowEditActionsSlot = ROW_EDIT_ACTIONS;
  /** The group header slot. @internal */
  protected readonly groupHeaderCardSlot = GROUP_HEADER_CARD;
  /** An extra row's parts. */
  protected readonly extraParts = EXTRA_ROW_PARTS;
  /** The row-expansion toggle slot. @internal */
  protected readonly expandToggleSlot = EXPAND_TOGGLE;
  /** The tree disclosure slot. @internal */
  protected readonly treeToggleSlot = TREE_TOGGLE;

  /**
   * Each tree card's disclosure props and indent, keyed by row id, while
   * the rows are a tree.
   *
   * @internal
   */
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

  /** Every card uses the same real field template in either body layout. */
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

  /**
   * Cap the card list's height; the list scrolls inside the cap and a
   * composed {@link virtualize} tracks the list instead of the page.
   */
  readonly maxHeight = input<number | string>();

  /**
   * The card list, which scrolls itself when its height is capped.
   *
   * @internal
   */
  protected readonly scrollBox =
    viewChild<ElementRef<HTMLElement>>("scrollBox");

  /**
   * The scroll element virtualization tracks on phones, when present.
   *
   * @internal
   */
  scrollElement(): HTMLElement | null {
    return this.scrollBox()?.nativeElement ?? null;
  }

  /**
   * The list's cap, from core's card-list rule.
   *
   * @internal
   */
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

  /** Preserve native list semantics; a capped list is also a keyboard scroll stop. */
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

  /**
   * A field's caption: its `mobileLabel`, else a string header, else its
   * key; an empty `mobileLabel` shows none.
   *
   * @internal
   */
  protected caption(column: ColumnDef<TRow>): string | undefined {
    return resolveMobileLabel(column);
  }

  /**
   * A row's id, for `@for` to track rows by.
   *
   * @internal
   */
  protected rowId(row: TRow): string {
    return this.rowKey()(row);
  }

  /**
   * Props for the reorder buttons slot on one card. Cached per change-detection
   * token so AdaptSlot does not see a new object every tick.
   *
   * @internal
   */
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
