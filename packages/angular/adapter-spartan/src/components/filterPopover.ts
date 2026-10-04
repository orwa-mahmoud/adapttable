/** Spartan Brain owns anchored positioning, dismissal and focus restoration. */
import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
} from "@adapttable/angular";
import { OverlayPositionBuilder } from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { BrnPopover, BrnPopoverContent } from "@spartan-ng/brain/popover";

import { HlmButton } from "../helm/controls";
import { HlmPopoverLabel } from "../helm/popover";

/** The nonmodal filter card. @internal */
@Component({
  selector: "adapt-filter-popover",
  imports: [
    NgTemplateOutlet,
    BrnPopover,
    BrnPopoverContent,
    HlmButton,
    HlmPopoverLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      style="display: inline-flex"
      [sideOffset]="4"
      brnPopover
      [adaptHlmPopoverLabel]="p.labels.filters"
      data-spartan-part="filters-anchor"
      [positionStrategy]="position()"
      [state]="p.open ? 'open' : 'closed'"
      [hasBackdrop]="false"
      [align]="p.dir === 'rtl' ? 'start' : 'end'"
      scrollStrategy="reposition"
      (stateChanged)="$event === 'closed' && p.onClose()"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
      <ng-template brnPopoverContent>
        <section
          class="at-spartan-surface at-spartan-popover"
          [style.max-height.px]="availableHeight()"
          style="display: flex; flex-direction: column; overflow: hidden; width: 340px; max-width: calc(100vw - 32px)"
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
          <div
            data-spartan-part="filters-body"
            style="min-height: 0; overflow-y: auto; overscroll-behavior: contain"
          >
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
          <footer
            style="flex: none; display: flex; justify-content: flex-end; padding-block-start: 12px"
          >
            <button adaptHlmButton type="button" (click)="p.onClose()">
              {{ p.labels.filtersDone }}
            </button>
          </footer>
        </section>
      </ng-template>
    </span>
  `,
})
export class AdaptFilterPopover {
  private readonly positions = inject(OverlayPositionBuilder);
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  protected readonly availableHeight = injectPopoverSpace({
    origin: () => this.anchor()?.nativeElement,
    open: () => this.props().open,
    reserve: 16,
  });
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  /** Brain retains its native portal and dismissal; the filter card stays below. */
  protected readonly position = computed(() => {
    const edge = this.props().dir === "rtl" ? "start" : "end";
    return this.positions
      .flexibleConnectedTo(this.anchor().nativeElement)
      .withPositions([
        {
          originX: edge,
          originY: "bottom",
          overlayX: edge,
          overlayY: "top",
          offsetY: 4,
        },
      ])
      .withFlexibleDimensions(false)
      .withPush(false);
  });
}
