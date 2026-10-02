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
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
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

/** What focus can land on inside the drawer. */
const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The slide-in filters drawer: a backdrop that dims and blocks the page, a
 * dialog that keeps focus inside it, and Escape or the backdrop to close.
 *
 * @internal
 */
@Component({
  selector: "adapt-filter-drawer",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    @if (p.open) {
      <button
        type="button"
        data-adapttable-part="filters-backdrop"
        data-state="open"
        [attr.aria-label]="p.labels.cancel"
        (click)="p.onClose()"
      ></button>
      <dialog
        #panel
        open
        tabindex="-1"
        aria-modal="true"
        data-adapttable-part="filters-panel"
        data-state="open"
        [attr.aria-label]="p.labels.filters"
        [attr.dir]="p.dir ?? 'ltr'"
        [attr.data-dir]="p.dir ?? 'ltr'"
        style="position: fixed; inset-block: 0; inset-inline-end: 0; inset-inline-start: auto; margin: 0; max-height: none; max-width: none; height: 100%; z-index: 200"
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
            data-adapttable-part="filters-close"
            [attr.aria-label]="p.labels.cancel"
            (click)="p.onClose()"
          >
            ×
          </button>
        </header>
        <div data-adapttable-part="filters-body">
          <ng-container [ngTemplateOutlet]="p.filters" />
        </div>
        <footer data-adapttable-part="filters-footer">
          <button
            type="button"
            data-adapttable-part="filters-clear"
            [disabled]="p.activeFilterCount === 0"
            (click)="p.onClearFilters()"
          >
            {{ p.labels.clearAll }}
          </button>
          <button
            type="button"
            data-adapttable-part="filters-done"
            (click)="p.onClose()"
          >
            {{ p.labels.filtersDone }}
          </button>
        </footer>
      </dialog>
    }
  `,
})
export class AdaptFilterDrawer {
  /** The slot's props. */
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  constructor() {
    afterRenderEffect((onCleanup) => {
      const panel = this.panel()?.nativeElement;
      const { open, onClose } = this.props();
      if (!open || !panel) return;
      const trigger =
        document.activeElement instanceof HTMLElement &&
        !panel.contains(document.activeElement)
          ? document.activeElement
          : null;
      panel.focus();
      const onKey = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          onClose();
          return;
        }
        if (event.key === "Tab") trapTab(event, panel);
      };
      document.addEventListener("keydown", onKey);
      onCleanup(() => {
        document.removeEventListener("keydown", onKey);
        trigger?.focus();
      });
    });
  }
}

/** Keep Tab and Shift+Tab inside the panel. */
function trapTab(event: KeyboardEvent, panel: HTMLElement): void {
  const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === panel)) {
    event.preventDefault();
    last.focus();
  } else if (
    (!event.shiftKey && active === last) ||
    (active !== null && !panel.contains(active))
  ) {
    event.preventDefault();
    first.focus();
  }
}
