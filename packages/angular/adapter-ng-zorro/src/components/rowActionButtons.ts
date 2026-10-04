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
  afterEveryRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";

import type { DataTableClassNames } from "../types";

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
    NzButtonModule,
    NzDropdownModule,
    NzTooltipModule,
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

  private readonly trigger = viewChild<
    ElementRef<HTMLButtonElement>,
    ElementRef<HTMLButtonElement>
  >("trigger", { read: ElementRef });
  private readonly menuPanel = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("menuPanel", { read: ElementRef });
  protected readonly menuOpen = signal(false);
  private focusLast = false;
  private focusedMenu: HTMLElement | null = null;

  constructor() {
    afterEveryRender(() => {
      if (!this.menuOpen()) {
        this.focusedMenu = null;
        return;
      }
      const panel = this.menuPanel()?.nativeElement;
      // NG-ZORRO attaches its template after its visibility debounce. Focusing
      // the still-detached projected nodes earlier is ignored by the browser.
      if (!panel?.isConnected || this.focusedMenu === panel) return;
      const buttons = panel.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)'
      );
      const target = this.focusLast
        ? buttons.item(buttons.length - 1)
        : buttons.item(0);
      if (!target) return;
      target.focus();
      this.focusedMenu = panel;
    });
  }

  protected triggerKey(event: KeyboardEvent): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      this.closeMenu(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.focusLast = event.key === "ArrowUp";
    this.menuOpen.set(true);
  }

  /** NG-ZORRO supplies the menu surface; its button items retain native keyboard focus. */
  protected menuKey(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      this.closeMenu(event);
      return;
    }
    if (event.key === "Tab") {
      this.menuOpen.set(false);
      this.trigger()?.nativeElement.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const menu = this.menuPanel()?.nativeElement;
    const buttons = menu
      ? [
          ...menu.querySelectorAll<HTMLButtonElement>(
            'button[role="menuitem"]:not(:disabled)'
          ),
        ]
      : [];
    if (buttons.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const active = buttons.indexOf(
      menu?.ownerDocument.activeElement as HTMLButtonElement
    );
    let target =
      (active + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
      buttons.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = buttons.length - 1;
    buttons[target]?.focus();
  }

  protected closeMenu(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    this.menuOpen.set(false);
    this.trigger()?.nativeElement.focus();
  }

  protected readonly items = computed(() =>
    visibleRowActions(this.actions(), this.row()).map((action) => {
      const reason = resolveDisabledReason(action.disabledReason?.(this.row()));
      return {
        action,
        reason,
        danger:
          action.color === "danger" ||
          action.color === "red" ||
          action.color === "error",
        disabled:
          reason !== undefined || (action.isDisabled?.(this.row()) ?? false),
      };
    })
  );

  protected run(event: Event, action: RowAction<TRow>): void {
    event.stopPropagation();
    if (
      resolveDisabledReason(action.disabledReason?.(this.row())) !==
        undefined ||
      action.isDisabled?.(this.row())
    )
      return;
    this.menuOpen.set(false);
    runRowAction(action, this.row(), this.confirm(), this.labels().cancel);
  }
}
