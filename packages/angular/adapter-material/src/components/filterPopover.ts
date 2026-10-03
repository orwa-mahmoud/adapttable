/** Backdrop-free Material filter card, anchored and dismissed by CDK. */
import { type FilterOverlaySlotProps } from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";

import { AdaptMaterialPopover } from "./materialPopover";

/** @internal */
@Component({
  selector: "adapt-filter-popover",
  imports: [NgTemplateOutlet, MatButtonModule, AdaptMaterialPopover],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@let p = props();
    <span
      #anchor
      class="adapt-material-filters-anchor"
      style="display:inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
    </span>
    <adapt-material-popover
      [origin]="anchor"
      [open]="p.open"
      [dir]="p.dir ?? 'ltr'"
      (dismiss)="p.onClose()"
    >
      @if (p.open) {
        <div
          #card
          class="adapt-material-filters-popover"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          [style.width.px]="380"
          [style.max-width]="'calc(100vw - 48px)'"
          [style.overflow-y]="'auto'"
        >
          <header class="adapt-material-filters-header">
            <h3 class="adapt-material-filters-title">
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              mat-button
              type="button"
              class="adapt-material-filters-clear"
              [disabled]="p.activeFilterCount === 0"
              (click)="p.onClearFilters()"
            >
              {{ p.labels.clearAll }}
            </button>
          </header>
          <div class="adapt-material-filters-body">
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
        </div>
      }
    </adapt-material-popover>`,
})
export class AdaptFilterPopover {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
}
