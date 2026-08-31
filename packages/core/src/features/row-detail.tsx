/**
 * Row detail / nested table — expansion chrome.
 *
 * The expansion hook and the nested-table renderer live on this entry.
 * Both {@link rowDetail} and {@link nestedTable} fill {@link EXPANSION_LIVE}.
 */
import { useMemo, type ReactNode } from "react";

import { useRowExpansion } from "../rows/useRowExpansion";
import { nestedTableDetail, type NestedTableFor } from "../tree/nestedTable";
import { slotRender } from "./providers";
import { EXPANSION_LIVE, type ChromeExtraSlotProps } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

function LiveExpansion({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const expansionState = useRowExpansion(props.defaultExpandedRowIds);
  const { nestedTable, density, labels: hostLabels } = props;
  const hostRenderRowDetail = props.renderRowDetail;
  const renderRowDetail = useMemo(
    () =>
      nestedTableDetail({
        nestedTable,
        renderRowDetail: hostRenderRowDetail,
        parent: { density, labels: hostLabels },
      }),
    [nestedTable, hostRenderRowDetail, density, hostLabels]
  );
  const detail = useMemo(
    () =>
      renderRowDetail
        ? { render: renderRowDetail, expansion: expansionState }
        : undefined,
    [renderRowDetail, expansionState]
  );
  return children({ ...chrome, detail });
}

const expansionRender = slotRender(EXPANSION_LIVE, (props) => (
  <LiveExpansion {...props} />
));

/**
 * Render a panel under an expanded row.
 *
 * @public
 */
export function rowDetail<TRow>(
  renderRowDetail: (row: TRow) => unknown,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return {
    id: "row-detail",
    apply: () => ({ renderRowDetail, defaultExpandedRowIds }),
    renders: [expansionRender],
  };
}

/**
 * Render a whole table inside a row's detail panel.
 *
 * @public
 */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>
): TableFeature<TRow> {
  return {
    id: "nested-table",
    apply: () => ({ nestedTable: nested }),
    renders: [expansionRender],
  };
}
