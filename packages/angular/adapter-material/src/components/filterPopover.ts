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
      [belowOnly]="true"
      [dir]="p.dir ?? 'ltr'"
      (dismiss)="p.onClose()"
    >
      @if (p.open) {
        <div
          #card
          class="adapt-material-filters-popover"
          [attr.dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          [style.width]="'100%'"
          [style.max-width]="'calc(100vw - 48px)'"
          style="display: flex; flex-direction: column; min-height: 0; max-height: calc(var(--adapt-material-popover-height, 560px) - 32px)"
        >
          <header class="adapt-material-filters-header" style="flex: none">
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
          <div
            class="adapt-material-filters-body"
            style="min-height: 0; overflow-y: auto; overscroll-behavior: contain"
          >
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
          <footer
            class="adapt-material-filters-footer"
            style="flex: none; padding-block-start: 8px"
          >
            <button mat-flat-button type="button" (click)="p.onClose()">
              {{ p.labels.filtersDone }}
            </button>
          </footer>
        </div>
      }
    </adapt-material-popover>`,
})
export class AdaptFilterPopover {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
}
