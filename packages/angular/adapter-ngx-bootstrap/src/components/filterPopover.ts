/** ngx-bootstrap's anchored, backdrop-free filter overlay. */
import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
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
import { PopoverDirective } from "ngx-bootstrap/popover";

import { injectBootstrapOverlayContainer } from "./bootstrapOverlay";

/** The kit owns placement, outside-click dismissal and Escape handling. */
@Component({
  selector: "adapt-filter-popover",
  imports: [NgTemplateOutlet, PopoverDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      data-ngx-bootstrap-part="filters-anchor"
      [popover]="content"
      [container]="overlayContainer()"
      triggers="manual"
      [outsideClick]="true"
      [placement]="p.dir === 'rtl' ? 'bottom left' : 'bottom right'"
      containerClass="adapttable-filter-popover"
      (onHidden)="closed()"
      (onShown)="shown()"
      style="position: relative; display: inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
    </span>
    <ng-template #content>
      <div
        data-ngx-bootstrap-part="filters-popover"
        [style.max-height.px]="availableHeight()"
        style="display: flex; flex-direction: column; overflow: hidden; width: 340px; max-width: calc(100vw - 32px)"
        (click)="keepRemovedContentInside($event)"
        [attr.dir]="p.dir ?? 'ltr'"
        [attr.data-dir]="p.dir ?? 'ltr'"
      >
        <header data-ngx-bootstrap-part="filters-header">
          <h3 data-ngx-bootstrap-part="filters-title">
            {{ p.labels.filters
            }}{{
              p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
            }}
          </h3>
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            data-ngx-bootstrap-part="filters-clear"
            [disabled]="p.activeFilterCount === 0"
            (click)="p.onClearFilters()"
          >
            {{ p.labels.clearAll }}
          </button>
        </header>
        <div
          data-ngx-bootstrap-part="filters-body"
          style="min-height: 0; overflow-y: auto; overscroll-behavior: contain"
        >
          <ng-container [ngTemplateOutlet]="p.filters" />
        </div>
        <footer
          style="flex: none; display: flex; justify-content: flex-end; padding-block-start: 12px"
        >
          <button
            class="btn btn-primary btn-sm"
            type="button"
            (click)="p.onClose()"
          >
            {{ p.labels.filtersDone }}
          </button>
        </footer>
      </div>
    </ng-template>
  `,
})
export class AdaptFilterPopover {
  /** The binding's overlay contract. */
  readonly props =
    input.required<FilterOverlaySlotProps<TemplateRef<unknown>>>();
  protected readonly overlayContainer = injectBootstrapOverlayContainer();
  private readonly popover = viewChild.required(PopoverDirective);
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  protected readonly availableHeight = injectPopoverSpace({
    origin: () => this.anchor()?.nativeElement,
    open: () => this.props().open,
    reserve: 48,
  });
  private restoreFocus = false;

  constructor() {
    afterRenderEffect((cleanup) => {
      const { open } = this.props();
      const overlay = this.popover();
      if (open && !overlay.isOpen()) overlay.show();
      if (!open && overlay.isOpen()) overlay.hide();
      if (!open) return;
      const document = this.anchor().nativeElement.ownerDocument;
      const keydown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          this.restoreFocus = true;
          overlay.hide();
        }
      };
      document.addEventListener("keydown", keydown, true);
      cleanup(() => document.removeEventListener("keydown", keydown, true));
    });
  }

  protected shown(): void {
    const anchor = this.anchor().nativeElement;
    // onShown precedes the directive's aria-describedby assignment. Its native
    // container is already mounted in this instance's dedicated portal.
    const selector = this.overlayContainer();
    const container = selector
      ? anchor.ownerDocument.querySelector(selector)
      : anchor.parentElement;
    const window = container?.querySelector("popover-container");
    window?.setAttribute("role", "dialog");
    window?.setAttribute("aria-label", this.props().labels.filters);
  }

  protected keepRemovedContentInside(event: MouseEvent): void {
    // The bubbling path still includes this surface if an inside action
    // removes its target. Preserve that inside press before ngx-bootstrap's
    // document listener checks the target's current containment.
    if (event.target instanceof Node && !event.target.isConnected)
      event.stopPropagation();
  }

  protected closed(): void {
    if (this.props().open) this.props().onClose();
    if (this.restoreFocus)
      this.anchor().nativeElement.querySelector("button")?.focus();
    this.restoreFocus = false;
  }
}
