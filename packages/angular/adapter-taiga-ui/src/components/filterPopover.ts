import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
} from "@adapttable/angular/adapter";
import { DOCUMENT, isPlatformBrowser, NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";

/** Room kept between the card and the viewport's edge, for its offset and gutter. */
const RESERVE = 32;

/** Below this much room under the opener, the card may take the room above it. */
const MIN_ROOM_BELOW = 160;

/**
 * The anchored filter card: opens under the Filters button with no
 * backdrop, closes on an outside click or Escape, and hands focus back to
 * the button on Escape.
 */

/** An overlay's props in Angular: its content is a template. */

/**
 * The anchored filter card: opens under the Filters button with no
 * backdrop, closes on an outside click or Escape, and hands focus back to
 * the button on Escape.
 *
 * @internal
 */
@Component({
  selector: "adapt-filter-popover",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      [tuiDropdown]="triggerReady() ? content : null"
      tuiDropdownRole="dialog"
      [adaptTaigaDropdownLabel]="p.labels.filters"
      [tuiDropdownMaxHeight]="availableHeight() + 32"
      [tuiDropdownDirection]="direction()"
      [tuiDropdownOpen]="p.open"
      (tuiDropdownOpenChange)="onOpenChange($event)"
      data-taiga-part="filters-anchor"
      style="position: relative; display: inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
    </span>
    <ng-template #content>
      @if (p.open) {
        <div
          #card
          [style.max-height.px]="availableHeight()"
          style="box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; width: 340px; max-width: calc(100vw - 32px)"
          data-taiga-part="filters-popover"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          [style.width.px]="340"
          [style.max-width]="'calc(100vw - 16px)'"
          [style.overflow-y]="'hidden'"
        >
          <header data-taiga-part="filters-header">
            <h3 data-taiga-part="filters-title">
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              tuiButton
              size="s"
              appearance="secondary"
              type="button"
              data-taiga-part="filters-clear"
              [disabled]="p.activeFilterCount === 0"
              (click)="p.onClearFilters()"
            >
              {{ p.labels.clearAll }}
            </button>
          </header>
          <div
            data-taiga-part="filters-body"
            style="min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-block-end: 4px; scroll-padding-block: 4px"
          >
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
          <footer
            style="flex: none; display: flex; justify-content: flex-end; padding-block-start: 12px"
          >
            <button
              tuiButton
              size="s"
              appearance="primary"
              type="button"
              (click)="p.onClose()"
            >
              {{ p.labels.filtersDone }}
            </button>
          </footer>
        </div>
      }
    </ng-template>
  `,
})
export class AdaptFilterPopover {
  /** The slot's props. */
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();

  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  /** Only a browser has a viewport to measure. */
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly viewportSpace = injectPopoverSpace({
    origin: () => this.anchor()?.nativeElement,
    open: () => this.props().open,
    reserve: RESERVE,
    allowAbove: () => this.opensAbove(),
  });
  protected readonly availableHeight = computed(() =>
    Math.min(560, this.viewportSpace())
  );
  /**
   * Above, when the card takes its height from the room above the opener;
   * otherwise Taiga's own choice. Taiga keeps the side it chose while the
   * card was still short, so a card sized to the room above would open below
   * and run off the viewport.
   */
  protected readonly direction = signal<"top" | null>(null);
  protected readonly triggerReady = signal(false);

  constructor() {
    // The trigger is an externally declared template. Activate the native
    // dropdown only after it is mounted, so Taiga assigns popup ARIA to the
    // focusable button rather than the temporarily empty anchor span.
    afterNextRender(() => this.triggerReady.set(true));
    // Taiga places the card once, when it opens, so the side must already be
    // current: kept in step with the opener's place while the page scrolls
    // or resizes.
    const viewport = inject(DOCUMENT).defaultView;
    if (!this.browser || !viewport) return;
    const follow = () => this.direction.set(this.opensAbove() ? "top" : null);
    afterNextRender(follow);
    viewport.addEventListener("scroll", follow, {
      capture: true,
      passive: true,
    });
    viewport.addEventListener("resize", follow, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      viewport.removeEventListener("scroll", follow, { capture: true });
      viewport.removeEventListener("resize", follow);
    });
  }

  /** Whether the room below the opener is too small and the room above is larger. */
  private opensAbove(): boolean {
    const origin = this.anchor()?.nativeElement;
    const viewport = origin?.ownerDocument.defaultView;
    if (!this.browser || !origin || !viewport) return false;
    const rect = origin.getBoundingClientRect();
    const clamp = (edge: number) =>
      Math.max(0, Math.min(viewport.innerHeight, edge));
    const below = viewport.innerHeight - clamp(rect.bottom) - RESERVE;
    const above = clamp(rect.top) - RESERVE;
    return below < MIN_ROOM_BELOW && above > below;
  }

  protected onOpenChange(open: boolean): void {
    if (open || !this.props().open) return;
    this.props().onClose();
    this.anchor().nativeElement.querySelector<HTMLElement>("button")?.focus();
  }
}
