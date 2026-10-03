/**
 * Native destination menu for row reorder: targets and a confirmation
 * dialog when the move policy asks for one.
 */
import {
  restoreFocusSoon,
  type RowMoveMenuSlotProps,
} from "@adapttable/angular";
import { ɵbootstrapPopperOptions as bootstrapPopperOptions } from "@adapttable/ng-bootstrap";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  input,
  viewChild,
} from "@angular/core";
import {
  NgbDropdown,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from "@ng-bootstrap/ng-bootstrap/dropdown";

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
  imports: [NgbDropdown, NgbDropdownMenu, NgbDropdownItem, NgbDropdownToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <div
      ngbDropdown
      [popperOptions]="popperOptions"
      autoClose="outside"
      #details="ngbDropdown"
      data-adapttable-part="row-move-menu"
      style="display: inline-block; position: relative"
    >
      <button
        type="button"
        ngbDropdownToggle
        class="btn btn-outline-secondary btn-sm"
        #trigger
        [attr.aria-label]="p.label"
        data-adapttable-part="row-move-menu-trigger"
        [style]="triggerStyle"
      >
        ⋮
      </button>
      <div
        ngbDropdownMenu
        role="menu"
        [attr.aria-label]="p.label"
        data-adapttable-part="row-move-menu-content"
        style="min-width: 12rem; padding: 0.5rem"
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
              class="btn btn-outline-secondary btn-sm"
              type="button"
              (click)="finish(confirmation.onConfirm)"
            >
              {{ confirmation.confirmLabel }}
            </button>
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              (click)="finish(confirmation.onCancel)"
            >
              {{ confirmation.cancelLabel }}
            </button>
          </div>
        } @else {
          @for (item of p.items; track item.id) {
            <button
              class="dropdown-item"
              ngbDropdownItem
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
    </div>
  `,
})
export class AdaptRowMoveMenu {
  protected readonly popperOptions = bootstrapPopperOptions;
  /** Menu label, targets and optional confirmation. */
  readonly props = input.required<RowMoveMenuSlotProps>();

  protected readonly triggerStyle = {
    ...REORDER_BUTTON,
    cursor: "pointer",
    listStyle: "none",
  };

  private readonly details = viewChild(NgbDropdown);
  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");

  constructor() {
    effect(() => {
      const confirmation = this.props().confirmation;
      if (confirmation) this.details()?.open();
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
    this.details()?.close();
    const trigger = this.trigger()?.nativeElement ?? null;
    queueMicrotask(() => {
      restoreFocusSoon(trigger);
    });
  }
}
