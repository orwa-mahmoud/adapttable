import { describe, expect, it, vi } from "vitest";

import {
  closeTransaction,
  createApprovalMemory,
  openTransaction,
  type PendingApproval,
  recordDecision,
  settleDecisions,
} from "./approvalTransaction";

function pending(count: number, patch: Partial<PendingApproval> = {}) {
  return {
    proposals: Array.from({ length: count }, (_, index) => ({
      rowKey: `r${String(index)}`,
      column: "name",
    })),
    perItem: true,
    resolve: vi.fn(),
    ...patch,
  };
}

describe("an open approval", () => {
  it("starts with every row undecided", () => {
    const open = openTransaction(1, pending(3), "widget");

    expect(open.decisions).toEqual(["pending", "pending", "pending"]);
    expect(open.presentation).toBe("widget");
  });

  it("records a decision for the transaction it was drawn for", () => {
    const open = openTransaction(1, pending(2), "widget");
    const next = recordDecision(open, 1, 0, true);

    expect(next?.decisions).toEqual(["approved", "pending"]);
  });

  it("ignores a control made for an approval that has moved on", () => {
    const open = openTransaction(2, pending(2), "widget");
    // A button rendered for approval 1, clicked after approval 2 opened.
    expect(recordDecision(open, 1, 0, true)).toBe(open);
  });

  it("ignores a position that is not a row of this plan", () => {
    const open = openTransaction(1, pending(2), "widget");

    expect(recordDecision(open, 1, -1, true)).toBe(open);
    expect(recordDecision(open, 1, 2, true)).toBe(open);
    expect(recordDecision(open, 1, 1.5, true)).toBe(open);
  });

  it("returns the same value when the decision would not change", () => {
    const open = openTransaction(1, pending(1), "widget");
    const once = recordDecision(open, 1, 0, true);
    // A replayed render must not turn one click into two answers.
    expect(recordDecision(once, 1, 0, true)).toBe(once);
  });

  it("closes only the transaction whose approval settled", () => {
    const first = pending(1);
    const second = pending(1);
    const open = openTransaction(2, second, "widget");

    // The previous approval settling must not clear the current one.
    expect(closeTransaction(first)(open)).toBe(open);
    expect(closeTransaction(second)(open)).toBeNull();
  });
});

describe("settling an approval", () => {
  it("approves what nobody answered when the reader approves", () => {
    expect(
      settleDecisions(["rejected", "pending", "approved"], "approved")
    ).toEqual({ approved: [1, 2] });
  });

  it("leaves a row already refused refused", () => {
    expect(
      settleDecisions(["rejected", "pending", "approved"], "rejected")
    ).toEqual({ approved: [2] });
  });

  it("reports a refusal of everything as an empty list", () => {
    expect(settleDecisions(["pending", "pending"], "rejected")).toEqual({
      approved: [],
    });
  });
});

describe("what the reader asked not to be asked again", () => {
  it("answers only for a capability that was remembered", () => {
    const memory = createApprovalMemory();
    memory.remember("view.setFilters", "v1");

    expect(memory.allows("view.setFilters", "v1")).toBe(true);
    expect(memory.allows("edit.cells", "v1")).toBe(false);
  });

  it("forgets everything when the contract version moves", () => {
    const memory = createApprovalMemory();
    memory.remember("view.setFilters", "v1");

    // "Allow this" was said about a table that no longer exists in that shape.
    expect(memory.allows("view.setFilters", "v2")).toBe(false);
    expect(memory.allows("view.setFilters", "v1")).toBe(false);
  });

  it("can be cleared outright", () => {
    const memory = createApprovalMemory();
    memory.remember("view.setFilters", "v1");
    memory.clear();

    expect(memory.allows("view.setFilters", "v1")).toBe(false);
  });
});
