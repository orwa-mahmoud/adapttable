import { createElement } from "react";

import type { AgentApprovalProps } from "../editing/AgentApprovalChrome";
import { extendFeature, slotRender } from "../features/providers";
import { AGENT_APPROVAL } from "../features/slotKeys";
import type { StaticTableFeature } from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

/**
 * Bind one kit's approval strip to the agent-approval slot.
 *
 * @public
 */
export function createAdapterAgentApprovalFeature(
  AgentApproval: AdapterFeatureComponent<AgentApprovalProps>
): StaticTableFeature {
  return extendFeature({ id: "agent-approval" }, [
    slotRender(AGENT_APPROVAL, (props) => createElement(AgentApproval, props)),
  ]);
}
