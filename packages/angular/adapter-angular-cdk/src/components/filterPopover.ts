/** CDK connected filter card, intentionally without a backdrop. */
import { type FilterOverlaySlotProps } from "@adapttable/angular";
import { A11yModule } from "@angular/cdk/a11y";
import { BidiModule } from "@angular/cdk/bidi";
import { type ConnectedPosition, OverlayModule } from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

/** @internal */
@Component({
  selector: "adapt-filter-popover",
  imports: [A11yModule, BidiModule, OverlayModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      data-adapttable-part="filters-anchor"
      [dir]="p.dir ?? 'ltr'"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      style="display: inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="p.open"
        [cdkConnectedOverlayHasBackdrop]="false"
        [cdkConnectedOverlayDisableClose]="true"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayViewportMargin]="8"
        [cdkConnectedOverlayPush]="true"
        cdkConnectedOverlayPanelClass="adapt-cdk-overlay"
        (overlayOutsideClick)="outside($event)"
        (overlayKeydown)="keydown($event)"
      >
        <section
          data-adapttable-part="filters-popover"
          class="adapt-cdk-surface adapt-cdk-filter-card"
          [dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
        >
          <header
            data-adapttable-part="filters-header"
            class="adapt-cdk-surface-header"
          >
            <h3 data-adapttable-part="filters-title">
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              cdkMonitorElementFocus
              data-adapttable-cdk-control
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
        </section>
      </ng-template>
    </span>
  `,
})
export class AdaptFilterPopover {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  protected readonly positions: ConnectedPosition[] = [
    {
      originX: "end",
      originY: "bottom",
      overlayX: "end",
      overlayY: "top",
      offsetY: 4,
    },
    {
      originX: "end",
      originY: "top",
      overlayX: "end",
      overlayY: "bottom",
      offsetY: -4,
    },
  ];
  protected outside(event: MouseEvent): void {
    if (
      event.target instanceof Node &&
      this.anchor().nativeElement.contains(event.target)
    )
      return;
    this.props().onClose();
  }
  protected keydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.props().onClose();
    this.anchor()
      .nativeElement.querySelector<HTMLElement>('button, [role="button"]')
      ?.focus();
  }
}
