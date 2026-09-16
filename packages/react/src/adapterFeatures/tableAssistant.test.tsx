/**
 * The assistant as a composable feature.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TableAssistantProps } from "../assistant/TableAssistantChrome";
import { FeatureProviders, FeatureSlot } from "../features/providers";
import { TABLE_ASSISTANT } from "../features/slotKeys";
import { applyTableFeatures } from "../features/tableFeature";
import { createAdapterTableAssistantFeature } from "./tableAssistant";

function KitAssistant(props: Readonly<TableAssistantProps>) {
  return <div data-testid="kit-assistant">{String(props.open)}</div>;
}

const assistant: TableAssistantProps["assistant"] = {
  status: "ready",
  messages: [],
  draft: "",
  setDraft: () => undefined,
  send: () => undefined,
  stop: () => undefined,
  suggestions: [],
  runSuggestion: () => undefined,
};

describe("createAdapterTableAssistantFeature", () => {
  it("registers under the shared feature id", () => {
    expect(createAdapterTableAssistantFeature(KitAssistant).id).toBe(
      "table-assistant"
    );
  });

  it("fills the assistant slot with the kit's own component", () => {
    const props = applyTableFeatures({
      features: [createAdapterTableAssistantFeature(KitAssistant)],
    });
    const { getByTestId } = render(
      <FeatureProviders props={props}>
        <FeatureSlot
          slot={TABLE_ASSISTANT}
          props={{ assistant, open: true, onOpenChange: () => undefined }}
        />
      </FeatureProviders>
    );

    expect(getByTestId("kit-assistant")).toHaveTextContent("true");
  });
});
