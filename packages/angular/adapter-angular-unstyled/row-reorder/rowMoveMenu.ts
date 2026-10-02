/**
 * Native destination menu for row reorder: targets and a confirmation
 * dialog when the move policy asks for one.
 */
import {
  restoreFocusSoon,
  type RowMoveMenuSlotProps,
} from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  input,
  viewChild,
} from "@angular/core";

const REORDER_BUTTON = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.75em",
  height: "1.75em",
  flexShrink: "0",
  padding: "0",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
} as const;

/**
 * Nested-row destination menu and confirmation, drawn with native details.
 *
 * @public
 */
@Component({
  selector: "adapt-row-move-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <details
      #details
      data-adapttable-part="row-move-menu"
      style="display: inline-block; position: relative"
    >
      <summary
        #trigger
        [attr.aria-label]="p.label"
        data-adapttable-part="row-move-menu-trigger"
        [style]="triggerStyle"
      >
        ⋮
      </summary>
      <div
        role="menu"
        [attr.aria-label]="p.label"
        data-adapttable-part="row-move-menu-content"
        style="position: absolute; z-index: 20; inset-inline-start: 0; min-width: 12rem; padding: 0.5rem; border: 1px solid currentColor; border-radius: 0.375rem; background: Canvas; color: CanvasText"
      >
        @if (p.confirmation; as confirmation) {
          <div
            role="alertdialog"
            [attr.aria-label]="confirmation.title"
            data-adapttable-part="row-move-confirmation"
          >
            <strong>{{ confirmation.title }}</strong>
            <p>{{ confirmation.description }}</p>
            <button type="button" (click)="finish(confirmation.onConfirm)">
              {{ confirmation.confirmLabel }}
            </button>
            <button type="button" (click)="finish(confirmation.onCancel)">
              {{ confirmation.cancelLabel }}
            </button>
          </div>
        } @else {
          @for (item of p.items; track item.id) {
            <button
              type="button"
              role="menuitem"
              [disabled]="item.disabled"
              [attr.title]="item.disabledReason ?? null"
              data-adapttable-part="row-move-menu-item"
              style="display: block; width: 100%; min-height: 2.75rem; text-align: start"
              (click)="item.onSelect()"
            >
              {{ item.label }}
            </button>
          }
        }
      </div>
    </details>
  `,
})
export class AdaptRowMoveMenu {
  /** Menu label, targets and optional confirmation. */
  readonly props = input.required<RowMoveMenuSlotProps>();

  protected readonly triggerStyle = {
    ...REORDER_BUTTON,
    cursor: "pointer",
    listStyle: "none",
  };

  private readonly details =
    viewChild<ElementRef<HTMLDetailsElement>>("details");
  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");

  constructor() {
    effect(() => {
      const confirmation = this.props().confirmation;
      const el = this.details()?.nativeElement;
      if (confirmation && el) el.open = true;
    });
    effect((onCleanup) => {
      const confirmation = this.props().confirmation;
      if (!confirmation) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        this.finish(confirmation.onCancel);
      };
      document.addEventListener("keydown", onKeyDown);
      onCleanup(() => {
        document.removeEventListener("keydown", onKeyDown);
      });
    });
  }

  protected finish(action: () => void): void {
    action();
    const details = this.details()?.nativeElement;
    if (details) details.open = false;
    const trigger = this.trigger()?.nativeElement ?? null;
    queueMicrotask(() => {
      restoreFocusSoon(trigger);
    });
  }
}
