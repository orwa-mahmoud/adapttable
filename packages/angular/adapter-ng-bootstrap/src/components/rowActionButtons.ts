/**
 * One row's actions: a strip of buttons, or a menu behind a "more" button.
 */
import type {
  ConfirmHandler,
  RowAction,
  RowActionsContext,
  RowActionsLayout,
  RowActionsRenderer,
  TableLabels,
} from "@adapttable/angular";
import {
  resolveDisabledReason,
  resolveRenderer,
  runRowAction,
  visibleRowActions,
} from "@adapttable/angular/adapter";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  viewChild,
} from "@angular/core";
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from "@ng-bootstrap/ng-bootstrap/dropdown";

import type { DataTableClassNames } from "../types";
import { bootstrapPopperOptions } from "./bootstrapPositioning";

let nextRowActionsId = 0;

/**
 * One row's actions: a strip of buttons, or a menu behind a "more" button.
 *
 * @internal
 */
@Component({
  selector: "adapt-row-actions",
  imports: [
    NgComponentOutlet,
    NgTemplateOutlet,
    NgbDropdown,
    NgbDropdownMenu,
    NgbDropdownButtonItem,
    NgbDropdownItem,
    NgbDropdownToggle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  templateUrl: "./rowActionButtons.html",
})
export class AdaptRowActions<TRow> {
  protected readonly menuId = `adapt-ng-bootstrap-row-actions-${nextRowActionsId++}`;
  protected readonly popperOptions = bootstrapPopperOptions;
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

  private readonly menu = viewChild(NgbDropdown);

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
