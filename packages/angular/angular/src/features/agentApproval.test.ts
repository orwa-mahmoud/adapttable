/** The optional approval factory fills exactly its own neutral slot. */
import { AGENT_APPROVAL } from "@adapttable/core/binding";
import { Component } from "@angular/core";
import { describe, expect, it } from "vitest";

import { featureOptionsOf, featureSlotFillsOf } from "../featureHost";
import { createAdapterAgentApprovalFeature } from "./agentApproval";

@Component({ template: "" })
class KitApproval {}

describe("createAdapterAgentApprovalFeature", () => {
  it("registers only the supplied kit approval component and no runtime options", () => {
    const feature = createAdapterAgentApprovalFeature(KitApproval);
    expect(feature.id).toBe("agent-approval");
    expect(featureOptionsOf([feature])).toEqual({});
    const fills = featureSlotFillsOf([feature]);
    expect([...fills.keys()]).toEqual([AGENT_APPROVAL.id]);
    const approval = fills.get(AGENT_APPROVAL.id)!;
    expect(approval).toHaveLength(1);
    expect(approval[0]!.render({} as never)).toBe(KitApproval);
    expect(featureSlotFillsOf([]).size).toBe(0);
  });
});
