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
  effect,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzDrawerComponent, NzDrawerModule } from "ng-zorro-antd/drawer";

import { AdaptAutoFilterForm } from "./autoFilterForm";
import { TREE_SLOTS } from "./filterTreeBuilder";
import { OVERLAY_Z, overlayEscapeHandled } from "./overlayPlacement";

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

/** The kit owns the backdrop, focus trap and focus restoration. @internal */
@Component({
  selector: "adapt-filter-drawer",
  imports: [NgTemplateOutlet, NzButtonModule, NzCardModule, NzDrawerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span [dir]="p.dir ?? 'ltr'">
      @if (p.open) {
        <nz-drawer
          #drawer
          [nzVisible]="true"
          [nzMask]="true"
          [nzMaskClosable]="true"
          [nzClosable]="false"
          [nzKeyboard]="false"
          [nzWidth]="420"
          [nzPlacement]="p.dir === 'rtl' ? 'left' : 'right'"
          [nzZIndex]="zIndex"
          [nzTitle]="header"
          [nzFooter]="footer"
          (nzOnClose)="p.onClose()"
        >
          <ng-container *nzDrawerContent>
            <div [dir]="p.dir ?? 'ltr'">
              <ng-container [ngTemplateOutlet]="p.filters" />
            </div>
          </ng-container>
        </nz-drawer>
      }
    </span>
    <ng-template #header>
      <header [dir]="p.dir ?? 'ltr'">
        <h3>
          {{ p.labels.filters
          }}{{
            p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
          }}
        </h3>
        <button
          nz-button
          type="button"
          [attr.aria-label]="p.labels.cancel"
          (click)="p.onClose()"
        >
          <span>× </span>
        </button>
      </header>
    </ng-template>
    <ng-template #footer>
      <footer [dir]="p.dir ?? 'ltr'">
        <button
          nz-button
          type="button"
          [disabled]="p.activeFilterCount === 0"
          (click)="p.onClearFilters()"
        >
          <span>{{ p.labels.clearAll }} </span>
        </button>
        <button nz-button nzType="primary" type="button" (click)="p.onClose()">
          <span>{{ p.labels.filtersDone }} </span>
        </button>
      </footer>
    </ng-template>
  `,
})
export class AdaptFilterDrawer {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  protected readonly zIndex = OVERLAY_Z;
  private readonly drawer = viewChild(NzDrawerComponent);

  constructor() {
    // NG-ZORRO restores focus on close(), but template destruction only
    // disposes its overlay. Each open uses a fresh native trap; release it
    // and restore its own captured opener when Angular removes the view.
    afterRenderEffect((onCleanup) => {
      const drawer = this.drawer();
      if (!drawer) return;
      onCleanup(() => {
        drawer.focusTrap?.destroy();
        drawer.previouslyFocusedElement?.focus();
      });
    });
    afterRenderEffect(() => {
      const p = this.props();
      const overlay = this.drawer()?.overlayRef?.overlayElement;
      if (!p.open || !overlay) return;
      const panel = overlay.querySelector<HTMLElement>(".ant-drawer-content");
      if (panel) {
        panel.setAttribute("data-state", "open");
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", p.labels.filters);
        panel.setAttribute("tabindex", "-1");
        panel.setAttribute("data-dir", p.dir ?? "ltr");
        panel.dir = p.dir ?? "ltr";
        if (!panel.contains(document.activeElement)) panel.focus();
      }
      const mask = overlay.querySelector<HTMLElement>(".ant-drawer-mask");
      if (mask) {
        mask.setAttribute("data-state", "open");
      }
    });
    effect((onCleanup) => {
      if (!this.props().open) return;
      const onKey = (event: KeyboardEvent): void => {
        if (event.key === "Escape" && !overlayEscapeHandled(event))
          this.props().onClose();
      };
      document.addEventListener("keydown", onKey);
      onCleanup(() => document.removeEventListener("keydown", onKey));
    });
  }
}
