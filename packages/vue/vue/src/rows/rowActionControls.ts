/** Shared action semantics; confirmation and controls must come from the kit. */
import {
  resolveDisabledReason,
  runRowAction,
  visibleRowActions,
} from "@adapttable/core";

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
          "data-adapttable-part": "row-action",
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
