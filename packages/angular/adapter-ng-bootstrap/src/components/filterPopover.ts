/** ng-bootstrap's anchored, backdrop-free filter overlay. */
import {
  type FilterOverlaySlotProps,
  injectPopoverSpace,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type TemplateRef,
  untracked,
  viewChild,
} from "@angular/core";
import { NgbPopover } from "@ng-bootstrap/ng-bootstrap/popover";

/** The kit owns placement, outside-click dismissal and Escape handling. */
@Component({
  selector: "adapt-filter-popover",
  imports: [NgTemplateOutlet, NgbPopover],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <span
      #anchor
      data-ng-bootstrap-part="filters-anchor"
      [ngbPopover]="content"
      triggers="manual"
      autoClose="outside"
      [animation]="false"
      [placement]="
        p.dir === 'rtl'
          ? ['bottom-start', 'top-start']
          : ['bottom-end', 'top-end']
      "
      popoverClass="adapttable-filter-popover"
      (hidden)="closed()"
      (shown)="shown()"
      style="position: relative; display: inline-flex"
    >
      @if (p.children; as trigger) {
        <ng-container [ngTemplateOutlet]="trigger" />
      }
    </span>
    <ng-template #content>
      <div
        data-ng-bootstrap-part="filters-popover"
        [style.max-height.px]="availableHeight()"
        style="display: flex; flex-direction: column; overflow: hidden; width: 340px; max-width: calc(100vw - 32px)"
        [attr.dir]="p.dir ?? 'ltr'"
        [attr.data-dir]="p.dir ?? 'ltr'"
      >
        <header data-ng-bootstrap-part="filters-header">
          <h3 data-ng-bootstrap-part="filters-title">
            {{ p.labels.filters
            }}{{
              p.activeFilterCount > 0 ? " (" + p.activeFilterCount + ")" : ""
            }}
          </h3>
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            data-ng-bootstrap-part="filters-clear"
            [disabled]="p.activeFilterCount === 0"
            (click)="p.onClearFilters()"
          >
            {{ p.labels.clearAll }}
          </button>
        </header>
        <div
          data-ng-bootstrap-part="filters-body"
          style="min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-block-end: 4px; scroll-padding-block: 4px"
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
  private readonly popover = viewChild.required(NgbPopover);
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>("anchor");
  private readonly viewportSpace = injectPopoverSpace({
    origin: () => this.anchor()?.nativeElement,
    open: () => this.props().open,
    reserve: 48,
    allowAbove: () => {
      const origin = this.anchor()?.nativeElement;
      const viewport = origin?.ownerDocument.defaultView;
      return (
        viewport != null &&
        viewport.innerHeight - origin.getBoundingClientRect().bottom - 48 < 160
      );
    },
  });
  protected readonly availableHeight = computed(() =>
    Math.min(560, this.viewportSpace())
  );
  private restoreFocus = false;

  constructor() {
    afterRenderEffect((cleanup) => {
      const { open } = this.props();
      const overlay = this.popover();
      // NgbPopover registers render callbacks while opening. Native lifecycle
      // work must run outside this effect's reactive dependency tracking.
      untracked(() => {
        if (open && !overlay.isOpen()) overlay.open();
        if (!open && overlay.isOpen()) overlay.close();
      });
      if (!open) return;
      const document = this.anchor().nativeElement.ownerDocument;
      const keydown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") this.restoreFocus = true;
      };
      document.addEventListener("keydown", keydown, true);
      cleanup(() => document.removeEventListener("keydown", keydown, true));
    });
  }

  protected shown(): void {
    const anchor = this.anchor().nativeElement;
    const id = anchor.getAttribute("aria-describedby");
    const window = id ? anchor.ownerDocument.getElementById(id) : null;
    window?.setAttribute("role", "dialog");
    window?.setAttribute("aria-label", this.props().labels.filters);
  }

  protected closed(): void {
    if (this.props().open) this.props().onClose();
    if (this.restoreFocus)
      this.anchor().nativeElement.querySelector("button")?.focus();
    this.restoreFocus = false;
  }
}
