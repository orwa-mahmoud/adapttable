import {
  restoreFocusSoon,
  type RowMoveMenuSlotProps,
} from "@adapttable/angular/adapter";
import { ɵTAIGA_CONTROLS as TAIGA_CONTROLS } from "@adapttable/taiga-ui";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  input,
  signal,
  viewChild,
} from "@angular/core";

/**
 * Native destination menu for row reorder: targets and a confirmation
 * dialog when the move policy asks for one.
 */

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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-row-move-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span
      #details
      data-adapttable-part="row-move-menu"
      style="display: inline-block; position: relative"
      ><button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        [tuiDropdown]="menuContent"
        tuiDropdownRole="dialog"
        [adaptTaigaDropdownLabel]="p.label"
        [tuiDropdownOpen]="menuOpen()"
        (tuiDropdownOpenChange)="onOpenChange($event)"
        [attr.aria-expanded]="menuOpen()"
        #trigger
        [attr.aria-label]="p.label"
        data-adapttable-part="row-move-menu-trigger"
        [style]="triggerStyle"
      >
        ⋮</button
      ><ng-template #menuContent>
        <div
          role="group"
          [attr.aria-label]="p.label"
          data-adapttable-part="row-move-menu-content"
          style="  min-width: 12rem; padding: 0.5rem; border: 1px solid currentColor; border-radius: 0.375rem; background: Canvas; color: CanvasText"
        >
          @if (p.confirmation; as confirmation) {
            <div
              role="alertdialog"
              [attr.aria-label]="confirmation.title"
              data-adapttable-part="row-move-confirmation"
            >
              <strong>{{ confirmation.title }}</strong>
              <p>{{ confirmation.description }}</p>
              <button
                tuiButton
                size="s"
                appearance="secondary"
                type="button"
                (click)="finish(confirmation.onConfirm)"
              >
                {{ confirmation.confirmLabel }}
              </button>
              <button
                tuiButton
                size="s"
                appearance="secondary"
                type="button"
                (click)="finish(confirmation.onCancel)"
              >
                {{ confirmation.cancelLabel }}
              </button>
            </div>
          } @else {
            @for (item of p.items; track item.id) {
              <button
                tuiButton
                size="s"
                appearance="secondary"
                type="button"
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
      </ng-template></span
    >
  `,
})
export class AdaptRowMoveMenu {
  protected readonly menuOpen = signal(false);
  /** Menu label, targets and optional confirmation. */
  readonly props = input.required<RowMoveMenuSlotProps>();

  protected readonly triggerStyle = {
    ...REORDER_BUTTON,
    cursor: "pointer",
    listStyle: "none",
  };

  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");

  constructor() {
    effect(() => {
      const confirmation = this.props().confirmation;
      if (confirmation) this.menuOpen.set(true);
    });
  }

  protected onOpenChange(open: boolean): void {
    const confirmation = this.props().confirmation;
    if (!open && confirmation) this.finish(confirmation.onCancel);
    else this.menuOpen.set(open);
  }

  protected finish(action: () => void): void {
    action();
    this.menuOpen.set(false);
    const trigger = this.trigger()?.nativeElement ?? null;
    queueMicrotask(() => {
      restoreFocusSoon(trigger);
    });
  }
}
