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
import { type ReactNode, useEffect, useMemo } from "react";

import { NO_ROW_MUTATIONS, type RowMutationsState } from "../rows/rowMutations";
import {
  type RowPinLabels,
  type RowPinningState,
  type RowPinState,
  useRowPinning,
} from "../rows/rowPinning";
import { useRowPinningUrlState } from "../url/useRowPinningUrlState";
import { FeatureStateScope, useFeatureState } from "./featureState";
import { slotRender } from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  PINNING_LIVE,
} from "./slotKeys";
import {
  GROUPING_STATE,
  ROW_ACTIONS_STATE,
  ROW_PINNING_STATE,
  type RowActionsState,
  TREE_STATE,
} from "./stateKeys";
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
}: Readonly<ChromeExtraSlotProps<TRow>>): ReactNode {
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
  const groupingArmed = useFeatureState(GROUPING_STATE) !== undefined;
  const treeArmed = useFeatureState(TREE_STATE) !== undefined;
  const rowPinning = useLiveRowPinning({
    requested,
    blocked: groupingArmed || treeArmed,
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
  const upstream = useFeatureState(ROW_ACTIONS_STATE) as
    RowActionsState<TRow> | undefined;
  const { rowActions, hasRowActions } = withRowPinActions({
    rowActions: upstream?.rowActions,
    hasRowActions: upstream?.hasRowActions ?? false,
    pinning: rowPinning !== undefined,
    pins: rowPinning?.actions ?? [],
    actionsHidden: chrome.columnLayout.isHidden(ACTIONS_COLUMN_KEY),
  });
  const actions = useMemo(
    (): RowActionsState<TRow> => ({
      rowMutations:
        upstream?.rowMutations ?? (NO_ROW_MUTATIONS as RowMutationsState<TRow>),
      rowActions,
      hasRowActions,
    }),
    [upstream?.rowMutations, rowActions, hasRowActions]
  );
  return (
    <FeatureStateScope stateKey={ROW_PINNING_STATE} value={rowPinning}>
      <FeatureStateScope stateKey={ROW_ACTIONS_STATE} value={actions}>
        {children(chrome)}
      </FeatureStateScope>
    </FeatureStateScope>
  );
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
