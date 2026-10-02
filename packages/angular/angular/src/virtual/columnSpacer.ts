/**
 * The cell that holds open the columns outside the horizontal window.
 *
 * One empty cell per side, sized to everything the window skipped, so the
 * table's scroll width matches the columns it claims. Aria-hidden: it is
 * scaffolding, not data.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

/**
 * Renders the spacer cell, or nothing when there is nothing to hold open.
 *
 * @public
 */
@Component({
  selector: "adapt-column-spacer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (width() > 0) {
      @if (header()) {
        <th
          aria-hidden="true"
          [attr.data-adapttable-part]="part()"
          [style]="cellStyle()"
        ></th>
      } @else {
        <td
          aria-hidden="true"
          [attr.data-adapttable-part]="part()"
          [style]="cellStyle()"
        ></td>
      }
    }
  `,
})
export class AdaptColumnSpacer {
  /** Pixel width of the columns this cell stands in for. */
  readonly width = input.required<number>();
  /** Which side of the window it sits on, for the part name. */
  readonly side = input.required<"start" | "end">();
  /** A header cell or a body cell. */
  readonly as = input<"td" | "th">("td");

  protected readonly header = computed(() => this.as() === "th");
  protected readonly part = computed(() => `column-spacer-${this.side()}`);
  protected readonly cellStyle = computed(() => {
    const width = `${String(this.width())}px`;
    return { width, minWidth: width, padding: "0", border: "0" };
  });
}
