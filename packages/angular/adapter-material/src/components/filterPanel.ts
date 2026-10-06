/**
 * The filters form both overlays hold, and the slide-in filters drawer.
 */
import {
  AdaptFilterTreeChrome,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";

import { AdaptAutoFilterForm } from "./autoFilterForm";
import { TREE_SLOTS } from "./filterTreeBuilder";
import { AdaptMaterialDialog } from "./materialDialog";

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
      style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 16px"
    >
      <div style="grid-column: 1 / -1">
        <adapt-filter-tree-chrome
          [defs]="p.defs"
          [source]="p.source"
          [labels]="p.labels"
          [registry]="p.registry"
          [defaultExpanded]="p.defaultExpanded ?? false"
          [slots]="treeSlots"
        />
      </div>
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

/** Material modal drawer with a real backdrop and native focus management. @internal */
@Component({
  selector: "adapt-filter-drawer",
  imports: [NgTemplateOutlet, MatButtonModule, AdaptMaterialDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let p = props();
    <adapt-material-dialog
      [open]="p.open"
      [label]="p.labels.filters"
      [dir]="p.dir ?? 'ltr'"
      [sheet]="true"
      backdropClassName="adapt-material-filters-backdrop"
      (dismiss)="p.onClose()"
    >
      <section
        class="adapt-material-filters-panel"
        data-state="open"
        [attr.dir]="p.dir ?? 'ltr'"
        [attr.data-dir]="p.dir ?? 'ltr'"
        style="padding:24px;height:100%;max-height:100%;overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box"
      >
        <header class="adapt-material-filters-header" style="flex:none">
          <h3 class="adapt-material-filters-title">
            {{ p.labels.filters
            }}{{
              p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
            }}
          </h3>
          <button
            mat-button
            type="button"
            class="adapt-material-filters-close"
            [attr.aria-label]="p.labels.cancel"
            (click)="p.onClose()"
          >
            ×
          </button>
        </header>
        <div
          class="adapt-material-filters-body"
          style="min-height:0;flex:1;overflow-y:auto"
        >
          <ng-container [ngTemplateOutlet]="p.filters" />
        </div>
        <footer class="adapt-material-filters-footer" style="flex:none">
          <button
            mat-button
            type="button"
            class="adapt-material-filters-clear"
            [disabled]="p.activeFilterCount === 0"
            (click)="p.onClearFilters()"
          >
            {{ p.labels.clearAll }}
          </button>
          <button
            mat-flat-button
            type="button"
            class="adapt-material-filters-done"
            (click)="p.onClose()"
          >
            {{ p.labels.filtersDone }}
          </button>
        </footer>
      </section>
    </adapt-material-dialog>`,
})
export class AdaptFilterDrawer {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
}
