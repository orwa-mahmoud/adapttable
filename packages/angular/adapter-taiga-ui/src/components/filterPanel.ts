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
  ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";
import { AdaptAutoFilterForm } from "./autoFilterForm";
import { TREE_SLOTS } from "./filterTreeBuilder";

/**
 * The filters form both overlays hold, and the slide-in filters drawer.
 */

/** An overlay's props in Angular: its content is a template. */

/**
 * The filters form both overlays hold: the nested AND/OR builder, then the
 * simple fields.
 *
 * @internal
 */
@Component({
  selector: "adapt-filters-form",
  imports: [...TAIGA_CONTROLS, AdaptAutoFilterForm, AdaptFilterTreeChrome],
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
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <ng-template [tuiPopup]="p.open">
      <tui-drawer
        [overlay]="true"
        direction="end"
        (click)="onBackdrop($event)"
        #panel
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        data-taiga-part="filters-panel"
        data-state="open"
        [attr.aria-label]="p.labels.filters"
        [attr.dir]="p.dir ?? 'ltr'"
        [attr.data-dir]="p.dir ?? 'ltr'"
        style="position: fixed; inset-block: 0; inset-inline-end: 0; inset-inline-start: auto; margin: 0; max-height: none; max-width: none; height: 100%; z-index: 200"
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
            data-taiga-part="filters-close"
            [attr.aria-label]="p.labels.cancel"
            (click)="p.onClose()"
          >
            ×
          </button>
        </header>
        <div data-taiga-part="filters-body">
          <ng-container [ngTemplateOutlet]="p.filters" />
        </div>
        <footer data-taiga-part="filters-footer">
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
          <button
            tuiButton
            size="s"
            appearance="secondary"
            type="button"
            data-taiga-part="filters-done"
            (click)="p.onClose()"
          >
            {{ p.labels.filtersDone }}
          </button>
        </footer>
      </tui-drawer>
    </ng-template>
  `,
})
export class AdaptFilterDrawer {
  /** The slot's props. */
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();

  private readonly panel = viewChild<unknown, ElementRef<HTMLElement>>(
    "panel",
    {
      read: ElementRef,
    }
  );

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.panel()?.nativeElement) this.props().onClose();
  }

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
        if (
          event.defaultPrevented ||
          (event.target instanceof Element &&
            event.target.closest("tui-dropdown"))
        )
          return;
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
