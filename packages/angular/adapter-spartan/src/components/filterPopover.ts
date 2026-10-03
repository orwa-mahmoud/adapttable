/** Spartan Brain owns anchored positioning, dismissal and focus restoration. */
import { type FilterOverlaySlotProps } from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";
import { BrnPopover, BrnPopoverContent } from "@spartan-ng/brain/popover";

import { HlmButton } from "../helm/controls";

/** The nonmodal filter card. @internal */
@Component({
  selector: "adapt-filter-popover",
  imports: [NgTemplateOutlet, BrnPopover, BrnPopoverContent, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      brnPopover
      data-spartan-part="filters-anchor"
      [attachTo]="anchor"
      [state]="p.open ? 'open' : 'closed'"
      [hasBackdrop]="false"
      [closeOnOutsidePointerEvents]="true"
      [align]="p.dir === 'rtl' ? 'end' : 'start'"
      scrollStrategy="reposition"
      (stateChanged)="$event === 'closed' && p.onClose()"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
      <ng-template brnPopoverContent>
        <section
          class="at-spartan-surface at-spartan-popover"
          data-adapttable-kit="spartan"
          data-spartan-part="filters-popover"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          [attr.aria-label]="p.labels.filters"
        >
          <header data-spartan-part="filters-header">
            <h3 data-spartan-part="filters-title">
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              adaptHlmButton
              type="button"
              data-spartan-part="filters-clear"
              [disabled]="p.activeFilterCount === 0"
              (click)="p.onClearFilters()"
            >
              {{ p.labels.clearAll }}
            </button>
          </header>
          <div data-spartan-part="filters-body">
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
        </section>
      </ng-template>
    </span>
  `,
})
export class AdaptFilterPopover {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
}
