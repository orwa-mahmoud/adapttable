/**
 * The controller's rules, driven the way a panel drives them.
 *
 * Every test here is about a boundary a conversation crosses: a reply that
 * arrives late, a second Send while the first is open, a table that changes
 * underneath, an unmount mid-turn. None of them is visible from the session
 * alone.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useTableAssistant } from "./assistant";
import type {
  AssistantSuggestion,
  AssistantTransport,
  AssistantTransportReply,
} from "./assistantContracts";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession, ExecuteResult } from "./types";

const observation = (
  patch: Partial<AgentObservation> = {}
): AgentObservation => ({
  tableId: "orders",
  viewRevision: 1,
  featureIds: [],
  columns: [
    {
      id: "name",
      label: "Name",
      type: "string",
      readable: true,
      writable: false,
      sortable: true,
    },
  ],
  source: {
    fullDataset: false,
    grouping: false,
    selectAcrossPages: false,
    exportScope: "page",
    totalCount: "loaded",
  },
  writePolicy: "allow",
  hasPagination: true,
  hasSearch: true,
  hasSort: true,
  hasFilters: false,
  hasExport: false,
  hasEdit: false,
  hasReorder: false,
  page: 1,
  limit: 10,
  search: "",
  pageMax: 50,
  rowAddressScope: "visible",
  ...patch,
});

const newSession = (patch: Partial<AgentObservation> = {}): AgentSession =>
  createAgentSession({ observe: () => observation(patch), apply: {} });

/**
 * One session per test, held across renders.
 *
 * A session is stable identity in a real table — it comes from feature state
 * — and the controller treats a NEW one as a new table, so building one
 * inside the render callback would reset the conversation on every render.
 */
function useHeldSession(patch: Partial<AgentObservation> = {}): AgentSession {
  const held = useRef<AgentSession | undefined>(undefined);
  held.current ??= newSession(patch);
  return held.current;
}

/** A transport whose reply the test releases by hand. */
function deferredTransport(): {
  transport: AssistantTransport;
  settle: (reply: AssistantTransportReply) => void;
  fail: (error: Error) => void;
  sends: number;
  aborted: () => boolean;
} {
  let resolve: ((reply: AssistantTransportReply) => void) | undefined;
  let reject: ((error: Error) => void) | undefined;
  let sawAbort = false;
  const state = {
    transport: {
      send: (input) => {
        state.sends += 1;
        input.signal?.addEventListener("abort", () => {
          sawAbort = true;
          reject?.(new Error("aborted"));
        });
        return new Promise<AssistantTransportReply>((res, rej) => {
          resolve = res;
          reject = rej;
        });
      },
    } as AssistantTransport,
    settle: (reply: AssistantTransportReply) => resolve?.(reply),
    fail: (error: Error) => reject?.(error),
    sends: 0,
    aborted: () => sawAbort,
  };
  return state;
}

const okResult = (key: string): ExecuteResult => ({
  ok: true,
  revision: 2,
  idempotencyKey: key,
  result: { ok: true },
});

describe("connection", () => {
  it("is disconnected without a transport", () => {
    const { result } = renderHook(() =>
      useTableAssistant({ session: useHeldSession() })
    );

    expect(result.current.status).toBe("disconnected");
  });

  it("is ready straight away when the transport needs no handshake", () => {
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "" }) },
      })
    );

    expect(result.current.status).toBe("ready");
  });

  it("reports a handshake that fails", async () => {
    const transport: AssistantTransport = {
      connect: () => Promise.reject(new Error("endpoint refused")),
      send: () => Promise.resolve({ text: "" }),
    };
    const { result } = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
    expect(result.current.error).toBe("endpoint refused");
  });

  it("releases the transport on unmount", () => {
    const disconnect = vi.fn();
    const transport: AssistantTransport = {
      connect: () => undefined,
      send: () => Promise.resolve({ text: "" }),
      disconnect,
    };
    const { unmount } = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport })
    );
    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});

