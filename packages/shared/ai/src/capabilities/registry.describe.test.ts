/**
 * The registry is the one place that knows what a session can be asked to do,
 * so a key it does not hold has to be refused by name — a guide invented for
 * an unknown capability would be handed straight to a model as fact.
 */
import { describe, expect, it } from "vitest";

import type { AgentCapabilityDefinition, CapabilityPlan } from "../types";
import { createCapabilityRegistry } from "./registry";

const HANDLERS = {
  plan: (): Promise<CapabilityPlan> => Promise.resolve({ proposals: [] }),
  execute: (): Promise<unknown> => Promise.resolve(undefined),
};

function custom(key: string): AgentCapabilityDefinition {
  return {
    key,
    summary: "Archive orders",
    kind: "write",
    guide: {
      guide: "Archive the named orders.",
      input: { type: "object", properties: {} },
      output: { type: "object", properties: {} },
    },
    isEnabled: () => true,
    execute: () => undefined,
  };
}

describe("createCapabilityRegistry", () => {
  it("describes a key it holds", () => {
    const registry = createCapabilityRegistry(
      [custom("orders.archive")],
      HANDLERS
    );
    expect(registry.describe("orders.archive").guide).toBe(
      "Archive the named orders."
    );
    expect(registry.describe("rows.read").key).toBe("rows.read");
  });

  it("refuses to describe a key it does not hold", () => {
    const registry = createCapabilityRegistry([], HANDLERS);
    expect(() => registry.describe("orders.teleport")).toThrow(
      /unknown capability "orders.teleport"/
    );
  });

  it("refuses a custom capability that would shadow a built-in", () => {
    expect(() =>
      createCapabilityRegistry([custom("rows.read")], HANDLERS)
    ).toThrow(/duplicate capability "rows.read"/);
  });
});
