/**
 * User column layout — hide / order / pin / resize / collapse.
 *
 * The three-prop table only honours declared `hidden` and declared order.
 * This entry mounts {@link useColumnLayout} when a layout-owning feature
 * is composed.
 */
import { useCallback, type ReactNode } from "react";

import { autoSizeColumns as autoSizeAllColumns } from "../columns/autoSizeColumns";
import { flattenColumnTree } from "../columns/columnTree";
import { useColumnLayout } from "../columns/useColumnLayout";
import { slotRender } from "./providers";
import { COLUMN_LAYOUT_LIVE, type ChromeExtraSlotProps } from "./slotKeys";

function LiveColumnLayout({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const flattened = flattenColumnTree(props.columns);
  const columnLayout = useColumnLayout({
    columns: chrome.allColumns,
    layout: props.columnLayout,
    onLayoutChange: props.onColumnLayoutChange,
    defaultColumnLayout: props.defaultColumnLayout,
    collapsibleColumnGroups: props.collapsibleColumnGroups === true,
    columnGroups: flattened.groups,
  });
  const root = chrome.rootRef;
  const autoSizeColumns = useCallback(() => {
    if (!root.current) return;
    autoSizeAllColumns(
      root.current,
      columnLayout.visibleColumns.map((column) => column.key),
      columnLayout.setWidth
    );
  }, [columnLayout, root]);
  const autoSizeColumn = useCallback(
    (key: string) => {
      if (!root.current) return;
      autoSizeAllColumns(root.current, [key], columnLayout.setWidth);
    },
    [columnLayout, root]
  );
  return children({
    ...chrome,
    columnLayout,
    columnGroups: flattened.groups,
    autoSizeColumns,
    autoSizeColumn,
  });
}

/** Shared live render for every feature that owns user column layout. */
export const COLUMN_LAYOUT_LIVE_RENDER = slotRender(
  COLUMN_LAYOUT_LIVE,
  (props) => <LiveColumnLayout {...props} />
);
