/**
 * Row actions + add/duplicate/delete — `@adapttable/<kit>/row-actions`.
 *
 * The mutation hook lives on this entry. A table that never imports it
 * never carries add / duplicate / delete.
 */
import {
  ACTIONS_COLUMN_KEY,
  type RowAction,
  withRowMutationActions,
  withRowPinActions,
} from "@adapttable/core";
import { coreRowActions } from "@adapttable/core/binding";
import { type ReactNode, useMemo } from "react";

import {
  type RowMutationHandlers,
  useRowMutations,
} from "../rows/rowMutations";
import { slotRender } from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  ROW_ACTIONS_LIVE,
} from "./slotKeys";
import type { TableFeature } from "./tableFeature";

function LiveRowActions<TRow>({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<TRow>): ReactNode {
  const rowMutations = useRowMutations({
    labels: chrome.table.labels,
    onAddRow: props.onAddRow,
    onDuplicateRow: props.onDuplicateRow,
    onDeleteRow: props.onDeleteRow,
    confirmDeleteRow: props.confirmDeleteRow,
  });
  const mutationActions = rowMutations.actions;
  const actionsHidden = chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY);
  const hostRowActions = props.rowActions;
  const merged = useMemo(
    () =>
      withRowMutationActions({
        host: hostRowActions,
        mutations: mutationActions,
        actionsHidden,
      }),
    [actionsHidden, hostRowActions, mutationActions]
  );
  // Pin entries ride the same trailing column as the host's row actions, so
  // they are appended rather than given a column of their own.
  const visible = withRowPinActions({
    rowActions: merged.rowActions,
    hasRowActions: merged.hasRowActions,
    pinning: chrome.rowPinning !== undefined,
    pins: chrome.rowPinning?.actions ?? [],
    actionsHidden,
  });
  return children({
    ...chrome,
    rowMutations,
    rowActions: visible.rowActions,
    hasRowActions: visible.hasRowActions,
  });
}

/**
 * Host row actions plus add / duplicate / delete when those handlers exist.
 *
 * `actions` are the host's own trailing row actions. `handlers` turn on the
 * row mutations: `onAddRow` puts an Add control in the toolbar,
 * `onDuplicateRow` and `onDeleteRow` put Duplicate and Delete on every row
 * after the host's actions, and a delete confirms first unless
 * `confirmDeleteRow` is `false`. The table only asks; the host changes the
 * data.
 *
 * @example
 * ```tsx
 * features={[
 *   rowActions([{ key: "open", label: "Open", onClick: openRow }], {
 *     onAddRow: () => setRows((rows) => [...rows, blankRow()]),
 *     onDuplicateRow: (row) => setRows((rows) => [...rows, copyOf(row)]),
 *     onDeleteRow: (row) => setRows((rows) => rows.filter((r) => r.id !== row.id)),
 *   }),
 * ]}
 * ```
 *
 * @public
 */
export function rowActions<TRow>(
  actions?: readonly RowAction<TRow>[],
  handlers?: RowMutationHandlers<TRow>
): TableFeature<TRow> {
  return {
    ...coreRowActions<TRow>(actions, handlers),
    renders: [
      slotRender<ChromeExtraDraw>(ROW_ACTIONS_LIVE, (props) => (
        <LiveRowActions {...props} />
      )),
    ],
  };
}
