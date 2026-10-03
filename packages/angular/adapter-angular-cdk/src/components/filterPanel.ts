/**
 * The filters form both overlays hold, and the slide-in filters drawer.
 */
import {
  AdaptFilterTreeChrome,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/angular";
import { A11yModule } from "@angular/cdk/a11y";
import {
  type CdkConnectedOverlay,
  Overlay,
  OverlayModule,
} from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type TemplateRef,
} from "@angular/core";

import { AdaptAutoFilterForm } from "./autoFilterForm";
import { TREE_SLOTS } from "./filterTreeBuilder";

/** An overlay's props in Angular: its content is a template. */

/**
 * The filters form both overlays hold: the nested AND/OR builder, then the
 * simple fields.
 *
 * @internal
 */
@Component({
  selector: "adapt-filters-form",
  imports: [AdaptAutoFilterForm, AdaptFilterTreeChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div
      data-adapttable-part="filters-form"
      style="display: flex; flex-direction: column; gap: 16px"
    >
      <adapt-filter-tree-chrome
        [defs]="p.defs"
        [source]="p.source"
        [labels]="p.labels"
        [registry]="p.registry"
        [defaultExpanded]="p.defaultExpanded ?? false"
        [slots]="treeSlots"
      />
      @if (p.showSimpleFields) {
        <adapt-auto-filter-form
          [defs]="p.defs"
          [source]="p.source"
          [labels]="p.labels"
          [registry]="p.registry"
        />
      }
    </div>
  `,
})
export class AdaptFiltersForm {
  /** The slot's props. */
  readonly props = input.required<FiltersFormSlotProps<never>>();

  protected readonly treeSlots = TREE_SLOTS;
}

/** CDK modal drawer with a real backdrop and automatic focus restoration. @internal */
@Component({
  selector: "adapt-filter-drawer",
  imports: [A11yModule, OverlayModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span cdkOverlayOrigin #origin="cdkOverlayOrigin"></span>
    <ng-template
      cdkConnectedOverlay
      #overlay="cdkConnectedOverlay"
      (attach)="markBackdrop(overlay)"
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="p.open"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayDisableClose]="true"
      [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
      cdkConnectedOverlayBackdropClass="adapt-cdk-backdrop"
      cdkConnectedOverlayPanelClass="adapt-cdk-drawer-overlay"
      (backdropClick)="p.onClose()"
      (overlayKeydown)="keydown($event)"
    >
      <section
        role="dialog"
        data-adapttable-part="filters-panel"
        data-state="open"
        aria-modal="true"
        tabindex="-1"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        class="adapt-cdk-surface adapt-cdk-drawer"
        [attr.aria-label]="p.labels.filters"
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
            data-adapttable-part="filters-close"
            [attr.aria-label]="p.labels.cancel"
            (click)="p.onClose()"
          >
            ×
          </button>
        </header>
        <div data-adapttable-part="filters-body" class="adapt-cdk-drawer-body">
          <ng-container [ngTemplateOutlet]="p.filters" />
        </div>
        <footer
          data-adapttable-part="filters-footer"
          class="adapt-cdk-surface-header"
        >
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
          <button
            cdkMonitorElementFocus
            data-adapttable-cdk-control
            type="button"
            data-adapttable-part="filters-done"
            (click)="p.onClose()"
          >
            {{ p.labels.filtersDone }}
          </button>
        </footer>
      </section>
    </ng-template>
  `,
})
export class AdaptFilterDrawer {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  protected readonly scrollStrategy = inject(Overlay).scrollStrategies.block();
  protected markBackdrop(overlay: CdkConnectedOverlay): void {
    const backdrop = overlay.overlayRef.backdropElement;
    backdrop?.setAttribute("data-adapttable-part", "filters-backdrop");
    backdrop?.setAttribute("data-state", "open");
  }
  protected keydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.props().onClose();
  }
}
