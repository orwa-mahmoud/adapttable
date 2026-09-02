import { createAdapterAgentApprovalFeature } from "@adapttable/core/adapter";

import { AgentApproval } from "./components/kitControls";

/**
 * Bind this kit's approval strip to the agent-approval slot.
 *
 * @public
 */
export function agentApproval() {
  return createAdapterAgentApprovalFeature(AgentApproval);
}
