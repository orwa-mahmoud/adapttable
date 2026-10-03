import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";

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
          style="display: flex; flex-direction: column; overflow: hidden; width: 340px; max-width: calc(100vw - 32px)"
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
            style="min-height: 0; overflow-y: auto; overscroll-behavior: contain"
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
  protected readonly availableHeight = injectPopoverSpace({
    origin: () => this.anchor()?.nativeElement,
    open: () => this.props().open,
    reserve: 32,
  });
  protected readonly triggerReady = signal(false);

  constructor() {
    // The trigger is an externally declared template. Activate the native
    // dropdown only after it is mounted, so Taiga assigns popup ARIA to the
    // focusable button rather than the temporarily empty anchor span.
    afterNextRender(() => this.triggerReady.set(true));
  }

  protected onOpenChange(open: boolean): void {
    if (open || !this.props().open) return;
    this.props().onClose();
    this.anchor().nativeElement.querySelector<HTMLElement>("button")?.focus();
  }
}
