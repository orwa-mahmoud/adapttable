/**
 * Loading skeleton for the table and the card list.
 *
 * NG-ZORRO paints the table, cards and placeholder lines. The first column
 * is wider than the last so a row still reads as a row.
 */
import { type TableLabels } from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzSkeletonModule } from "ng-zorro-antd/skeleton";
import { NzTableModule } from "ng-zorro-antd/table";

/** Width of one placeholder line: wide, narrow, or the middle. */
function loadingLineWidth(column: number, total: number): string {
  if (column === 0) return "70%";
  if (column === total - 1) return "42%";
  return "55%";
}

/**
 * The skeleton a table shows on its first load, as a table or as cards.
 *
 * @public
 */
@Component({
  selector: "adapt-table-skeleton",
  imports: [NzCardModule, NzSkeletonModule, NzTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./tableSkeleton.html",
})
export class AdaptTableSkeleton {
  /** How many placeholder rows to draw. */
  readonly rows = input.required<number>();
  /** How many data columns the table has. */
  readonly columns = input.required<number>();
  /** A table, or the phone card list. */
  readonly variant = input.required<"table" | "cards">();
  /** Labels, for the visually hidden loading sentence. */
  readonly labels = input.required<Required<TableLabels>>();
  /** Whether the actions column is drawn, so the skeleton matches it. */
  readonly hasActions = input(false);

  /** One key per skeleton column, actions included. @internal */
  protected readonly columnKeys = computed(() => {
    const count = Math.max(this.columns(), 1) + (this.hasActions() ? 1 : 0);
    return Array.from({ length: count }, (_, index) => index);
  });

  /** One key per skeleton row. @internal */
  protected readonly rowKeys = computed(() =>
    Array.from({ length: this.rows() }, (_, index) => index)
  );

  /** The first few columns a card shows. @internal */
  protected readonly cardColumns = computed(() =>
    this.columnKeys().slice(0, Math.min(4, this.columnKeys().length))
  );

  /** The placeholder's width for a column. @internal */
  protected lineWidth(column: number): string {
    return loadingLineWidth(column, this.columnKeys().length);
  }
}
