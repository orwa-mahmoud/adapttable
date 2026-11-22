/**
 * Virtualization for the antd table.
 *
 * antd windows its desktop rows through its own virtual `<Table>`, so the
 * feature brings the plain chrome body (no shared row virtualizer) with the
 * page sentinel off while antd's scroller drives paging, and the keyed window
 * the grouped list and the cards window through.
 */
import {
  CHROME_BODY,
  type ChromeBodyDraw,
  type ChromeBodySlotProps,
  coreVirtualize,
  KEYED_WINDOW_RENDER,
  RowScrollContext,
  slotRender,
  type StaticTableFeature,
  usePlainChromeBodyData,
} from "@adapttable/react/adapter";
import type { VirtualizeOptions } from "@adapttable/react/features";
import { type ReactNode, useCallback } from "react";

import { scrollAntdRow, useAntdRowScrollHandles } from "./antdRowScroll";

function AntdChromeBody<TRow>({
  chrome,
  props,
  children,
}: Readonly<ChromeBodySlotProps<TRow>>): ReactNode {
  const body = usePlainChromeBodyData(chrome, props);
  const rowScroll = useAntdRowScrollHandles();
  const getRowId = chrome.getRowId;
  // antd's own virtual `<Table>` windows flat desktop rows; it pages from
  // its scroller, and find scrolls that scroller to an off-window match.
  const nativeVirtual =
    chrome.body === "desktop" && !chrome.grouping && !chrome.isPaged;
  const scrollToRow = useCallback(
    (row: TRow) => scrollAntdRow(rowScroll, getRowId(row)),
    [rowScroll, getRowId]
  );
  return (
    <RowScrollContext.Provider value={nativeVirtual ? scrollToRow : null}>
      {children(nativeVirtual ? { ...body, canLoadMore: false } : body)}
    </RowScrollContext.Provider>
  );
}

/**
 * Window the rows: antd's virtual table on the desktop, the keyed window for
 * the grouped list and the cards.
 *
 * @public
 */
export function virtualize(
  options: VirtualizeOptions = true
): StaticTableFeature {
  return {
    ...coreVirtualize(options),
    renders: [
      slotRender<ChromeBodyDraw>(CHROME_BODY, (slotProps) => (
        <AntdChromeBody {...slotProps} />
      )),
      KEYED_WINDOW_RENDER,
    ],
  };
}
