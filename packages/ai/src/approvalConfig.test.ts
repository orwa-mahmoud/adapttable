/**
 * Two questions, answered separately, inherited separately.
 *
 * The rule these tests exist to protect: an action that overrides one field
 * keeps the shared value of the other. Resetting the untouched field is the
 * bug — it turns "always ask for this one" into "and review it somewhere
 * else too", silently.
 */
import { describe, expect, it } from "vitest";

import { resolveApproval, sharedApproval } from "./approvalConfig";

describe("the shared configuration", () => {
  it("asks for writes, in the conversation, when the table says nothing", () => {
    expect(sharedApproval(undefined)).toEqual({
      policy: "writes",
      presentation: "widget",
    });
  });

  it("reads the policy-only spelling a table already uses", () => {
    expect(sharedApproval("destructive")).toEqual({
      policy: "destructive",
      presentation: "widget",
    });
    expect(sharedApproval("never").policy).toBe("never");
  });

  it("takes each field of the object form, defaulting the other", () => {
    expect(sharedApproval({ presentation: "modal" })).toEqual({
      policy: "writes",
      presentation: "modal",
    });
    expect(sharedApproval({ policy: "never" })).toEqual({
      policy: "never",
      presentation: "widget",
    });
  });
});

describe("what one action may override", () => {
  const shared = sharedApproval({ policy: "never", presentation: "modal" });

  it("changes nothing when the action carries no overrides", () => {
    expect(resolveApproval(shared, undefined)).toEqual(shared);
    expect(resolveApproval(shared, {})).toEqual(shared);
    expect(resolveApproval(shared, { approval: {} })).toEqual(shared);
  });

  it("keeps the shared presentation when only the policy is overridden", () => {
    expect(
      resolveApproval(shared, { approval: { policy: "required" } })
    ).toEqual({ policy: "writes", presentation: "modal" });
  });

  it("keeps the shared policy when only the presentation is overridden", () => {
    expect(
      resolveApproval(shared, { approval: { presentation: "table" } })
    ).toEqual({ policy: "never", presentation: "table" });
  });

  it("takes both when both are given", () => {
    expect(
      resolveApproval(shared, {
        approval: { policy: "automatic", presentation: "widget" },
      })
    ).toEqual({ policy: "never", presentation: "widget" });
  });

  it("can require approval on one action of an otherwise automatic table", () => {
    const automatic = sharedApproval({ policy: "never" });
    expect(
      resolveApproval(automatic, { approval: { policy: "required" } }).policy
    ).toBe("writes");
    // And the table's other actions are untouched by that.
    expect(resolveApproval(automatic, undefined).policy).toBe("never");
  });
});
