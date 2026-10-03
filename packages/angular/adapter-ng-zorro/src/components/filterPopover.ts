/** The lightweight, anchored NG-ZORRO filter popover, without a backdrop. */
import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
      (nzPopoverVisibleChange)="onVisibleChange($event)"
      [nzPopoverBackdrop]="false"
      [nzPopoverContent]="content"
      nzPopoverPlacement="bottomRight"
      [nzPopoverOverlayStyle]="overlayStyle()"
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
          [style.max-height.px]="availableHeight()"
          style="display: flex; flex-direction: column; width: 340px; max-width: calc(100vw - 64px); max-height: min(560px, 70dvh)"
        >
          <header
            style="flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-block-end: 12px"
          >
            <h3 style="margin: 0; font-size: 14px; font-weight: 600">
              {{ p.labels.filters
              }}{{
                p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
              }}
            </h3>
            <button
              nz-button
              nzType="link"
              nzSize="small"
              type="button"
              [disabled]="p.activeFilterCount === 0"
              (click)="p.onClearFilters()"
            >
              <span>{{ p.labels.clearAll }} </span>
            </button>
          </header>
          <div
            style="min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-inline-end: 4px"
          >
            <ng-container [ngTemplateOutlet]="p.filters" />
          </div>
          <footer
            style="display: flex; flex: none; justify-content: flex-end; padding-block-start: 12px"
          >
            <button
              nz-button
              nzType="primary"
              type="button"
              (click)="p.onClose()"
            >
              {{ p.labels.filtersDone }}
            </button>
          </footer>
        </section>
      }
    </ng-template>
  `,
})
export class AdaptFilterPopover {
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  protected readonly overlayStyle = computed(() => ({
    zIndex: String(OVERLAY_Z),
    maxHeight: this.availableHeight() + 32 + "px",
  }));
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  protected readonly availableHeight = injectPopoverSpace({
    origin: () => this.anchor()?.nativeElement,
    open: () => this.props().open,
    reserve: 64,
  });
  private readonly card = viewChild<ElementRef<HTMLElement>>("card");

  /** Synchronize native dismissal with host state and restore the opener. */
  protected onVisibleChange(open: boolean): void {
    if (open || !this.props().open) return;
    // CDK can dismiss on Escape before the document listener sees the key.
    // Reflect that kit-owned dismissal in the controlled state and opener.
    this.props().onClose();
    this.anchor()
      .nativeElement.querySelector<HTMLElement>('button, [role="button"]')
      ?.focus();
  }

  constructor() {
    effect((onCleanup) => {
      const { open, onClose } = this.props();
      if (!open) return;
      const anchor = this.anchor().nativeElement;
      const card = this.card()?.nativeElement;
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
        event.stopPropagation();
        onClose();
        anchor.querySelector<HTMLElement>('button, [role="button"]')?.focus();
      };
      // Let nested controls consume Escape before CDK's body listener can
      // detach this portal without updating the controlled open state.
      anchor.addEventListener("keydown", onKey);
      card?.addEventListener("keydown", onKey);
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      onCleanup(() => {
        anchor.removeEventListener("keydown", onKey);
        card?.removeEventListener("keydown", onKey);
        document.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
      });
    });
  }
}
