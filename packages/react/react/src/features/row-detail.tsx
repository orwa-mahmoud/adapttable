/**
 * Row detail / nested table — expansion chrome.
 *
 * The expansion hook and the nested-table renderer live on this entry.
 * Both {@link rowDetail} and {@link nestedTable} fill `EXPANSION_LIVE`.
 */
import { coreNestedTable, coreRowDetail } from "@adapttable/core/binding";
import { type ReactNode, useMemo } from "react";

import { useRowExpansion } from "../rows/useRowExpansion";
import { nestedTableDetail, type NestedTableFor } from "../tree/nestedTable";
import { FeatureStateScope } from "./featureState";
import { slotRender } from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  EXPANSION_LIVE,
} from "./slotKeys";
import { ROW_DETAIL_STATE, type RowDetailState } from "./stateKeys";
import type { TableFeature } from "./tableFeature";

function LiveExpansion<TRow>({
  chrome,
  props,
  children,
}: Readonly<ChromeExtraSlotProps<TRow>>): ReactNode {
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
  return (
    <FeatureStateScope
      stateKey={ROW_DETAIL_STATE}
      value={detail as RowDetailState | undefined}
    >
      {children(chrome)}
    </FeatureStateScope>
  );
}

const expansionRender = slotRender<ChromeExtraDraw>(EXPANSION_LIVE, (props) => (
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
    ...coreRowDetail<TRow>(renderRowDetail, defaultExpandedRowIds),
    renders: [expansionRender],
  };
}

/**
 * Render a whole table inside a row's detail panel.
 *
 * @public
 */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>,
  defaultExpandedRowIds?: readonly string[]
): TableFeature<TRow> {
  return {
    ...coreNestedTable<TRow>(nested, defaultExpandedRowIds),
    renders: [expansionRender],
  };
}
