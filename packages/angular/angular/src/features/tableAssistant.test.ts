/** A kit can compose the assistant without depending on an AI runtime. */
import { Component } from "@angular/core";
import { describe, expect, it } from "vitest";

import { featureSlotFillsOf } from "../featureHost";
import { createAdapterTableAssistantFeature } from "./tableAssistant";
@Component({ template: "" })
class Assistant {}
describe("createAdapterTableAssistantFeature", () => {
  it("fills only the assistant slot with the kit component", () => {
    const feature = createAdapterTableAssistantFeature(Assistant);
    const fills = featureSlotFillsOf([feature]);
    expect(feature.id).toBe("table-assistant");
    expect(fills.size).toBe(1);
    expect([...fills.values()][0]).toHaveLength(1);
    expect(feature.renders?.[0]?.render({} as never)).toBe(Assistant);
  });
});
