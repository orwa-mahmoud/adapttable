/**
 * Row selection — mounts only when a selection-owning feature is composed.
 */
import { sourceCapabilities } from "@adapttable/core";
import { selectionResetKey } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import { useSelection } from "../selection/useSelection";
import { slotRender } from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  SELECTION_LIVE,
} from "./slotKeys";

function LiveSelection<TRow>({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<TRow>): ReactNode {
  const getId = chrome.getRowId;
  const resetKey = selectionResetKey(chrome.source);
  const selection = useSelection({
    rows: chrome.source.rows,
    getId,
    resetKey,
    selectedIds: props.selectedIds,
    onSelectionChange: props.onSelectionChange,
    acrossPages: sourceCapabilities(chrome.source).selectAcrossPages,
  });
  return children({
    ...chrome,
    table: { ...chrome.table, selection },
  });
}

/** Shared live render so bulk actions and column-select share one hook. */
export const SELECTION_LIVE_RENDER = slotRender<ChromeExtraDraw>(
  SELECTION_LIVE,
  (props) => <LiveSelection {...props} />
);