describe("sending", () => {
  it("records the turn and its receipts", async () => {
    const transport: AssistantTransport = {
      send: () =>
        Promise.resolve({
          text: "Went to page 2.",
          results: [okResult("a")],
          keys: ["view.setPage"],
        }),
    };
    const { result } = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport })
    );

    await act(async () => {
      await result.current.send("go to page 2");
    });

    expect(result.current.messages.map((m) => [m.role, m.text])).toEqual([
      ["user", "go to page 2"],
      ["assistant", "Went to page 2."],
    ]);
    expect(result.current.messages[1]?.receipts?.[0]).toMatchObject({
      status: "executed",
      capabilityKey: "view.setPage",
    });
    expect(result.current.messages[1]?.outcome).toBe("applied");
    expect(result.current.status).toBe("ready");
  });

  it("keeps message ids unique and stable", async () => {
    const transport: AssistantTransport = {
      send: () => Promise.resolve({ text: "ok" }),
    };
    const { result } = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport })
    );

    await act(async () => {
      await result.current.send("one");
    });
    await act(async () => {
      await result.current.send("two");
    });

    const ids = result.current.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("refuses a second send while one is open", async () => {
    const deferred = deferredTransport();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: deferred.transport,
      })
    );

    act(() => {
      void result.current.send("first");
    });
    act(() => {
      void result.current.send("second");
    });

    // Reserved before the first await, so the second click never opens a
    // turn — two turns interleaving actions against one table is the bug.
    expect(deferred.sends).toBe(1);
    expect(result.current.messages).toHaveLength(1);

    await act(async () => {
      deferred.settle({ text: "done" });
      await Promise.resolve();
    });
    expect(result.current.status).toBe("ready");
  });

  it("sends nothing for an empty or blank draft", async () => {
    const send = vi.fn<AssistantTransport["send"]>(() =>
      Promise.resolve({ text: "" })
    );
    const { result } = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport: { send } })
    );

    await act(async () => {
      await result.current.send("   ");
    });

    expect(send).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it("clears the draft it sent and puts it back when the turn fails", async () => {
    const deferred = deferredTransport();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: deferred.transport,
      })
    );

    act(() => {
      result.current.setDraft("group by city");
    });
    act(() => {
      void result.current.send();
    });
    expect(result.current.draft).toBe("");

    await act(async () => {
      deferred.fail(new Error("backend down"));
      await Promise.resolve();
    });

    // Losing what someone typed because a backend was down is worse than
    // the outage itself.
    expect(result.current.draft).toBe("group by city");
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("backend down");
  });

  it("does not overwrite a draft the reader retyped while waiting", async () => {
    const deferred = deferredTransport();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: deferred.transport,
      })
    );

    act(() => {
      result.current.setDraft("first");
    });
    act(() => {
      void result.current.send();
    });
    act(() => {
      result.current.setDraft("something else");
    });
    await act(async () => {
      deferred.fail(new Error("down"));
      await Promise.resolve();
    });

    expect(result.current.draft).toBe("something else");
  });

  it("reports a partial turn as partial", async () => {
    const transport: AssistantTransport = {
      send: () =>
        Promise.resolve({
          text: "Two of three.",
          results: [
            okResult("a"),
            okResult("b"),
            {
              ok: false,
              revision: 2,
              idempotencyKey: "c",
              error: { code: "revision-mismatch", message: "moved on" },
            },
          ],
        }),
    };
    const { result } = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport })
    );

    await act(async () => {
      await result.current.send("do three things");
    });

    expect(result.current.messages[1]?.outcome).toBe("partial");
    expect(result.current.messages[1]?.receipts?.[2]?.status).toBe("stale");
  });

  it("waits on a human when an action parks for approval", async () => {
    const transport: AssistantTransport = {
      send: () =>
        Promise.resolve({
          text: "Needs your approval.",
          results: [
            {
              ok: true,
              revision: 2,
              idempotencyKey: "a",
              result: { proposals: [], applied: false, approval: "pending" },
            },
          ],
        }),
    };
    const { result } = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport })
    );

    await act(async () => {
      await result.current.send("raise every salary");
    });

    expect(result.current.status).toBe("awaiting-approval");
  });
});

