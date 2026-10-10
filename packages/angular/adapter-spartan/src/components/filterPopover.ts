/** Spartan Brain owns anchored positioning, dismissal and focus restoration. */
import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
} from "@adapttable/angular/adapter";
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
          style="box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; width: 340px; max-width: calc(100vw - 32px)"
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
            style="min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-block-end: 4px; scroll-padding-block: 4px"
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
  private readonly viewportSpace = injectPopoverSpace({
    origin: () => this.anchor()?.nativeElement,
    open: () => this.props().open,
    reserve: 16,
    allowAbove: () => {
      const origin = this.anchor()?.nativeElement;
      const viewport = origin?.ownerDocument.defaultView;
      return (
        viewport != null &&
        viewport.innerHeight - origin.getBoundingClientRect().bottom - 16 < 160
      );
    },
  });
  protected readonly availableHeight = computed(() =>
    Math.min(560, this.viewportSpace())
  );
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  /** Brain retains its native portal and flips a low filter above its trigger. */
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
        {
          originX: edge,
          originY: "top",
          overlayX: edge,
          overlayY: "bottom",
          offsetY: -4,
        },
        {
          originX: edge === "start" ? "end" : "start",
          originY: "bottom",
          overlayX: edge === "start" ? "end" : "start",
          overlayY: "top",
          offsetY: 4,
        },
        {
          originX: edge === "start" ? "end" : "start",
          originY: "top",
          overlayX: edge === "start" ? "end" : "start",
          overlayY: "bottom",
          offsetY: -4,
        },
      ])
      .withViewportMargin(8)
      .withFlexibleDimensions(true)
      .withPush(true);
  });
}
