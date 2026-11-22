/**
 * The bars under the toolbar, each built by the feature that draws it from the
 * finished view and the table's props.
 */
import type { ReactNode } from "react";

import { AGENT_APPROVAL_STATE } from "../editing/AgentApprovalChrome";
import {
  BARS_AREA,
  type KitRegionDraw,
  type KitRegionProps,
} from "../kit/rootRegion";
import { useFeatureState } from "./featureState";
import { FeatureSlot, slotRender } from "./providers";
import {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  BATCH_EDIT_BAR,
  BULK_BAR,
} from "./slotKeys";
import { FILTER_CHIPS_STATE } from "./stateKeys";

/** The removable chips of the active filters. */
function FilterChipsBar<TRow>({ view }: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const { chrome } = view;
  const filterChips = useFeatureState(FILTER_CHIPS_STATE);
  return (
    <FeatureSlot
      slot={ACTIVE_FILTER_CHIPS}
      props={{
        chips: filterChips?.chips ?? [],
        onClearAll: chrome.clearFilters,
        labels: view.labels,
      }}
    />
  );
}

/** The pending batch of edits, while one is open. */
function BatchEditBar<TRow>({ view }: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const editing = view.chrome.editing;
  const batch = editing?.batch;
  if (!batch) return null;
  return (
    <FeatureSlot
      slot={BATCH_EDIT_BAR}
      props={{
        batch,
        contested: editing.conflict?.anyContested,
        labels: view.labels,
      }}
    />
  );
}

/** The agent's proposals waiting for approval. */
function AgentApprovalBar<TRow>({ view }: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const pending = useFeatureState(AGENT_APPROVAL_STATE);
  return (
    <FeatureSlot
      slot={AGENT_APPROVAL}
      props={{ pending, labels: view.labels }}
    />
  );
}

/** The bulk actions over the selected rows. */
function BulkActionsBar<TRow>({
  view,
  props,
}: KitRegionProps<TRow>): ReactNode {
  "use no memo";
  const selection = view.table.selection;
  const bulkActions = props.bulkActions;
  if (!selection || !bulkActions) return null;
  return (
    <FeatureSlot
      slot={BULK_BAR}
      props={{
        selection,
        total: view.source.total,
        bulkActions,
        confirm: view.chrome.confirm,
        labels: view.labels,
      }}
    />
  );
}

/** The chips bar the filters feature brings; it leads the bars. */
export const FILTER_CHIPS_BAR_RENDER = slotRender<KitRegionDraw>(
  BARS_AREA,
  (props) => <FilterChipsBar {...props} />,
  { orderAs: "active-filter-chips" }
);

/** The batch bar batch editing brings. */
export const BATCH_EDIT_BAR_RENDER = slotRender<KitRegionDraw>(
  BARS_AREA,
  (props) => <BatchEditBar {...props} />
);

/** The approval bar the agent-approval feature brings. */
export const AGENT_APPROVAL_BAR_RENDER = slotRender<KitRegionDraw>(
  BARS_AREA,
  (props) => <AgentApprovalBar {...props} />
);

/** The bulk bar bulk actions bring. */
export const BULK_ACTIONS_BAR_RENDER = slotRender<KitRegionDraw>(
  BARS_AREA,
  (props) => <BulkActionsBar {...props} />
);
