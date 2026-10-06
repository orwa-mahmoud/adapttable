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
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import {
  NgbOffcanvas,
  type NgbOffcanvasRef,
} from "@ng-bootstrap/ng-bootstrap/offcanvas";

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

/** Native ng-bootstrap offcanvas: modal backdrop, focus trap and restoration. */
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
          data-ng-bootstrap-part="filters-header"
        >
          <h3
            class="offcanvas-title"
            [id]="titleId"
            data-ng-bootstrap-part="filters-title"
          >
            {{ p.labels.filters
            }}{{
              p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
            }}
          </h3>
          <button
            class="btn-close"
            type="button"
            data-ng-bootstrap-part="filters-close"
            [attr.aria-label]="p.labels.cancel"
            (click)="p.onClose()"
          ></button>
        </header>
        <div class="offcanvas-body" data-ng-bootstrap-part="filters-body">
          <ng-container [ngTemplateOutlet]="p.filters" />
        </div>
        <footer data-ng-bootstrap-part="filters-footer">
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            data-ng-bootstrap-part="filters-clear"
            [disabled]="p.activeFilterCount === 0"
            (click)="p.onClearFilters()"
          >
            {{ p.labels.clearAll }}
          </button>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-ng-bootstrap-part="filters-done"
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
  protected readonly titleId = `adapt-ng-bootstrap-filters-${nextDrawerId++}`;
  private readonly content =
    viewChild.required<TemplateRef<unknown>>("content");
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly offcanvas = inject(NgbOffcanvas);
  private ref: NgbOffcanvasRef | undefined;
  private direction: "ltr" | "rtl" | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      const ref = this.ref;
      this.ref = undefined;
      ref?.close();
    });
    afterRenderEffect(() => {
      const p = this.props();
      if (!p.open) {
        this.ref?.close();
        this.ref = undefined;
        return;
      }
      const container = this.element.nativeElement;
      const oldPanel = container.querySelector("ngb-offcanvas-panel");
      oldPanel?.setAttribute("aria-label", p.labels.filters);
      if (this.ref && this.direction === (p.dir ?? "ltr")) return;
      this.ref?.close();
      this.direction = p.dir ?? "ltr";
      const ref = this.offcanvas.open(this.content(), {
        container,
        animation: false,
        backdrop: true,
        keyboard: true,
        position: p.dir === "rtl" ? "start" : "end",
        ariaLabelledBy: this.titleId,
      });
      this.ref = ref;
      const panel = container.querySelector("ngb-offcanvas-panel");
      panel?.setAttribute("data-ng-bootstrap-part", "filters-panel");
      panel?.setAttribute("data-state", "open");
      panel?.setAttribute("aria-label", p.labels.filters);
      panel?.setAttribute("dir", p.dir ?? "ltr");
      panel?.setAttribute("data-dir", p.dir ?? "ltr");
      container
        .querySelector("ngb-offcanvas-backdrop")
        ?.setAttribute("data-ng-bootstrap-part", "filters-backdrop");
      const closed = (): void => {
        if (this.ref !== ref) return;
        this.ref = undefined;
        if (this.props().open) this.props().onClose();
      };
      void ref.result.then(closed, closed);
    });
  }
}

let nextDrawerId = 0;
