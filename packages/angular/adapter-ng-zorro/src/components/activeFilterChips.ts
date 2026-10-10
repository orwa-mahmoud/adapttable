/**
 * The chips for every active filter, each removable, and a clear-all.
 */
import type { ActiveFilterChipsSlotProps } from "@adapttable/angular/adapter";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NzTagModule } from "ng-zorro-antd/tag";

/**
 * The chips for every active filter, each removable, and a clear-all.
 *
 * @internal
 */
@Component({
  selector: "adapt-filter-chips",
  imports: [NzButtonModule, NzFlexModule, NzTagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    @if (p.chips.length > 0) {
      <ul
        nz-flex
        nzGap="4px"
        nzWrap="wrap"
        nzAlign="center"
        data-adapttable-part="chips"
        [attr.aria-label]="p.labels.filters"
        style="list-style: none; margin: 0; padding: 0"
      >
        @for (chip of p.chips; track chip.key) {
          <li data-adapttable-part="chip">
            <nz-tag>
              {{ chip.label }}
              <button
                nz-button
                nzSize="small"
                nzType="text"
                type="button"
                data-adapttable-part="chip-remove"
                [attr.aria-label]="p.labels.removeFilter(chip.label)"
                (click)="chip.onRemove()"
              >
                <span>× </span>
              </button>
            </nz-tag>
          </li>
        }
        <li data-adapttable-part="chip">
          <button
            nz-button
            nzSize="small"
            nzType="text"
            type="button"
            data-adapttable-part="chip-remove"
            (click)="p.onClearAll()"
          >
            <span>{{ p.labels.clearAll }} </span>
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
