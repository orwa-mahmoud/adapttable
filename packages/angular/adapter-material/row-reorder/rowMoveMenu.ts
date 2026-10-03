/**
 * Native destination menu for row reorder: targets and a confirmation
 * dialog when the move policy asks for one.
 */
import {
  restoreFocusSoon,
  type RowMoveMenuSlotProps,
} from "@adapttable/angular";
import { AdaptMaterialPopover } from "@adapttable/angular-material";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";

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
  imports: [MatButtonModule, AdaptMaterialPopover],
  selector: "adapt-row-move-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span
      data-adapttable-part="row-move-menu"
      style="display: inline-block; position: relative"
    >
      <button
        mat-icon-button
        type="button"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
        #trigger
        [attr.aria-label]="p.label"
        data-adapttable-part="row-move-menu-trigger"
        [style]="triggerStyle"
      >
        ⋮
      </button>
      @if (triggerElement(); as triggerNode) {
        <adapt-material-popover
          [origin]="triggerNode.nativeElement"
          [open]="open()"
          (dismiss)="dismiss()"
        >
          <div
            role="menu"
            [attr.aria-label]="p.label"
            data-adapttable-part="row-move-menu-content"
            style="min-width: 12rem"
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
                  mat-button
                  type="button"
                  (click)="finish(confirmation.onConfirm)"
                >
                  {{ confirmation.confirmLabel }}
                </button>
                <button
                  mat-button
                  type="button"
                  (click)="finish(confirmation.onCancel)"
                >
                  {{ confirmation.cancelLabel }}
                </button>
              </div>
            } @else {
              @for (item of p.items; track item.id) {
                <button
                  mat-button
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
        </adapt-material-popover>
      }
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

  protected readonly open = signal(false);
  protected readonly triggerElement = viewChild<
    unknown,
    ElementRef<HTMLElement>
  >("trigger", { read: ElementRef });

  constructor() {
    effect(() => {
      const confirmation = this.props().confirmation;
      if (confirmation) this.open.set(true);
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

  protected dismiss(): void {
    const confirmation = this.props().confirmation;
    if (confirmation) this.finish(confirmation.onCancel);
    else this.open.set(false);
  }

  protected finish(action: () => void): void {
    action();
    this.open.set(false);
    const trigger = this.triggerElement()?.nativeElement ?? null;
    queueMicrotask(() => {
      restoreFocusSoon(trigger);
    });
  }
}
