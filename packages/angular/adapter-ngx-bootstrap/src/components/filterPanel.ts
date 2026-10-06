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
  ElementRef,
  inject,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { AdaptAutoFilterForm } from "./autoFilterForm";
import { bootstrapModal } from "./bootstrapModal";
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

/** Native ngx-bootstrap modal presented as an edge drawer. */
@Component({
  selector: "adapt-filter-drawer",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <ng-template #content>
      <div
        class="adapttable-filter-panel-content"
        data-state="open"
        [attr.aria-label]="p.labels.filters"
        [attr.dir]="p.dir ?? 'ltr'"
        [attr.data-dir]="p.dir ?? 'ltr'"
      >
        <header
          class="offcanvas-header"
          data-ngx-bootstrap-part="filters-header"
        >
          <h3
            class="offcanvas-title"
            [id]="titleId"
            data-ngx-bootstrap-part="filters-title"
          >
            {{ p.labels.filters
            }}{{
              p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
            }}
          </h3>
          <button
            class="btn-close"
            type="button"
            data-ngx-bootstrap-part="filters-close"
            [attr.aria-label]="p.labels.cancel"
            (click)="p.onClose()"
          ></button>
        </header>
        <div class="offcanvas-body" data-ngx-bootstrap-part="filters-body">
          <ng-container [ngTemplateOutlet]="p.filters" />
        </div>
        <footer data-ngx-bootstrap-part="filters-footer">
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            data-ngx-bootstrap-part="filters-clear"
            [disabled]="p.activeFilterCount === 0"
            (click)="p.onClearFilters()"
          >
            {{ p.labels.clearAll }}
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-ngx-bootstrap-part="filters-done"
            (click)="p.onClose()"
          >
            {{ p.labels.filtersDone }}
          </button>
        </footer>
      </div>
    </ng-template>
  `,
})
export class AdaptFilterDrawer {
  /** The binding's overlay contract. */
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  protected readonly titleId = `adapt-ngx-bootstrap-filters-${nextDrawerId++}`;
  private readonly content =
    viewChild.required<TemplateRef<unknown>>("content");
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    bootstrapModal({
      open: () => this.props().open,
      content: () => this.content(),
      container: () => this.element.nativeElement,
      titleId: this.titleId,
      onClose: () => this.props().onClose(),
      drawer: true,
      label: () => this.props().labels.filters,
      dir: () => this.props().dir ?? "ltr",
    });
  }
}

let nextDrawerId = 0;
