/**
 * The chips for every active filter, each removable, and a clear-all.
 */
import { type ActiveFilterChipsSlotProps } from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * The chips for every active filter, each removable, and a clear-all.
 *
 * @internal
 */
@Component({
  selector: "adapt-filter-chips",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    @if (p.chips.length > 0) {
      <ul data-adapttable-part="chips" [attr.aria-label]="p.labels.filters">
        @for (chip of p.chips; track chip.key) {
          <li data-adapttable-part="chip">
            {{ chip.label }}
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              data-adapttable-part="chip-remove"
              [attr.aria-label]="p.labels.removeFilter(chip.label)"
              (click)="chip.onRemove()"
            >
              ×
            </button>
          </li>
        }
        <li data-adapttable-part="chip">
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            data-adapttable-part="chip-remove"
            (click)="p.onClearAll()"
          >
            {{ p.labels.clearAll }}
          </button>
        </li>
      </ul>
    }
  `,
})
export class AdaptFilterChips {
  /** The slot's props. */
  readonly props = input.required<ActiveFilterChipsSlotProps>();
}
