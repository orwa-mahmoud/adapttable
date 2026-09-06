/**
 * Row actions + add/duplicate/delete — `@adapttable/<kit>/row-actions`.
 *
 * The mutation hook lives on this entry. A table that never imports it
 * never carries add / duplicate / delete.
 */
import { ACTIONS_COLUMN_KEY, type RowAction } from "@adapttable/core";
import { type ReactNode, useMemo } from "react";

import { useRowMutations } from "../rows/rowMutations";
import { slotRender } from "./providers";
import { type ChromeExtraSlotProps, ROW_ACTIONS_LIVE } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

function LiveRowActions({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const rowMutations = useRowMutations({
    labels: chrome.table.labels,
    onAddRow: props.onAddRow,
    onDuplicateRow: props.onDuplicateRow,
    onDeleteRow: props.onDeleteRow,
    confirmDeleteRow: props.confirmDeleteRow,
  });
  const mutationActions = rowMutations.actions;
  const hasRowActions =
    (props.rowActions?.length ?? 0) + mutationActions.length > 0;
  const actionsHidden = chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY);
  const hostRowActions = props.rowActions;
  const rowActions = useMemo<RowAction<never>[] | undefined>(() => {
    if (actionsHidden || !hasRowActions) return undefined;
    if (mutationActions.length === 0) return hostRowActions;
    return [...(hostRowActions ?? []), ...mutationActions];
  }, [actionsHidden, hasRowActions, hostRowActions, mutationActions]);
  const hasAnyActions = hasRowActions || chrome.rowPinning !== undefined;
  const pins = chrome.rowPinning?.actions ?? [];
  // Pin entries ride the same trailing column as the host's row actions, so
  // they are appended rather than given a column of their own.
  const withPins =
    pins.length === 0 ? rowActions : [...(rowActions ?? []), ...pins];
  const visible = actionsHidden || !hasAnyActions ? undefined : withPins;
  return children({
    ...chrome,
    rowMutations,
    rowActions: visible,
    hasRowActions: hasAnyActions,
  });
}

/**
 * Host row actions plus add / duplicate / delete when those handlers exist.
 *
 * @public
 */
export function rowActions<TRow>(
  actions?: readonly RowAction<TRow>[]
): TableFeature<TRow> {
  return {
    id: "row-actions",
    apply: () => (actions ? { rowActions: actions } : {}),
    renders: [
      slotRender(ROW_ACTIONS_LIVE, (props) => <LiveRowActions {...props} />),
    ],
  };
}