describe("stopping", () => {
  it("aborts the turn and returns to ready without an error", async () => {
    const deferred = deferredTransport();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: deferred.transport,
      })
    );

    act(() => {
      void result.current.send("something slow");
    });
    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });

    expect(deferred.aborted()).toBe(true);
    // Stopping is a choice, not a failure — and nothing is resent, so an
    // action whose outcome is unknown stays unknown.
    expect(result.current.status).toBe("ready");
    expect(result.current.error).toBeUndefined();
    expect(deferred.sends).toBe(1);
  });

  it("is safe with nothing in flight", () => {
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "" }) },
      })
    );

    expect(() => {
      result.current.stop();
    }).not.toThrow();
  });

  it("frees the lane so the next send works", async () => {
    const deferred = deferredTransport();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: deferred.transport,
      })
    );

    act(() => {
      void result.current.send("first");
    });
    await act(async () => {
      result.current.stop();
      await Promise.resolve();
    });
    act(() => {
      void result.current.send("second");
    });

    expect(deferred.sends).toBe(2);
  });
});

describe("late replies", () => {
  it("drops a reply that arrives after the table changed", async () => {
    const deferred = deferredTransport();
    const first = newSession();
    const second = newSession({ tableId: "invoices" });
    const { result, rerender } = renderHook(
      ({ session }: { session: AgentSession }) =>
        useTableAssistant({ session, transport: deferred.transport }),
      { initialProps: { session: first } }
    );

    act(() => {
      void result.current.send("about orders");
    });
    rerender({ session: second });
    await act(async () => {
      deferred.settle({ text: "an answer about orders" });
      await Promise.resolve();
    });

    // The transcript belonged to the previous table; letting the reply land
    // would put an answer about orders under a table of invoices.
    expect(result.current.messages).toEqual([]);
  });

  it("drops a reply that arrives after unmount", async () => {
    const deferred = deferredTransport();
    const { result, unmount } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: deferred.transport,
      })
    );

    act(() => {
      void result.current.send("hello");
    });
    unmount();

    await act(async () => {
      deferred.settle({ text: "too late" });
      await Promise.resolve();
    });
    // No state update after unmount, and nothing left subscribed.
    expect(deferred.aborted()).toBe(false);
  });
});

describe("the transcript", () => {
  it("clears when nothing is in flight", async () => {
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "ok" }) },
      })
    );

    await act(async () => {
      await result.current.send("hello");
    });
    act(() => {
      result.current.clear();
    });

    expect(result.current.messages).toEqual([]);
  });

  it("refuses to clear mid-turn", async () => {
    const deferred = deferredTransport();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: deferred.transport,
      })
    );

    act(() => {
      void result.current.send("hello");
    });
    act(() => {
      result.current.clear();
    });

    // Clearing now would hide an action that is still running.
    expect(result.current.messages).toHaveLength(1);
    await act(async () => {
      deferred.settle({ text: "done" });
      await Promise.resolve();
    });
  });

  it("starts empty for a new table", async () => {
    const first = newSession();
    const { result, rerender } = renderHook(
      ({ session }: { session: AgentSession }) =>
        useTableAssistant({
          session,
          transport: { send: () => Promise.resolve({ text: "ok" }) },
        }),
      { initialProps: { session: first } }
    );

    await act(async () => {
      await result.current.send("hello");
    });
    expect(result.current.messages).toHaveLength(2);

    rerender({ session: newSession({ tableId: "invoices" }) });
    expect(result.current.messages).toEqual([]);
  });
});

