/**
 * Row pinning — `@adapttable/<kit>/row-pinning`.
 *
 * The pin state machine and its URL lists live on this entry. A table
 * that never imports it never carries those hooks. They mount in-tree
 * through `PINNING_LIVE`.
 */
import {
  ACTIONS_COLUMN_KEY,
  devWarn,
  rowPinningControl,
} from "@adapttable/core";
import {
  coreRowPinning,
  rowPinningBlockedWarning,
  rowPinningRequested,
  rowPinningUrlSync,
  withRowPinActions,
} from "@adapttable/core/binding";
import { type ReactNode, useEffect } from "react";

import {
  type RowPinLabels,
  type RowPinningState,
  type RowPinState,
  useRowPinning,
} from "../rows/rowPinning";
import { useRowPinningUrlState } from "../url/useRowPinningUrlState";
import { slotRender } from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  PINNING_LIVE,
} from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function useLiveRowPinning<TRow>(options: {
  requested: boolean;
  blocked: boolean;
  pinnedRowIds?: RowPinState;
  onPinnedRowIdsChange?: (next: RowPinState) => void;
  getRowId: (row: TRow) => string;
  labels: RowPinLabels;
}): RowPinningState<TRow> | undefined {
  const { requested, blocked, labels } = options;
  const warning = rowPinningBlockedWarning(requested, blocked);
  useEffect(() => {
    if (warning !== undefined) devWarn(warning);
  }, [warning]);
  const enabled = requested && !blocked;
  const state = useRowPinning<TRow>({
    enabled,
    pinnedRowIds: options.pinnedRowIds,
    onPinnedRowIdsChange: options.onPinnedRowIdsChange,
    getRowId: options.getRowId,
    labels,
  });
  return enabled ? state : undefined;
}

function LivePinning<TRow>({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<TRow>): ReactNode {
  const requested = rowPinningRequested(props);
  const pinUrl = useRowPinningUrlState({
    urlAdapter: props.urlAdapter,
    urlSync: rowPinningUrlSync({
      urlSync: props.urlSync,
      requested,
      pinnedRowIds: props.pinnedRowIds,
    }),
    urlKey: props.urlKey,
  });
  const { pinnedRowIds, onPinnedRowIdsChange } = rowPinningControl({
    requested,
    pinnedRowIds: props.pinnedRowIds,
    onPinnedRowIdsChange: props.onPinnedRowIdsChange,
    urlPinnedRowIds: pinUrl.pinnedRowIds,
    writeUrl: pinUrl.onPinnedRowIdsChange,
  });
  const rowPinning = useLiveRowPinning({
    requested,
    blocked: chrome.groupingArmed || chrome.treeShaped,
    pinnedRowIds,
    onPinnedRowIdsChange,
    getRowId: chrome.getRowId,
    labels: {
      pinToTop: chrome.table.labels.pinToTop,
      pinToBottom: chrome.table.labels.pinToBottom,
      unpinRow: chrome.table.labels.unpinRow,
    },
  });
  // Pin entries ride the same trailing column as the host's row actions, so
  // they are appended rather than given a column of their own.
  const { rowActions, hasRowActions } = withRowPinActions({
    rowActions: chrome.rowActions,
    hasRowActions: chrome.hasRowActions,
    pinning: rowPinning !== undefined,
    pins: rowPinning?.actions ?? [],
    actionsHidden: chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY),
  });
  return children({
    ...chrome,
    rowPinning,
    rowActions,
    hasRowActions,
  });
}

/**
 * Let rows be pinned to the top or bottom.
 *
 * A bare `rowPinning()` runs uncontrolled: the table holds the lists, writes
 * them to the URL as `rowPin` (unless `urlSync={false}`) and Saved Views keep
 * them. Pass `pinnedRowIds` to control the lists, or `onPinnedRowIdsChange`
 * to observe them.
 *
 * @public
 */
export function rowPinning(
  options: {
    pinnedRowIds?: RowPinState;
    onPinnedRowIdsChange?: (next: RowPinState) => void;
  } = {}
): StaticTableFeature {
  return {
    ...coreRowPinning(options),
    renders: [
      slotRender<ChromeExtraDraw>(PINNING_LIVE, (props) => (
        <LivePinning {...props} />
      )),
    ],
  };
}
