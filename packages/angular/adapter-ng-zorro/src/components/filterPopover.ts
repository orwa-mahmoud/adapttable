/** The lightweight, anchored NG-ZORRO filter popover, without a backdrop. */
import { type FilterOverlaySlotProps } from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzPopoverModule } from "ng-zorro-antd/popover";

import {
  OVERLAY_Z,
  overlayContains,
  overlayEscapeHandled,
} from "./overlayPlacement";

/** @internal */
@Component({
  selector: "adapt-filter-popover",
  imports: [NgTemplateOutlet, NzButtonModule, NzCardModule, NzPopoverModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      nz-popover
      [dir]="p.dir ?? 'ltr'"
      [nzPopoverTrigger]="null"
      [nzPopoverVisible]="p.open"
      [nzPopoverBackdrop]="false"
      [nzPopoverContent]="content"
      [nzPopoverPlacement]="p.dir === 'rtl' ? 'bottomLeft' : 'bottomRight'"
      [nzPopoverOverlayStyle]="overlayStyle"
      style="display: inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
    </span>
    <ng-template #content>
      @if (p.open) {
        <section
          #card
          [dir]="p.dir ?? 'ltr'"
          [attr.data-dir]="p.dir ?? 'ltr'"
          style="width: 380px; max-width: calc(100vw - 40px); max-height: min(560px, calc(100vh - 48px)); overflow-y: auto"
        >
          <header>
            <h3>
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              nz-button
              type="button"
              [disabled]="p.activeFilterCount === 0"
              (click)="p.onClearFilters()"
            >
              <span>{{ p.labels.clearAll }} </span>
            </button>
          </header>
          <div>
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
        </section>
      }
    </ng-template>
  `,
})
export class AdaptFilterPopover {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  protected readonly overlayStyle = { zIndex: String(OVERLAY_Z) };
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  private readonly card = viewChild<ElementRef<HTMLElement>>("card");

  constructor() {
    effect((onCleanup) => {
      const { open, onClose } = this.props();
      if (!open) return;
      const onClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Node) || !document.contains(event.target))
          return;
        if (
          overlayContains(this.anchor().nativeElement, event.target) ||
          overlayContains(this.card()?.nativeElement, event.target)
        )
          return;
        onClose();
      };
      const onKey = (event: KeyboardEvent): void => {
        if (event.key !== "Escape" || overlayEscapeHandled(event)) return;
        onClose();
        this.anchor()
          .nativeElement.querySelector<HTMLElement>('button, [role="button"]')
          ?.focus();
      };
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      onCleanup(() => {
        document.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
      });
    });
  }
}