describe("suggestions", () => {
  const SUGGESTIONS: AssistantSuggestion[] = [
    {
      id: "s1",
      title: "Page 2",
      prompt: "go to page 2",
      requires: ["view.setPage"],
    },
    {
      id: "s2",
      title: "Group",
      prompt: "group by city",
      requires: ["view.setGroupBy"],
    },
    {
      id: "s3",
      title: "Sort",
      prompt: "sort by name",
      requires: ["view.setSort"],
    },
    {
      id: "s4",
      title: "Search",
      prompt: "find ada",
      requires: ["view.setSearch"],
    },
    { id: "s5", title: "Help", prompt: "what can you do?" },
  ];

  it("offers only what this table can run", () => {
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "" }) },
        suggestions: SUGGESTIONS,
      })
    );

    const offered = [
      ...result.current.suggestions,
      ...result.current.moreSuggestions,
    ].map((s) => s.id);
    // Grouping is not wired on this table, so its chip is not shown.
    expect(offered).toEqual(["s1", "s3", "s4", "s5"]);
  });

  it("keeps the primary list short and puts the rest under more", () => {
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "" }) },
        suggestions: SUGGESTIONS,
        primarySuggestions: 3,
      })
    );

    expect(result.current.suggestions).toHaveLength(3);
    expect(result.current.moreSuggestions.map((s) => s.id)).toEqual(["s5"]);
  });

  it("sends the exact prompt the reader saw", async () => {
    const send = vi.fn<AssistantTransport["send"]>(() =>
      Promise.resolve({ text: "ok" })
    );
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send },
        suggestions: SUGGESTIONS,
      })
    );

    await act(async () => {
      await result.current.runSuggestion("s1");
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].text).toBe("go to page 2");
    expect(result.current.messages[0]?.text).toBe("go to page 2");
  });

  it("runs nothing for a suggestion this table cannot serve", async () => {
    const send = vi.fn<AssistantTransport["send"]>(() =>
      Promise.resolve({ text: "ok" })
    );
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send },
        suggestions: SUGGESTIONS,
      })
    );

    // Eligibility is re-checked at click time, not only when the chip was
    // rendered: a capability can disappear in between.
    await act(async () => {
      await result.current.runSuggestion("s2");
    });

    expect(send).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it("does not leave a suggestion's text in the draft box", async () => {
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "ok" }) },
        suggestions: SUGGESTIONS,
      })
    );

    act(() => {
      result.current.setDraft("half-typed question");
    });
    await act(async () => {
      await result.current.runSuggestion("s1");
    });

    // A chip is not the draft — what the reader was typing survives it.
    expect(result.current.draft).toBe("half-typed question");
  });
});

describe("panel state", () => {
  it("opens and closes on its own when uncontrolled", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "" }) },
        onOpenChange,
      })
    );

    expect(result.current.open).toBe(false);
    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("leaves a controlled panel to its owner", () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "" }) },
        open: false,
        onOpenChange,
      })
    );

    act(() => {
      result.current.setOpen(true);
    });

    // The owner decides; the hook only asks.
    expect(result.current.open).toBe(false);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("keeps the draft and the transcript across a close", async () => {
    const { result } = renderHook(() =>
      useTableAssistant({
        session: useHeldSession(),
        transport: { send: () => Promise.resolve({ text: "ok" }) },
      })
    );

    await act(async () => {
      await result.current.send("hello");
    });
    act(() => {
      result.current.setDraft("half-typed");
      result.current.setOpen(true);
    });
    act(() => {
      result.current.setOpen(false);
    });

    // Closing a panel is not a decision to discard anything.
    expect(result.current.draft).toBe("half-typed");
    expect(result.current.messages).toHaveLength(2);
  });
});

describe("two assistants", () => {
  it("keep separate transcripts", async () => {
    const transport: AssistantTransport = {
      send: ({ text }) => Promise.resolve({ text: `re: ${text}` }),
    };
    const a = renderHook(() =>
      useTableAssistant({ session: useHeldSession(), transport })
    );
    const b = renderHook(() =>
      useTableAssistant({
        session: useHeldSession({ tableId: "invoices" }),
        transport,
      })
    );

    await act(async () => {
      await a.result.current.send("about orders");
    });

    expect(a.result.current.messages).toHaveLength(2);
    expect(b.result.current.messages).toEqual([]);
  });
});
