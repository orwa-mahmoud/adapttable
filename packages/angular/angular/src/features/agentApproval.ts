/** Compose a kit's optional approval strip without importing an AI runtime. */
import {
  type AdaptTableFeature,
  extendFeature,
  type SlotComponent,
} from "@adapttable/angular";
import { AGENT_APPROVAL, slotRender } from "@adapttable/core/binding";

/**
 * Bind a kit component accepting `AgentApprovalProps` to the approval slot.
 *
 * @param component - The kit's table-owned approval strip.
 * @returns The opt-in feature.
 *
 * @public
 */
export function createAdapterAgentApprovalFeature(
  component: SlotComponent
): AdaptTableFeature {
  return extendFeature({ id: "agent-approval" }, [
    slotRender(AGENT_APPROVAL, () => component),
  ]);
}
