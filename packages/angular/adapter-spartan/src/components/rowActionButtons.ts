/**
 * One row's actions: a strip of buttons, or a menu behind a "more" button.
 */
import {
  type ConfirmHandler,
  resolveDisabledReason,
  resolveRenderer,
  type RowAction,
  type RowActionsContext,
  type RowActionsLayout,
  type RowActionsRenderer,
  runRowAction,
  type TableLabels,
  visibleRowActions,
} from "@adapttable/angular";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  input,
  viewChild,
} from "@angular/core";
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from "@spartan-ng/brain/popover";

import { HlmButton } from "../helm/controls";
import type { DataTableClassNames } from "../types";

/**
 * One row's actions: a strip of buttons, or a menu behind a "more" button.
 *
 * @internal
 */
@Component({
  selector: "adapt-row-actions",
  imports: [
    BrnPopover,
    BrnPopoverContent,
    BrnPopoverTrigger,
    HlmButton,
    NgComponentOutlet,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  templateUrl: "./rowActionButtons.html",
})
export class AdaptRowActions<TRow> {
  /** The row. */
  readonly row = input.required<TRow>();
  /** Its actions. */
  readonly actions = input.required<readonly RowAction<TRow>[]>();
  /** Asks before an action that declares a `confirm`. */
  readonly confirm = input.required<ConfirmHandler>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();
  /** A strip of buttons, or a menu. */
  readonly layout = input<RowActionsLayout | undefined>();

  /** Host override, handed the same resolved actions and confirmation gate. */
  readonly render = input<RowActionsRenderer<TRow>>();
  /** Class hooks shared by desktop and mobile actions. */
  readonly classNames = input<DataTableClassNames>({});

  protected readonly context = computed<RowActionsContext<TRow>>(() => ({
    $implicit: this.row(),
    row: this.row(),
    actions: this.actions(),
    confirm: this.confirm(),
    labels: this.labels(),
  }));

  protected readonly renderer = computed(() =>
    resolveRenderer(this.render(), this.context())
  );

  private readonly menu = viewChild<BrnPopover>("menu");
  private readonly document = inject(DOCUMENT);

  constructor() {
    afterRenderEffect(() => {
      const menu = this.menu();
      const label = this.labels().rowActionsMenu;
      if (menu?.stateComputed() !== "open") return;
      // Brain exposes the pane's id, but no accessible-name input on popovers.
      this.document
        .getElementById(menu.id())
        ?.setAttribute("aria-label", label);
    });
  }

  protected readonly items = computed(() =>
    visibleRowActions(this.actions(), this.row()).map((action) => {
      const reason = resolveDisabledReason(action.disabledReason?.(this.row()));
      return {
        action,
        reason,
        disabled:
          reason !== undefined || (action.isDisabled?.(this.row()) ?? false),
      };
    })
  );

  protected run(event: Event, action: RowAction<TRow>): void {
    event.stopPropagation();
    this.menu()?.close();
    runRowAction(action, this.row(), this.confirm(), this.labels().cancel);
  }
}
