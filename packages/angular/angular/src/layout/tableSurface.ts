import { type Attrs } from "@adapttable/angular";
import { treeTableAria } from "@adapttable/core/binding";
import {
  computed,
  Directive,
  type ElementRef,
  input,
  viewChild,
} from "@angular/core";

import { type TableView } from "./dataTableShell";

/**
 * The inputs the data table passes to its desktop and mobile bodies, and the
 * scroll box the shell virtualizes against. A body that draws its own box
 * marks it `#scrollBox`.
 *
 * @public
 */
@Directive({})
export abstract class AdaptTableSurface<TRow> {
  readonly view = input.required<TableView<TRow>>();
  readonly rowKey = input.required<(row: TRow) => string>();
  readonly maxHeight = input<number | string>();
  protected readonly scrollBox =
    viewChild<ElementRef<HTMLElement>>("scrollBox");

  /**
   * The table element's attributes: the grid's while cells take focus, and a
   * treegrid while the rows are a tree, so each row's level and open state
   * are read.
   */
  protected readonly tableElementAttrs = computed((): Attrs => {
    const view = this.view();
    const attrs = view.grid ? view.grid.tableAttrs() : view.table.tableAttrs();
    const tree = view.tree?.();
    return tree ? { ...attrs, ...treeTableAria(tree.entries.length) } : attrs;
  });

  /** The scroll box the shell virtualizes against. */
  scrollElement(): HTMLElement | null {
    return this.scrollBox()?.nativeElement ?? null;
  }
}

/**
 * A scroll box's style: a `maxHeight` box scrolls on both axes, and a table
 * whose sized columns set a minimum width scrolls sideways inside the box
 * instead of widening the page.
 *
 * @param maxHeight - The box's bounding height, in pixels or any CSS length.
 * @param tableStyle - The table element's style, which carries `minWidth`
 *   when columns are sized.
 *
 * @public
 */
export function scrollBoxStyle(
  maxHeight: number | string | undefined,
  tableStyle: unknown
): Record<string, string> | null {
  if (maxHeight != null) {
    return {
      maxHeight:
        typeof maxHeight === "number" ? `${String(maxHeight)}px` : maxHeight,
      overflow: "auto",
    };
  }
  const sized =
    typeof tableStyle === "object" &&
    tableStyle !== null &&
    "minWidth" in tableStyle &&
    Boolean(tableStyle.minWidth);
  return sized ? { overflowX: "auto" } : null;
}
