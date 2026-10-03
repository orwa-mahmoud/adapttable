/**
 * Loading skeleton for the table and the card list.
 *
 * Semantic placeholders only: a kit that ships styles paints the lines. The
 * first column is wider than the last so a row still reads as a row.
 */
import type { TableLabels } from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

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
  host: { class: "adapt-aria" },
  selector: "adapt-table-skeleton",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div aria-busy="true" aria-live="polite" data-adapttable-part="loading">
      @if (variant() === "table") {
        <table data-adapttable-part="loading-table">
          <thead>
            <tr data-adapttable-part="loading-header-row">
              @for (column of columnKeys(); track column) {
                <th data-adapttable-part="loading-header-cell">
                  <span
                    data-adapttable-part="loading-line"
                    [style.width]="lineWidth(column)"
                  ></span>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rowKeys(); track row) {
              <tr data-adapttable-part="loading-row">
                @for (column of columnKeys(); track column) {
                  <td data-adapttable-part="loading-cell">
                    <span
                      data-adapttable-part="loading-line"
                      [style.width]="lineWidth(column)"
                    ></span>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div data-adapttable-part="loading-cards">
          @for (row of rowKeys(); track row) {
            <div data-adapttable-part="loading-card">
              @for (column of cardColumns(); track column) {
                <span
                  data-adapttable-part="loading-line"
                  [style.width]="lineWidth(column)"
                ></span>
              }
            </div>
          }
        </div>
      }
      <span
        style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0"
        >{{ labels().loading }}</span
      >
    </div>
  `,
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
