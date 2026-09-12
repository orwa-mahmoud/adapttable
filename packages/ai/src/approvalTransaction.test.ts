import { describe, expect, it, vi } from "vitest";

import { resolveApproval, sharedApproval } from "./approvalConfig";
import {
  closeTransaction,
  createApprovalMemory,
  mayAlwaysAllow,
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

describe('whether "don\'t ask again" may be offered at all', () => {
  const opted = ["edit.cells", "rows.delete", "view.setPage"];

  it("is off until a developer opts the capability in", () => {
    // The whole point of the default: a table that says nothing ships without
    // the control, rather than with one that refuses when pressed.
    expect(
      mayAlwaysAllow({
        capability: "edit.cells",
        kind: "write",
        alwaysAllow: [],
      })
    ).toBe(false);
    expect(
      mayAlwaysAllow({
        capability: "edit.cells",
        kind: "write",
        alwaysAllow: opted,
      })
    ).toBe(true);
  });

  it("never offers it for a destructive capability, opted in or not", () => {
    expect(
      mayAlwaysAllow({
        capability: "rows.delete",
        kind: "destructive",
        alwaysAllow: opted,
      })
    ).toBe(false);
  });

  it("never offers it for a write that enumerates rows", () => {
    // There is no class of operation to remember: the reader decided rows.
    expect(
      mayAlwaysAllow({
        capability: undefined,
        kind: "write",
        alwaysAllow: opted,
      })
    ).toBe(false);
  });

  it("offers it for a capability whose kind nobody declared", () => {
    expect(
      mayAlwaysAllow({
        capability: "view.setPage",
        kind: undefined,
        alwaysAllow: opted,
      })
    ).toBe(true);
  });

  it("is emptied by an action that demands a human every time", () => {
    const shared = sharedApproval({ alwaysAllow: opted });

    expect(shared.alwaysAllow).toEqual(opted);
    expect(
      resolveApproval(shared, { approval: { policy: "required" } }).alwaysAllow
    ).toEqual([]);
    // An action that says nothing about approval keeps the table's opt-in.
    expect(resolveApproval(shared, undefined).alwaysAllow).toEqual(opted);
  });

  it("reads `false` and silence as the same answer", () => {
    expect(sharedApproval({ alwaysAllow: false }).alwaysAllow).toEqual([]);
    expect(sharedApproval({}).alwaysAllow).toEqual([]);
    expect(sharedApproval(undefined).alwaysAllow).toEqual([]);
    expect(sharedApproval("never").alwaysAllow).toEqual([]);
  });
});

describe("taking an allowance back", () => {
  it("lists what is remembered, and asks again once it is revoked", () => {
    const memory = createApprovalMemory();

    memory.remember("edit.cells", "v1");
    memory.remember("view.setPage", "v1");
    expect(memory.remembered("v1")).toEqual(["edit.cells", "view.setPage"]);
    expect(memory.allows("edit.cells", "v1")).toBe(true);

    memory.revoke("edit.cells");

    expect(memory.remembered("v1")).toEqual(["view.setPage"]);
    expect(memory.allows("edit.cells", "v1")).toBe(false);
  });

  it("lists nothing once the contract has moved", () => {
    const memory = createApprovalMemory();
    memory.remember("edit.cells", "v1");

    // "Allow this" was said about a table that no longer exists in that shape.
    expect(memory.remembered("v2")).toEqual([]);
    expect(memory.allows("edit.cells", "v1")).toBe(false);
  });

  it("revoking something nobody remembered changes nothing", () => {
    const memory = createApprovalMemory();
    memory.remember("edit.cells", "v1");

    expect(() => {
      memory.revoke("rows.add");
    }).not.toThrow();
    expect(memory.remembered("v1")).toEqual(["edit.cells"]);
  });
});
