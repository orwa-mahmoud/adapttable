import type { AgentApprovalPending } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import {
  assistantUndoView,
  tableAssistantFields,
  tableAssistantInputs,
} from "./assistantBinding";
import { createTableAssistant } from "./assistantStore";
import type { AgentSession } from "./types";

const pending = { id: "approval" } as unknown as AgentApprovalPending;

describe("tableAssistantInputs", () => {
  it("reads the table's own state when the host passes none", () => {
    const read = vi.fn(() => ({ view: { page: 2 } }));
    const revoke = vi.fn();
    const inputs = tableAssistantInputs(
      {},
      {
        approval: pending,
        progress: { done: 1, capability: "rows.read", idempotencyKey: "k" },
        viewState: { read },
        alwaysAllow: { capabilities: ["edit.cells"], revoke },
      }
    );
    expect(inputs.approval).toBe(pending);
    expect(inputs.awaitingApproval).toBe(true);
    expect(inputs.progress).toEqual({
      done: 1,
      capability: "rows.read",
      idempotencyKey: "k",
    });
    expect(inputs.contextInputs?.()).toEqual({ view: { page: 2 } });
    expect(inputs.alwaysAllowed).toEqual(["edit.cells"]);
    inputs.onRevokeAlwaysAllow?.("edit.cells");
    expect(revoke).toHaveBeenCalledWith("edit.cells");
  });

  it("lets the host's own options win over the table's", () => {
    const contextInputs = () => ({});
    const onDetach = vi.fn();
    const onMessagesChange = vi.fn();
    const session = {} as AgentSession;
    const inputs = tableAssistantInputs(
      {
        session,
        transportKey: "backend",
        approval: null,
        progress: null,
        awaitingApproval: false,
        contextInputs,
        onDetach,
        messages: [],
        onMessagesChange,
        conversation: 0,
        resumeHandle: { text: "again", token: 1 },
        alwaysAllow: { capabilities: [], revoke: vi.fn() },
      },
      { approval: pending, viewState: { read: () => ({}) } }
    );
    expect(inputs).toMatchObject({
      session,
      transportKey: "backend",
      approval: null,
      progress: null,
      awaitingApproval: false,
      contextInputs,
      onDetach,
      messages: [],
      onMessagesChange,
      conversation: 0,
      resumeHandle: { text: "again", token: 1 },
      alwaysAllowed: [],
    });
  });

  it("leaves out what neither side supplied", () => {
    const inputs = tableAssistantInputs({}, {});
    expect(inputs.approval).toBeNull();
    expect(inputs.progress).toBeNull();
    expect(inputs.awaitingApproval).toBe(false);
    for (const key of [
      "contextInputs",
      "onDetach",
      "messages",
      "onMessagesChange",
      "conversation",
      "resumeHandle",
      "alwaysAllowed",
      "onRevokeAlwaysAllow",
    ]) {
      expect(inputs).not.toHaveProperty(key);
    }
  });
});

describe("assistantUndoView", () => {
  it("names a blocked offer by its code, and nothing when there is none", () => {
    expect(assistantUndoView(null)).toBeNull();
    expect(assistantUndoView({ messageId: "m1", available: true })).toEqual({
      messageId: "m1",
      available: true,
    });
    expect(
      assistantUndoView({
        messageId: "m1",
        available: false,
        blocked: { code: "table-moved", settledAt: 3, now: 4 },
      })
    ).toEqual({
      messageId: "m1",
      available: false,
      blockedCode: "table-moved",
    });
  });
});

describe("tableAssistantFields", () => {
  it("pairs the snapshot's fields with the store's own actions", () => {
    const store = createTableAssistant();
    const fields = tableAssistantFields(store.getState(), store);
    expect(fields.status).toBe("idle");
    expect(fields.messages).toEqual([]);
    expect(fields.undo).toBeNull();
    expect(fields.send).toBe(store.send);
    expect(fields.setDraft).toBe(store.setDraft);
    expect(fields.runSuggestion).toBe(store.runSuggestion);
  });
});
