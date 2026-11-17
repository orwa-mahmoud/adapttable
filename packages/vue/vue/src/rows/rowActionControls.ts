/** Shared action semantics; confirmation and controls must come from the kit. */
import { runRowAction } from "@adapttable/core";
import { type Component, h, isVNode, type VNodeChild } from "vue";

export type {
  RowActionControl,
  RowActionControlsInput,
  RowActionControlsProjector,
} from "../layout/modelChannels";
export type {
  ConfirmHandler,
  ConfirmRequest,
  RowAction,
} from "@adapttable/core";
import {
  resolveDisabledReason,
  visibleRowActions,
} from "@adapttable/core/binding";

import { withProps } from "../functionalProps";
import type {
  RowActionControl,
  RowActionControlsInput,
} from "../layout/modelChannels";

/** Resolve once for display and recheck permission/disabled state at invocation. @public */
export function rowActionControls<TRow>(
  options: RowActionControlsInput<TRow>
): readonly RowActionControl<TRow>[] {
  const { row, confirm, cancelLabel, enabled } = options;
  return visibleRowActions(options.actions, row)
    .filter((action) => !action.editsRow || action.onClick !== undefined)
    .map((action) => {
      const allowed = (): boolean =>
        enabled() &&
        action.isHidden?.(row) !== true &&
        action.isDisabled?.(row) !== true &&
        resolveDisabledReason(action.disabledReason?.(row)) === undefined;
      const reason = resolveDisabledReason(action.disabledReason?.(row));
      return {
        key: action.key,
        label: action.label,
        action,
        attrs: {
          type: "button",
          disabled: !allowed(),
          title: reason ?? action.label,
          "aria-label": action.label,
          "data-adapttable-part": "action-button",
          "data-color": action.color,
          onClick: () => {
            if (!allowed()) return;
            runRowAction(
              {
                ...action,
                onClick: (current) => {
                  if (allowed()) return action.onClick?.(current);
                },
              },
              row,
              confirm,
              cancelLabel
            );
          },
        },
      };
    });
}

/** A component icon's box: decorative, laid out like the glyph it holds. */
const ICON_WRAPPER = {
  "aria-hidden": "true",
  style: { display: "inline-flex" },
} as const;

/**
 * What an action's button shows: the host's icon when the action has one
 * (its label stays the accessible name and tooltip), its label otherwise.
 * The icon may be a vnode, a component or a glyph string.
 *
 * @param control - The action's control.
 * @returns The button's content.
 * @public
 */
export function rowActionContent<TRow>(
  control: RowActionControl<TRow>
): VNodeChild {
  const icon = control.action.icon;
  if (icon === undefined || icon === null || icon === false)
    return control.label;
  if (isVNode(icon) || typeof icon === "string" || typeof icon === "number")
    return icon;
  if (typeof icon === "object" || typeof icon === "function")
    return h("span", ICON_WRAPPER, [h(icon as Component)]);
  return control.label;
}

/**
 * Whether an action's button shows only its icon.
 *
 * @param control - The action's control.
 * @returns True when the host gave the action an icon.
 * @public
 */
export function rowActionIconOnly<TRow>(
  control: RowActionControl<TRow>
): boolean {
  const icon = control.action.icon;
  return icon !== undefined && icon !== null && icon !== false;
}

/**
 * {@link rowActionContent} as a component, for a kit that draws its row
 * actions in a template.
 *
 * @public
 */
export const RowActionContent = /* @__PURE__ */ withProps(
  function RowActionContent(props: {
    readonly control: RowActionControl<unknown>;
  }): VNodeChild {
    return rowActionContent(props.control);
  },
  ["control"]
);
