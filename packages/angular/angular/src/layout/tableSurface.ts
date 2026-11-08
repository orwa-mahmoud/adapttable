import { Directive, type ElementRef, input, viewChild } from "@angular/core";

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
