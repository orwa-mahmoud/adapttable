/**
 * The anchored filter card: opens under the Filters button with no
 * backdrop, closes on an outside click or Escape, and hands focus back to
 * the button on Escape.
 */
import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
} from "@adapttable/angular/adapter";
import { Dir } from "@angular/cdk/bidi";
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

/** An overlay's props in Angular: its content is a template. */

/**
 * The anchored filter card: opens under the Filters button with no
 * backdrop, closes on an outside click or Escape, and hands focus back to
 * the button on Escape.
 *
 * @internal
 */
@Component({
  host: { class: "adapt-aria" },
  selector: "adapt-filter-popover",
  imports: [NgTemplateOutlet, CdkConnectedOverlay, CdkOverlayOrigin, Dir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      [dir]="p.dir ?? 'ltr'"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      data-adapttable-part="filters-anchor"
      style="position: relative; display: inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="p.open"
        [cdkConnectedOverlayHasBackdrop]="false"
        [cdkConnectedOverlayViewportMargin]="8"
        [cdkConnectedOverlayPush]="false"
        [cdkConnectedOverlayFlexibleDimensions]="true"
        [cdkConnectedOverlayWidth]="340"
        [cdkConnectedOverlayPositions]="positions"
        (overlayOutsideClick)="outside($event)"
        (overlayKeydown)="key($event)"
      >
        <div
          #card
          [style.max-height.px]="availableHeight()"
          style="box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; width: 100%; max-width: calc(100vw - 16px)"
          class="adapt-aria adapt-aria-popup"
          data-adapttable-part="filters-popover"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          [style.max-width]="'calc(100vw - 16px)'"
          [style.overflow-y]="'hidden'"
        >
          <header data-adapttable-part="filters-header">
            <h3 data-adapttable-part="filters-title">
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              type="button"
              data-adapttable-part="filters-clear"
              [disabled]="p.activeFilterCount === 0"
              (click)="p.onClearFilters()"
            >
              {{ p.labels.clearAll }}
            </button>
          </header>
          <div
            data-adapttable-part="filters-body"
            style="min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-block-end: 4px; scroll-padding-block: 4px"
          >
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
          <footer
            style="flex: none; display: flex; justify-content: flex-end; padding-block-start: 12px"
          >
            <button type="button" (click)="p.onClose()">
              {{ p.labels.filtersDone }}
            </button>
          </footer>
        </div>
      </ng-template>
    </span>
  `,
})
export class AdaptFilterPopover {
  /** The slot's props. */
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();

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

  private readonly belowPositions: ConnectedPosition[] = [
    {
      originX: "end",
      originY: "bottom",
      overlayX: "end",
      overlayY: "top",
      offsetY: 4,
      panelClass: "adapt-aria-filter-overlay",
    },
    // Search can be absent, placing the trigger at the other toolbar edge.
    // Keep both logical alignments below the trigger, including in RTL.
    {
      originX: "start",
      originY: "bottom",
      overlayX: "start",
      overlayY: "top",
      offsetY: 4,
      panelClass: "adapt-aria-filter-overlay",
    },
    {
      originX: "center",
      originY: "bottom",
      overlayX: "center",
      overlayY: "top",
      offsetY: 4,
      panelClass: "adapt-aria-filter-overlay",
    },
  ];
  protected readonly positions: ConnectedPosition[] = [
    ...this.belowPositions,
    ...this.belowPositions.map<ConnectedPosition>((position) => ({
      ...position,
      originY: "top",
      overlayY: "bottom",
      offsetY: -4,
    })),
  ];

  private readonly card = viewChild<ElementRef<HTMLElement>>("card");

  protected outside(event: MouseEvent): void {
    const target = event.target;
    const card = this.card()?.nativeElement;
    if (
      !(target instanceof Node) ||
      this.anchor().nativeElement.contains(target)
    )
      return;
    // CDK observes outside clicks during capture. Let the target's handler
    // finish before deciding whether a removed target or focused field closes.
    queueMicrotask(() => {
      if (
        !target.isConnected ||
        !card ||
        this.card()?.nativeElement !== card ||
        card.contains(target) ||
        card.contains(document.activeElement)
      )
        return;
      if (this.props().open) this.props().onClose();
    });
  }

  protected key(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.props().onClose();
    this.anchor().nativeElement.querySelector("button")?.focus();
  }
}
