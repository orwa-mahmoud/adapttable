/**
 * The chips for every active filter, each removable, and a clear-all.
 */
import { type ActiveFilterChipsSlotProps } from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";

/**
 * The chips for every active filter, each removable, and a clear-all.
 *
 * @internal
 */
@Component({
  imports: [MatButtonModule, MatChipsModule],
  selector: "adapt-filter-chips",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    @if (p.chips.length > 0) {
      <mat-chip-set
        data-adapttable-part="chips"
        [attr.aria-label]="p.labels.filters"
      >
        @for (chip of p.chips; track chip.key) {
          <mat-chip data-adapttable-part="chip">
            {{ chip.label }}
            <button
              matChipRemove
              type="button"
              data-adapttable-part="chip-remove"
              [attr.aria-label]="p.labels.removeFilter(chip.label)"
              (click)="chip.onRemove()"
            >
              ×
            </button>
          </mat-chip>
        }
        <span class="adapt-material-chips-clear" data-adapttable-part="chip">
          <button
            mat-button
            type="button"
            data-adapttable-part="chip-remove"
            (click)="p.onClearAll()"
          >
            {{ p.labels.clearAll }}
          </button>
        </span>
      </mat-chip-set>
    }
  `,
})
export class AdaptFilterChips {
  /** The slot's props. */
  readonly props = input.required<ActiveFilterChipsSlotProps>();
}
