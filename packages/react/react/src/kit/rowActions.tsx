/**
 * A row's actions, decided once for every kit.
 *
 * The binding owns which actions show, why one is disabled, the confirm step
 * before a destructive one runs, keeping the press off the row, and the
 * choice between a strip of buttons and a menu. A kit hands over how one
 * action looks, the strip around them, the menu and its icons.
 */
import {
  type ConfirmHandler,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  runRowAction,
  type TableLabels,
} from "@adapttable/core";
import {
  resolveDisabledReason,
  visibleRowActions,
} from "@adapttable/core/binding";
import type { ComponentType, MouseEvent, ReactElement, ReactNode } from "react";

/**
 * One action as a kit draws it.
 *
 * @public
 */
export interface KitRowActionItem {
  /** The action's key. */
  readonly key: string;
  /** Its caption. */
  readonly label: string;
  /** The kit's glyph for it, if it has one. */
  readonly icon: ReactNode;
  /** The host's colour for it, such as `"danger"`. */
  readonly color: string | undefined;
  /** Whether it can run for this row. */
  readonly disabled: boolean;
  /** Why it cannot, when the host says. */
  readonly reason: string | undefined;
  /** The smallest touch target, on a card. */
  readonly minTargetSize: number | undefined;
}

/**
 * One action in the strip.
 *
 * @public
 */
export interface KitRowActionProps extends KitRowActionItem {
  /** Run it; absent while it is disabled. */
  readonly onClick: ((event: MouseEvent) => void) | undefined;
}

/**
 * The actions behind one trigger.
 *
 * @public
 */
export interface KitRowActionMenuProps {
  /** The trigger's name. */
  readonly label: string;
  /** The smallest touch target, on a card. */
  readonly minTargetSize: number | undefined;
  /** The actions, each with what to do when chosen. */
  readonly items: readonly (KitRowActionItem & {
    readonly onSelect: () => void;
  })[];
}

/**
 * What a kit hands {@link createRowActionButtons}.
 *
 * @public
 */
export interface KitRowActions {
  /** One action in the strip. */
  readonly Action: ComponentType<KitRowActionProps>;
  /** The strip that holds them. */
  readonly Strip: ComponentType<{ readonly children: ReactNode }>;
  /** The menu layout. */
  readonly Menu: ComponentType<KitRowActionMenuProps>;
  /** The kit's glyph for an action. */
  readonly iconFor: (action: RowAction<never>) => ReactNode;
}

/**
 * The props of a row's actions.
 *
 * @public
 */
export interface RowActionButtonsProps<TRow> {
  /** The row. */
  readonly row: TRow;
  /** The smallest touch target, on a card. */
  readonly minTargetSize?: number;
  /** The host's actions. */
  readonly actions: readonly RowAction<TRow>[];
  /** Asks before a destructive action runs. */
  readonly confirm: ConfirmHandler;
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
  /** A strip of buttons or one menu. */
  readonly layout?: RowActionsLayout;
  /** The host's own rendering of the actions. */
  readonly render?: RowActionsRenderer<TRow>;
}

/**
 * Build a kit's row actions.
 *
 * @param kit - The kit's action, strip, menu and icons.
 * @returns The row actions component.
 *
 * @public
 */
export function createRowActionButtons(
  kit: KitRowActions
): <TRow>(props: Readonly<RowActionButtonsProps<TRow>>) => ReactElement | null {
  const { Action, Strip, Menu, iconFor } = kit;
  return function RowActionButtons<TRow>({
    row,
    minTargetSize,
    actions,
    confirm,
    labels,
    layout,
    render,
  }: Readonly<RowActionButtonsProps<TRow>>): ReactElement | null {
    if (render) return <>{render({ row, actions, confirm, labels })}</>;
    const visible = visibleRowActions(actions, row);
    if (visible.length === 0) return null;
    const items = visible.map((action) => {
      const reason = resolveDisabledReason(action.disabledReason?.(row));
      return {
        action,
        key: action.key,
        label: action.label,
        icon: iconFor(action),
        color: action.color,
        disabled: reason !== undefined || (action.isDisabled?.(row) ?? false),
        reason,
        minTargetSize,
      };
    });
    if (layout === "menu") {
      return (
        <Menu
          label={labels.rowActionsMenu}
          minTargetSize={minTargetSize}
          items={items.map(({ action, ...item }) => ({
            ...item,
            onSelect: () => runRowAction(action, row, confirm, labels.cancel),
          }))}
        />
      );
    }
    return (
      <Strip>
        {items.map(({ action, ...item }) => (
          <Action
            {...item}
            key={item.key}
            // The row behind the button has its own press: an action runs
            // without also opening or selecting the row.
            onClick={
              item.disabled
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    runRowAction(action, row, confirm, labels.cancel);
                  }
            }
          />
        ))}
      </Strip>
    );
  };
}
