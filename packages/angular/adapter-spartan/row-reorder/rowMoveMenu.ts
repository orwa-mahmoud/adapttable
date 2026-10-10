/**
 * Native destination menu for row reorder: targets and a confirmation
 * dialog when the move policy asks for one.
 */
import {
  restoreFocusSoon,
  type RowMoveMenuSlotProps,
} from "@adapttable/angular/adapter";
import {
  ɵHlmButton as HlmButton,
  ɵHlmPopoverLabel as HlmPopoverLabel,
} from "@adapttable/spartan";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  effect,
  type ElementRef,
  input,
  untracked,
  viewChild,
} from "@angular/core";
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from "@spartan-ng/brain/popover";

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
  imports: [
    HlmButton,
    BrnPopover,
    BrnPopoverContent,
    BrnPopoverTrigger,
    HlmPopoverLabel,
  ],
  selector: "adapt-row-move-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <div
      brnPopover
      [adaptHlmPopoverLabel]="p.label"
      #details="brnPopover"
      data-adapttable-part="row-move-menu"
      style="display: inline-block; position: relative"
    >
      <button
        adaptHlmButton
        brnPopoverTrigger
        #trigger
        [attr.aria-label]="p.label"
        data-adapttable-part="row-move-menu-trigger"
        [style]="triggerStyle"
      >
        ⋮</button
      ><ng-template brnPopoverContent>
        <div
          role="menu"
          [attr.aria-label]="p.label"
          class="at-spartan-surface at-spartan-popover"
          data-adapttable-kit="spartan"
          data-adapttable-part="row-move-menu-content"
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
                adaptHlmButton
                type="button"
                (click)="finish(confirmation.onConfirm)"
              >
                {{ confirmation.confirmLabel }}
              </button>
              <button
                adaptHlmButton
                type="button"
                (click)="finish(confirmation.onCancel)"
              >
                {{ confirmation.cancelLabel }}
              </button>
            </div>
          } @else {
            @for (item of p.items; track item.id) {
              <button
                adaptHlmButton
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
    </div>
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

  private readonly details = viewChild<BrnPopover>("details");
  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");

  constructor() {
    afterRenderEffect(() => {
      const confirmation = this.props().confirmation;
      const el = this.details();
      if (confirmation && el) untracked(() => el.open());
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
    const details = this.details();
    details?.close();
    const trigger = this.trigger()?.nativeElement ?? null;
    queueMicrotask(() => {
      restoreFocusSoon(trigger);
    });
  }
}
