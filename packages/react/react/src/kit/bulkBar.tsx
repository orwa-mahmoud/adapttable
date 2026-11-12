/**
 * The bulk action bar, decided once for every kit.
 *
 * The binding owns when the bar shows, the selected count, the offer to
 * extend a full page to every matching row (and to clear it again), running
 * an action with its confirm and its scope, why an action is unavailable,
 * and the error after a failed run. A kit hands over its text, its buttons,
 * and a frame that lays the regions out.
 */
import { type BulkAction, resolveDisabledReason } from "@adapttable/core";
import type { ComponentType, ReactElement, ReactNode } from "react";

import { useBulkBarState } from "../actions/useBulkBarState";
import type { BulkBarChromeProps } from "../chrome/bulkBarChrome";
import type { KitDataAttributes } from "./primitives";

/**
 * Which text of the bar a kit is drawing.
 *
 * @public
 */
export type KitBulkTextKind = "count" | "scope" | "error";

/**
 * A text of the bar.
 *
 * @public
 */
export interface KitBulkTextProps extends KitDataAttributes {
  /** Which text this is. */
  readonly kind: KitBulkTextKind;
  /** `alert` on the error, so it is announced. */
  readonly role?: "alert";
  /** The text. */
  readonly children: ReactNode;
}

/**
 * Which button of the bar a kit is drawing: clear the selection, extend or
 * clear the scope, or one of the host's actions.
 *
 * @public
 */
export type KitBulkButtonKind = "clear" | "select-all-matching" | "action";

/**
 * A button of the bar.
 *
 * @public
 */
export interface KitBulkButtonProps extends KitDataAttributes {
  /** Which button this is. */
  readonly kind: KitBulkButtonKind;
  /** Whether it can be pressed. */
  readonly disabled: boolean;
  /** Whether this action is running. */
  readonly busy: boolean;
  /** Press it. */
  readonly onClick: () => void;
  /** The action's glyph, from the host. */
  readonly icon?: ReactNode;
  /** The action's colour, from the host. */
  readonly color?: string;
  /** Why the action is unavailable, when the host says. */
  readonly reason?: string;
  /** The caption. */
  readonly children: ReactNode;
}

/**
 * The bar's regions, for a kit's frame to lay out.
 *
 * @public
 */
export interface KitBulkBarFrameProps extends KitDataAttributes {
  /** How many rows are selected. */
  readonly count: ReactNode;
  /**
   * The offer to extend a full page to every matching row, or to clear it:
   * its text, its button, and the attributes of the element that holds them.
   * Absent unless the offer applies.
   */
  readonly scope: {
    readonly text: ReactNode;
    readonly button: ReactNode;
    readonly attributes: KitDataAttributes & { readonly role: "status" };
  } | null;
  /** The button that clears the selection. */
  readonly clear: ReactNode;
  /** The host's actions. */
  readonly actions: ReactNode;
  /** The error after a failed run, or nothing. */
  readonly error: ReactNode;
}

/**
 * What a kit hands {@link createBulkBar}.
 *
 * @public
 */
export interface KitBulkBar {
  /** Lays the regions out. */
  readonly Frame: ComponentType<KitBulkBarFrameProps>;
  /** The bar's text. */
  readonly Text: ComponentType<KitBulkTextProps>;
  /** The bar's buttons. */
  readonly Button: ComponentType<KitBulkButtonProps>;
}

/**
 * Build a kit's bulk action bar.
 *
 * @param kit - The kit's frame, text and buttons.
 * @returns The bar, which renders nothing while no row is selected.
 *
 * @public
 */
export function createBulkBar(
  kit: KitBulkBar
): (props: Readonly<BulkBarChromeProps>) => ReactElement | null {
  const { Frame, Text, Button } = kit;
  return function BulkBar({
    selection,
    total,
    bulkActions,
    confirm,
    labels,
  }: Readonly<BulkBarChromeProps>): ReactElement | null {
    const state = useBulkBarState({ selection, total, confirm, labels });
    if (state.selectedCount === 0) return null;
    const { ids, pending, scope } = state;
    const running = pending !== null;
    const actionButton = (action: BulkAction) => {
      const reason = resolveDisabledReason(action.disabledReason?.(ids));
      return (
        <Button
          key={action.key}
          kind="action"
          data-adapttable-part="bulk-button"
          icon={action.icon as ReactNode}
          color={action.color}
          reason={reason}
          busy={pending === action.key}
          disabled={reason !== undefined || running}
          onClick={() => state.run(action, ids, scope)}
        >
          {action.label}
        </Button>
      );
    };
    return (
      <Frame
        data-adapttable-part="bulk-bar"
        count={
          <Text kind="count">{labels.selectedCount(state.selectedCount)}</Text>
        }
        scope={
          state.expandable
            ? {
                attributes: {
                  "data-adapttable-part": "select-all-banner",
                  role: "status",
                },
                text: (
                  <Text kind="scope" data-adapttable-part="select-all-text">
                    {state.banner.text}
                  </Text>
                ),
                button: (
                  <Button
                    kind={
                      selection.allMatching ? "clear" : "select-all-matching"
                    }
                    data-adapttable-part="select-all-button"
                    busy={false}
                    disabled={running}
                    onClick={state.banner.onClick}
                  >
                    {state.banner.action}
                  </Button>
                ),
              }
            : null
        }
        clear={
          <Button
            kind="clear"
            busy={false}
            disabled={running}
            onClick={state.clear}
          >
            {labels.clearAll}
          </Button>
        }
        actions={bulkActions.map(actionButton)}
        error={
          state.errorMessage === null ? null : (
            <Text kind="error" role="alert" data-adapttable-part="bulk-error">
              {`${labels.errorTitle}: ${state.errorMessage}`}
            </Text>
          )
        }
      />
    );
  };
}
