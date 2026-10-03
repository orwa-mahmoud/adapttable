/**
 * The anchored filter card: opens under the Filters button with no
 * backdrop, closes on an outside click or Escape, and hands focus back to
 * the button on Escape.
 */
import { type FilterOverlaySlotProps } from "@adapttable/angular";
import { Dir } from "@angular/cdk/bidi";
import { CdkConnectedOverlay, CdkOverlayOrigin } from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
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
        [cdkConnectedOverlayPush]="true"
        (overlayOutsideClick)="outside($event)"
        (overlayKeydown)="key($event)"
      >
        <div
          class="adapt-aria adapt-aria-popup"
          data-adapttable-part="filters-popover"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          [style.width.px]="380"
          [style.max-width]="'calc(100vw - 16px)'"
          [style.overflow-y]="'auto'"
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
          <div data-adapttable-part="filters-body">
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
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

  protected outside(event: MouseEvent): void {
    if (!this.anchor().nativeElement.contains(event.target as Node))
      this.props().onClose();
  }

  protected key(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.props().onClose();
    this.anchor().nativeElement.querySelector("button")?.focus();
  }
}
