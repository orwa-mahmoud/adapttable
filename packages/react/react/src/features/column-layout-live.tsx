/**
 * User column layout — hide / order / pin / resize / collapse.
 *
 * The three-prop table only honours declared `hidden` and declared order.
 * This entry mounts {@link useColumnLayout} when a layout-owning feature
 * is composed.
 */
import { autoSizeColumns as autoSizeAllColumns } from "@adapttable/core";
import { type ReactNode, useCallback, useMemo } from "react";

import { flattenReactColumnTree } from "../columns/flattenColumnTree";
import { applyReactColumnNames } from "../columns/reactColumns";
import { resolveColumns } from "../columns/resolveColumns";
import { useColumnLayout } from "../columns/useColumnLayout";
import { FeatureStateScope } from "./featureState";
import { slotRender } from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  COLUMN_LAYOUT_LIVE,
} from "./slotKeys";
import { COLUMN_SIZING_STATE, type ColumnSizingState } from "./stateKeys";

function LiveColumnLayout<TRow>({
  chrome,
  props,
  children,
}: Readonly<ChromeExtraSlotProps<TRow>>): ReactNode {
  // Kept across renders explicitly: the values flow into a hook, and the
  // compiler does not memoize across one, so a render would otherwise hand
  // every row new columns.
  const flattened = useMemo(
    () => flattenReactColumnTree(props.columns),
    [props.columns]
  );
  const declaredColumns = useMemo(
    () => resolveColumns(flattened.leaves, props.locale),
    [flattened.leaves, props.locale]
  );
  const columnLayout = useColumnLayout({
    columns: declaredColumns,
    layout: props.columnLayout,
    onLayoutChange: props.onColumnLayoutChange,
    onColumnRename: props.onColumnRename,
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
  const sizing = useMemo(
    (): ColumnSizingState => ({ autoSizeColumns, autoSizeColumn }),
    [autoSizeColumns, autoSizeColumn]
  );
  return (
    <FeatureStateScope stateKey={COLUMN_SIZING_STATE} value={sizing}>
      {children({
        ...chrome,
        allColumns: applyReactColumnNames(
          declaredColumns,
          columnLayout.state.names
        ),
        columnLayout,
        columnGroups: flattened.groups,
      })}
    </FeatureStateScope>
  );
}

/** Shared live render for every feature that owns user column layout. */
export const COLUMN_LAYOUT_LIVE_RENDER = slotRender<ChromeExtraDraw>(
  COLUMN_LAYOUT_LIVE,
  (props) => <LiveColumnLayout {...props} />
);
