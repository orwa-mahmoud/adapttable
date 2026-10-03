/**
 * The filters form both overlays hold, and the slide-in filters drawer.
 */
import {
  AdaptFilterTreeChrome,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";
import { ClrSidePanelModule } from "@clr/angular";

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
  host: { class: "adapttable-clarity" },
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

/** Clarity's native side panel supplies the backdrop, focus trap and Escape. */
@Component({
  selector: "adapt-filter-drawer",
  imports: [NgTemplateOutlet, ClrSidePanelModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity" },
  template: `
    @let p = props();
    <clr-side-panel
      [clrSidePanelOpen]="p.open"
      [clrSidePanelSkipAnimation]="true"
      [clrSidePanelPosition]="p.dir === 'rtl' ? 'left' : 'right'"
      [clrSidePanelStaticBackdrop]="false"
      [clrSidePanelCloseButtonAriaLabel]="p.labels.cancel"
      [attr.dir]="p.dir ?? 'ltr'"
      (clrSidePanelOpenChange)="!$event && p.onClose()"
    >
      <h3 class="side-panel-title" data-clarity-part="filters-title">
        {{ p.labels.filters
        }}{{ p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : "" }}
      </h3>
      <div class="side-panel-body" data-clarity-part="filters-body">
        <ng-container [ngTemplateOutlet]="p.filters" />
      </div>
      <div class="side-panel-footer" data-clarity-part="filters-footer">
        <button
          class="btn btn-outline"
          type="button"
          data-clarity-part="filters-clear"
          [disabled]="p.activeFilterCount === 0"
          (click)="p.onClearFilters()"
        >
          {{ p.labels.clearAll }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          data-clarity-part="filters-done"
          (click)="p.onClose()"
        >
          {{ p.labels.filtersDone }}
        </button>
      </div>
    </clr-side-panel>
  `,
})
export class AdaptFilterDrawer {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
}
