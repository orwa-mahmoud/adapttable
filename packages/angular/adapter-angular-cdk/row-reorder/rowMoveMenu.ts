/**
 * Native destination menu for row reorder: targets and a confirmation
 * dialog when the move policy asks for one.
 */
import {
  restoreFocusSoon,
  type RowMoveMenuSlotProps,
} from "@adapttable/angular";
import { AdaptCdkPopover } from "@adapttable/angular-cdk";
import { A11yModule } from "@angular/cdk/a11y";
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
  imports: [AdaptCdkPopover, A11yModule],
  selector: "adapt-row-move-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span data-adapttable-part="row-move-menu">
      <adapt-cdk-popover
        #popover
        [trigger]="triggerTemplate"
        [content]="content"
        (openChange)="openChanged($event)"
      />
      <ng-template #triggerTemplate let-toggle let-open="open">
        <button
          cdkMonitorElementFocus
          data-adapttable-cdk-control
          type="button"
          [attr.aria-expanded]="open"
          (click)="toggle()"
          #trigger
          [attr.aria-label]="p.label"
          data-adapttable-part="row-move-menu-trigger"
          [style]="triggerStyle"
        >
          ⋮
        </button>
      </ng-template>
      <ng-template #content>
        <div
          role="menu"
          [attr.aria-label]="p.label"
          data-adapttable-part="row-move-menu-content"
          style="min-width: 12rem; padding: 0.5rem; border: 1px solid currentColor; border-radius: 0.375rem; background: Canvas; color: CanvasText"
        >
          @if (p.confirmation; as confirmation) {
            <div
              role="alertdialog"
              cdkTrapFocus
              [cdkTrapFocusAutoCapture]="true"
              [attr.aria-label]="confirmation.title"
              data-adapttable-part="row-move-confirmation"
            >
              <strong>{{ confirmation.title }}</strong>
              <p>{{ confirmation.description }}</p>
              <button
                cdkMonitorElementFocus
                data-adapttable-cdk-control
                type="button"
                (click)="finish(confirmation.onConfirm)"
              >
                {{ confirmation.confirmLabel }}
              </button>
              <button
                cdkMonitorElementFocus
                data-adapttable-cdk-control
                type="button"
                (click)="finish(confirmation.onCancel)"
              >
                {{ confirmation.cancelLabel }}
              </button>
            </div>
          } @else {
            @for (item of p.items; track item.id) {
              <button
                cdkMonitorElementFocus
                data-adapttable-cdk-control
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
      </ng-template>
    </span>
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

  private completing = false;

  private readonly popover = viewChild(AdaptCdkPopover);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");

  constructor() {
    effect(() => {
      const confirmation = this.props().confirmation;
      const popover = this.popover();
      if (confirmation && popover) popover.open.set(true);
    });
    effect((onCleanup) => {
      const confirmation = this.props().confirmation;
      if (!confirmation) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          !this.popover()?.open()
        )
          return;
        event.preventDefault();
        this.finish(confirmation.onCancel);
      };
      document.addEventListener("keydown", onKeyDown);
      onCleanup(() => {
        document.removeEventListener("keydown", onKeyDown);
      });
    });
  }

  protected openChanged(open: boolean): void {
    if (!open && !this.completing) this.props().confirmation?.onCancel();
  }

  protected finish(action: () => void): void {
    const popover = this.popover();
    if (this.completing || !popover?.open()) return;
    this.completing = true;
    try {
      action();
      popover.close();
    } finally {
      this.completing = false;
    }
    const trigger = this.trigger()?.nativeElement ?? null;
    queueMicrotask(() => {
      restoreFocusSoon(trigger);
    });
  }
}
