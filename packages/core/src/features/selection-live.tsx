/**
 * Row selection — mounts only when a selection-owning feature is composed.
 */
import type { ReactNode } from "react";

import { useSelection } from "../selection/useSelection";
import { stableKey } from "../utils/stableKey";
import { slotRender } from "./providers";
import { type ChromeExtraSlotProps, SELECTION_LIVE } from "./slotKeys";

function LiveSelection({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const getId = chrome.getRowId;
  const resetKey = `${chrome.source.search}|${stableKey(chrome.source.extra)}|${chrome.source.groupBy ?? ""}`;
  const selection = useSelection({
    rows: chrome.source.rows,
    getId,
    resetKey,
    selectedIds: props.selectedIds,
    onSelectionChange: props.onSelectionChange,
  });
  return children({
    ...chrome,
    table: { ...chrome.table, selection },
  });
}

/** Shared live render so bulk actions and column-select share one hook. */
export const SELECTION_LIVE_RENDER = slotRender(SELECTION_LIVE, (props) => (
  <LiveSelection {...props} />
));
