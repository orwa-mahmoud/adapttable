/**
 * Row pinning — `@adapttable/<kit>/row-pinning`.
 *
 * The pin state machine and its URL lists live on this entry. A table
 * that never imports it never carries those hooks. They mount in-tree
 * through {@link PINNING_LIVE}.
 */
import { ACTIONS_COLUMN_KEY } from "@adapttable/core";
import { devWarn } from "@adapttable/core";
import { type ReactNode, useEffect } from "react";

import {
  type RowPinLabels,
  type RowPinningState,
  type RowPinState,
  useRowPinning,
} from "../rows/rowPinning";
import { useRowPinningUrlState } from "../url/useRowPinningUrlState";
import { slotRender } from "./providers";
import { type ChromeExtraSlotProps, PINNING_LIVE } from "./slotKeys";
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
  useEffect(() => {
    if (!requested || !blocked) return;
    devWarn(
      "row pinning is ignored while grouping or a tree is armed — pin a flat list, not a nested one."
    );
  }, [blocked, requested]);
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

function LivePinning({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const requested =
    props.pinnedRowIds !== undefined ||
    props.onPinnedRowIdsChange !== undefined;
  const pinUrl = useRowPinningUrlState({
    urlAdapter: props.urlAdapter,
    urlSync:
      props.urlSync !== false && requested && props.pinnedRowIds === undefined,
    urlKey: props.urlKey,
  });
  const pinnedRowIds = requested
    ? (props.pinnedRowIds ?? pinUrl.pinnedRowIds)
    : undefined;
  const onPinnedRowIdsChange = requested
    ? (next: RowPinState) => {
        if (props.pinnedRowIds === undefined) {
          pinUrl.onPinnedRowIdsChange(next);
        }
        props.onPinnedRowIdsChange?.(next);
      }
    : undefined;
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
  const hasAnyActions = chrome.hasRowActions || rowPinning !== undefined;
  const actionsHidden = chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY);
  const pins = rowPinning?.actions ?? [];
  // Pin entries ride the same trailing column as the host's row actions, so
  // they are appended rather than given a column of their own.
  const withPins =
    pins.length === 0
      ? chrome.rowActions
      : [...(chrome.rowActions ?? []), ...pins];
  const rowActions = actionsHidden || !hasAnyActions ? undefined : withPins;
  return children({
    ...chrome,
    rowPinning,
    rowActions,
    hasRowActions: hasAnyActions,
  });
}

/**
 * Let rows be pinned to the top or bottom.
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
    id: "row-pinning",
    apply: () => options,
    renders: [slotRender(PINNING_LIVE, (props) => <LivePinning {...props} />)],
  };
}
