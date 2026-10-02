/**
 * The anchored filter card: opens under the Filters button with no
 * backdrop, closes on an outside click or Escape, and hands focus back to
 * the button on Escape.
 */
import { type FilterOverlaySlotProps } from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { OVERLAY_Z, placeOverlayBelowTrigger } from "./overlayPlacement";

/** An overlay's props in Angular: its content is a template. */

/**
 * The anchored filter card: opens under the Filters button with no
 * backdrop, closes on an outside click or Escape, and hands focus back to
 * the button on Escape.
 *
 * @internal
 */
@Component({
  selector: "adapt-filter-popover",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      data-adapttable-part="filters-anchor"
      style="position: relative; display: inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
      @if (p.open) {
        <div
          #card
          data-adapttable-part="filters-popover"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          [style.position]="'fixed'"
          [style.z-index]="zIndex"
          [style.width.px]="380"
          [style.max-width]="'calc(100vw - 16px)'"
          [style.overflow-y]="'auto'"
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
        </div>
      }
    </span>
  `,
})
export class AdaptFilterPopover {
  /** The slot's props. */
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();

  protected readonly zIndex = OVERLAY_Z;
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  private readonly card = viewChild<ElementRef<HTMLElement>>("card");

  constructor() {
    effect((onCleanup) => {
      const { open, onClose } = this.props();
      if (!open) return;
      const onClick = (event: MouseEvent): void => {
        const target = event.target as Node;
        if (!document.contains(target)) return;
        if (this.anchor().nativeElement.contains(target)) return;
        const card = this.card()?.nativeElement;
        if (card?.contains(target) || card?.contains(document.activeElement)) {
          return;
        }
        onClose();
      };
      const onKey = (event: KeyboardEvent): void => {
        if (event.key !== "Escape") return;
        onClose();
        this.anchor().nativeElement.querySelector("button")?.focus();
      };
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      onCleanup(() => {
        document.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
      });
    });

    afterRenderEffect((onCleanup) => {
      const card = this.card()?.nativeElement;
      const { open, dir } = this.props();
      if (!open || !card) return;
      const place = (): void => {
        placeOverlayBelowTrigger(
          card,
          this.anchor().nativeElement,
          dir ?? "ltr"
        );
      };
      place();
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
      onCleanup(() => {
        window.removeEventListener("resize", place);
        window.removeEventListener("scroll", place, true);
      });
    });
  }
}
