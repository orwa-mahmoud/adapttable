/**
 * The filters form both overlays hold, and the slide-in filters drawer.
 */
import {
  AdaptFilterTreeChrome,
  type FilterOverlaySlotProps,
  type FiltersFormSlotProps,
} from "@adapttable/angular";
import { Overlay } from "@angular/cdk/overlay";
import { DOCUMENT, NgTemplateOutlet } from "@angular/common";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import {
  BrnDialog,
  BrnDialogContent,
  provideBrnDialogDefaultOptions,
} from "@spartan-ng/brain/dialog";

import { HlmButton } from "../helm/controls";
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

/** Spartan's modal primitive owns the backdrop, focus trap and Escape. @internal */
@Component({
  selector: "adapt-filter-drawer",
  providers: [
    provideBrnDialogDefaultOptions({
      backdropClass: "at-spartan-filter-backdrop",
    }),
  ],
  imports: [NgTemplateOutlet, BrnDialog, BrnDialogContent, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div
      brnDialog
      [state]="p.open ? 'open' : 'closed'"
      [hasBackdrop]="true"
      [positionStrategy]="position()"
      [aria-label]="p.labels.filters"
      (stateChanged)="$event === 'closed' && p.onClose()"
    >
      <ng-template brnDialogContent class="at-spartan-drawer-overlay">
        <section
          class="at-spartan-surface at-spartan-drawer"
          data-adapttable-kit="spartan"
          data-spartan-part="filters-panel"
          data-state="open"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
        >
          <header data-spartan-part="filters-header">
            <h3 data-spartan-part="filters-title">
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              adaptHlmButton
              type="button"
              data-spartan-part="filters-close"
              [attr.aria-label]="p.labels.cancel"
              (click)="p.onClose()"
            >
              ×
            </button>
          </header>
          <div data-spartan-part="filters-body">
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
          <footer data-spartan-part="filters-footer">
            <button
              adaptHlmButton
              type="button"
              data-spartan-part="filters-clear"
              [disabled]="p.activeFilterCount === 0"
              (click)="p.onClearFilters()"
            >
              {{ p.labels.clearAll }}
            </button>
            <button
              adaptHlmButton
              type="button"
              data-spartan-part="filters-done"
              (click)="p.onClose()"
            >
              {{ p.labels.filtersDone }}
            </button>
          </footer>
        </section>
      </ng-template>
    </div>
  `,
})
export class AdaptFilterDrawer {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  private readonly overlay = inject(Overlay);
  protected readonly position = computed(() => {
    const strategy = this.overlay.position().global().top("0");
    return this.props().dir === "rtl"
      ? strategy.left("0")
      : strategy.right("0");
  });
  private readonly dialog = viewChild(BrnDialog);
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterRenderEffect(() => {
      if (this.dialog()?.stateComputed() !== "open") return;
      for (const backdrop of this.document.querySelectorAll(
        ".at-spartan-filter-backdrop"
      )) {
        backdrop.setAttribute("data-spartan-part", "filters-backdrop");
        backdrop.setAttribute("data-state", "open");
      }
    });
  }
}
