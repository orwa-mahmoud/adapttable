import { describe, expect, it, vi } from "vitest";

import type {
  AssistantTransport,
  AssistantTransportReply,
} from "./assistantContracts";
import { createTableAssistant } from "./assistantStore";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: [],
    columns: [],
    source: PAGE_ONLY,
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: false,
    hasSort: false,
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
  };
}

function tableSession(patch: Partial<AgentObservation> = {}): AgentSession {
  return createAgentSession({
    observe: () => observation(patch),
    apply: { setPage: vi.fn() },
  });
}

/** A transport whose reply the test settles by hand. */
function deferredTransport() {
  let settle: ((reply: AssistantTransportReply) => void) | undefined;
  let fail: ((cause: unknown) => void) | undefined;
  const transport: AssistantTransport = {
    send: () =>
      new Promise<AssistantTransportReply>((resolve, reject) => {
        settle = resolve;
        fail = reject;
      }),
  };
  return {
    transport,
    reply: (text: string) => settle?.({ text }),
    throw: (cause: unknown) => fail?.(cause),
  };
}

function replying(text = "ok"): AssistantTransport {
  return { send: () => Promise.resolve({ text }) };
}

describe("the assistant store", () => {
  it("is inert until it is connected", () => {
    const connect = vi.fn();
    const store = createTableAssistant({
      session: tableSession(),
      transport: { connect, send: () => Promise.resolve({ text: "" }) },
    });

    // Constructing must not open a connection: a render can be thrown away.
    expect(connect).not.toHaveBeenCalled();
    expect(store.getState().status).toBe("idle");
    store.connect();
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("hands back the same snapshot until something moves", () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
    });

    const first = store.getState();
    expect(store.getState()).toBe(first);
    store.setDraft("hello");
    expect(store.getState()).not.toBe(first);
    expect(store.getState().draft).toBe("hello");
  });

  it("does not notify when an update changes nothing", () => {
    const session = tableSession();
    const transport = replying();
    const store = createTableAssistant({ session, transport });
    const listener = vi.fn();
    store.subscribe(listener);

    // A binding handing over its live inputs on every render must be free.
    store.update({ session, transport });
    store.update({ session, transport });
    expect(listener).not.toHaveBeenCalled();
  });

  it("records the turn and the reply in order", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying("Moved to page 2."),
    });
    store.connect();
    await store.send("Page 2");

    const state = store.getState();
    expect(state.messages.map((entry) => entry.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(state.messages[1]?.text).toBe("Moved to page 2.");
    expect(state.status).toBe("ready");
    expect(state.busy).toBe(false);
  });

  it("refuses a second send while one is in flight", async () => {
    const deferred = deferredTransport();
    const send = vi.spyOn(deferred.transport, "send");
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();

    const first = store.send("one");
    const second = store.send("two");
    expect(send).toHaveBeenCalledTimes(1);
    // A turn is running, which is the whole of "not now".
    expect(store.getState().busy).toBe(true);
    deferred.reply("done");
    await Promise.all([first, second]);
  });

  it("clears the draft on send and puts it back when the turn fails", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    store.setDraft("find everything");

    const turn = store.send();
    expect(store.getState().draft).toBe("");
    deferred.throw(new Error("backend is down"));
    await turn;

    // Retyping is worse than the outage.
    expect(store.getState().draft).toBe("find everything");
    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("backend is down");
  });

  it("keeps what the reader typed instead of the failed draft", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    store.setDraft("first");
    const turn = store.send();
    store.setDraft("second");
    deferred.throw(new Error("nope"));
    await turn;

    expect(store.getState().draft).toBe("second");
  });

  it("releases the composer on stop even when a transport ignores its signal", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");

    store.stop();
    expect(store.getState().busy).toBe(false);
    expect(store.getState().status).toBe("ready");

    // The transport answers anyway. The reply belongs to a turn that is over.
    deferred.reply("late");
    await turn;
    expect(store.getState().messages).toHaveLength(1);
  });

  it("does not report a stop as a failure", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");
    store.stop();
    deferred.throw(new Error("aborted"));
    await turn;

    expect(store.getState().error).toBeUndefined();
  });

  it("drops a reply that belongs to a table the reader has left", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");

    store.update({ session: tableSession(), transport: deferred.transport });
    deferred.reply("for the old table");
    await turn;

    // A new session is a new conversation.
    expect(store.getState().messages).toEqual([]);
  });

  it("leaves the transcript alone for an ordinary input change", async () => {
    const session = tableSession();
    const transport = replying();
    const store = createTableAssistant({ session, transport });
    store.connect();
    await store.send("one");

    store.update({ session, transport, awaitingApproval: true });
    expect(store.getState().messages).toHaveLength(2);
  });

  it("reconnects when the transport key changes", () => {
    const session = tableSession();
    const first = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: replying().send,
    };
    const second = { connect: vi.fn(), send: replying().send };
    const store = createTableAssistant({
      session,
      transport: first,
      transportKey: "a",
    });
    store.connect();
    expect(first.connect).toHaveBeenCalledTimes(1);

    store.update({ session, transport: second, transportKey: "b" });
    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(second.connect).toHaveBeenCalledTimes(1);
  });

  it("cancels an active turn before clearing", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const turn = store.send("one");

    store.clear();
    expect(store.getState().messages).toEqual([]);
    expect(store.getState().busy).toBe(false);
    deferred.reply("late");
    await turn;
    expect(store.getState().messages).toEqual([]);
  });

  it("reads the catalog when a suggestion is clicked, not when it was drawn", async () => {
    let hasPagination = true;
    const session = createAgentSession({
      observe: () => observation({ hasPagination }),
      apply: { setPage: vi.fn() },
    });
    const send = vi.fn(() => Promise.resolve({ text: "ok" }));
    const store = createTableAssistant({
      session,
      transport: { send },
      suggestions: [
        {
          id: "page",
          title: "Next page",
          prompt: "Go to page 2",
          requires: ["view.setPage"],
        },
      ],
    });
    store.connect();
    expect(store.getState().suggestions).toHaveLength(1);

    // The capability goes away between the chip being drawn and clicked.
    hasPagination = false;
    await store.runSuggestion("page");
    expect(send).not.toHaveBeenCalled();
  });

  it("offers every suggestion the table can run", () => {
    // One list. The head/tail split served a wall of cards with a "more"
    // control; the shortcuts menu shows what a table can actually run.
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
      suggestions: [
        { id: "a", title: "A", prompt: "a" },
        { id: "b", title: "B", prompt: "b" },
      ],
    });

    expect(store.getState().suggestions.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("shows text as it streams, then replaces it with the reply", async () => {
    let emit: ((text: string) => void) | undefined;
    let settle: (() => void) | undefined;
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: ({ onPartialText }) => {
          emit = onPartialText;
          return new Promise((resolve) => {
            settle = () => {
              resolve({ text: "Showing page 2." });
            };
          });
        },
      },
    });
    store.connect();
    const turn = store.send("Page 2");

    emit?.("Showing ");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const during = store.getState().messages.at(-1);
    // One field carries the words, marked as still arriving.
    expect(during?.text).toBe("Showing ");
    expect(during?.streaming).toBe(true);

    settle?.();
    await turn;
    const after = store.getState().messages;
    // One assistant message, and it is the reply — not the draft beside it.
    expect(after).toHaveLength(2);
    expect(after[1]?.text).toBe("Showing page 2.");
    expect(after[1]?.streaming).toBeUndefined();
  });

  it("drops the partial message when the turn is stopped", async () => {
    let emit: ((text: string) => void) | undefined;
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: ({ onPartialText }) => {
          emit = onPartialText;
          return new Promise<AssistantTransportReply>(() => undefined);
        },
      },
    });
    store.connect();
    void store.send("Page 2");

    emit?.("Half a sen");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().messages.at(-1)?.text).toBe("Half a sen");

    store.stop();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // What was abandoned leaves nothing behind: only the reader's own message.
    expect(store.getState().messages.map((entry) => entry.role)).toEqual([
      "user",
    ]);
  });

  it("does not repaint once per delta", async () => {
    let emit: ((text: string) => void) | undefined;
    let settle: (() => void) | undefined;
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: ({ onPartialText }) => {
          emit = onPartialText;
          return new Promise((resolve) => {
            settle = () => {
              resolve({ text: "done" });
            };
          });
        },
      },
    });
    store.connect();
    const turn = store.send("Page 2");
    const listener = vi.fn();
    store.subscribe(listener);

    for (let token = 0; token < 40; token += 1) emit?.(`x${String(token)}`);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Forty tokens, one repaint — a reader cannot read faster than a frame.
    expect(listener.mock.calls.length).toBeLessThan(5);
    settle?.();
    await turn;
  });

  it("says nothing more after dispose", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    const listener = vi.fn();
    store.subscribe(listener);
    const turn = store.send("one");

    store.dispose();
    listener.mockClear();
    deferred.reply("late");
    await turn;

    expect(listener).not.toHaveBeenCalled();
    // Idempotent: a second dispose is not an error.
    expect(() => {
      store.dispose();
    }).not.toThrow();
  });

  it("cannot be made to send after dispose", async () => {
    const send = vi.fn(() => Promise.resolve({ text: "ok" }));
    const store = createTableAssistant({
      session: tableSession(),
      transport: { send },
    });
    store.connect();
    store.dispose();
    await store.send("one");

    expect(send).not.toHaveBeenCalled();
  });

  it("reports a missing transport rather than pretending to connect", async () => {
    const store = createTableAssistant({ session: tableSession() });
    store.connect();
    expect(store.getState().status).toBe("disconnected");

    await store.send("one");
    expect(store.getState().error).toBe("no transport is connected");
  });

  it("surfaces why a turn stopped short beside what it did", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: () =>
          Promise.resolve({
            text: "Working on it.",
            unresolved: {
              code: "discovery-exhausted",
              message: "the backend never settled on a plan",
              pending: ["view.setPage"],
            },
          }),
      },
    });
    store.connect();
    await store.send("one");

    expect(store.getState().error).toBe("the backend never settled on a plan");
    expect(store.getState().messages).toHaveLength(2);
  });
});

/** A table whose page really moves, so an undo has something to put back. */
function movingTable(): {
  readonly session: AgentSession;
  readonly setPage: ReturnType<typeof vi.fn>;
  page: () => number;
  revision: () => number;
} {
  let page = 1;
  let revision = 1;
  const setPage = vi.fn((next: number) => {
    page = next;
    revision += 1;
  });
  const session = createAgentSession({
    observe: () => observation({ page, viewRevision: revision }),
    apply: { setPage },
  });
  return { session, setPage, page: () => page, revision: () => revision };
}

describe("putting one action of a turn back", () => {
  /** A table whose page and search both move, and report where they landed. */
  function twoWayTable(): {
    readonly session: AgentSession;
    page: () => number;
    search: () => string;
    revision: () => number;
  } {
    let page = 1;
    let search = "";
    let revision = 1;
    const session = createAgentSession({
      observe: () =>
        observation({ page, search, viewRevision: revision, hasSearch: true }),
      apply: {
        setPage: (next: number) => {
          page = next;
          revision += 1;
        },
        setSearch: (next: string) => {
          search = next;
          revision += 1;
        },
      },
    });
    return {
      session,
      page: () => page,
      search: () => search,
      revision: () => revision,
    };
  }

  /** One turn that pages AND searches, so the two can be separated. */
  function twoActionTransport(): AssistantTransport {
    return {
      send: async ({ session }) => {
        const first = await session.execute(
          "view.setPage",
          { page: 4 },
          session.manifest().viewRevision,
          "two-1"
        );
        const second = await session.execute(
          "view.setSearch",
          { query: "ada" },
          session.manifest().viewRevision,
          "two-2"
        );
        return {
          text: "moved",
          results: [first, second],
          keys: ["view.setPage", "view.setSearch"],
        };
      },
    };
  }

  function storeFor(table: ReturnType<typeof twoWayTable>) {
    const store = createTableAssistant({
      session: table.session,
      transport: twoActionTransport(),
      contextInputs: () => ({
        view: { page: table.page(), limit: 10, search: table.search() },
      }),
    });
    store.connect();
    return store;
  }

  it("puts back the action it was given and leaves the other standing", async () => {
    const table = twoWayTable();
    const store = storeFor(table);

    await store.send("page and search");
    expect(table.page()).toBe(4);
    expect(table.search()).toBe("ada");

    await store.undoAction("two-2");

    // The search is back; the page the other action moved is untouched.
    expect(table.search()).toBe("");
    expect(table.page()).toBe(4);
  });

  it("marks every action that moved something, however many there were", async () => {
    const table = twoWayTable();
    const store = storeFor(table);
    await store.send("page and search");
    const receipts = store.getState().messages.at(-1)?.receipts ?? [];
    expect(receipts.map((receipt) => receipt.undoable)).toEqual([true, true]);

    const single = movingTable();
    const one = createTableAssistant({
      session: single.session,
      transport: {
        send: async ({ session }) => {
          const result = await session.execute(
            "view.setPage",
            { page: 4 },
            session.manifest().viewRevision,
            "one-1"
          );
          return { text: "moved", results: [result], keys: ["view.setPage"] };
        },
      },
      contextInputs: () => ({ view: { page: single.page(), limit: 10 } }),
    });
    one.connect();
    await one.send("page");
    // One action gets its own control too: the alternative is a loose button
    // above the cards saying nothing about which card it answers for.
    expect(
      (one.getState().messages.at(-1)?.receipts ?? []).map(
        (receipt) => receipt.undoable
      )
    ).toEqual([true]);
  });

  it("retires the whole-turn offer once part of the turn is back", async () => {
    const table = twoWayTable();
    const store = storeFor(table);
    await store.send("page and search");
    expect(store.getState().undo?.available).toBe(true);

    await store.undoAction("two-1");

    // "Put the turn back" no longer describes anything that happened.
    expect(store.getState().undo).toBeNull();
    expect(table.page()).toBe(1);
  });

  it("stops offering the action it has just put back", async () => {
    // A control that is drawn and does nothing is the defect this whole
    // offer exists to avoid.
    const table = twoWayTable();
    const store = storeFor(table);
    await store.send("page and search");

    await store.undoAction("two-2");

    const receipts = store.getState().messages.at(-1)?.receipts ?? [];
    expect(
      receipts.map((receipt) => [receipt.idempotencyKey, receipt.undoable])
    ).toEqual([
      ["two-1", true],
      ["two-2", false],
    ]);

    // And pressing it again changes nothing.
    await store.undoAction("two-2");
    expect(table.page()).toBe(4);
  });

  it("hands back the same transcript while the offers stand", async () => {
    // A subscriber compares the transcript by identity. Deriving a fresh one
    // on every read is not a re-render, it is a render loop — and this store
    // is handed its inputs on every render, which is what makes that fatal.
    const table = twoWayTable();
    const store = storeFor(table);
    await store.send("page and search");

    const first = store.getState().messages;
    expect(store.getState().messages).toBe(first);
    expect(store.getState()).toBe(store.getState());

    await store.undoAction("two-2");
    expect(store.getState().messages).not.toBe(first);
    expect(store.getState().messages).toBe(store.getState().messages);
  });

  it("leaves the other action's offer usable after the first is put back", async () => {
    // Putting one action back moves the revision. The action beside it writes
    // a different field, so its offer still stands — and must still RUN, not
    // just still be drawn.
    const table = twoWayTable();
    const store = storeFor(table);
    await store.send("page and search");

    await store.undoAction("two-2");
    expect(table.search()).toBe("");

    await store.undoAction("two-1");
    expect(table.page()).toBe(1);
    expect(store.getState().error).toBeUndefined();
  });

  it("does nothing for an action it has no plan for", async () => {
    const table = twoWayTable();
    const store = storeFor(table);
    await store.send("page and search");

    await store.undoAction("not-a-key");

    expect(table.page()).toBe(4);
    expect(table.search()).toBe("ada");
  });
});

describe("the capabilities the reader stopped being asked about", () => {
  it("names them from the catalog, in the table's own words", () => {
    // The list the host keeps is capability keys. A reader revoking one is
    // shown what it does, because "view.setPage" is the wire's word for it,
    // not theirs.
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
      alwaysAllowed: ["view.setPage"],
    });
    store.connect();

    const [allowance] = store.getState().alwaysAllowed;
    expect(allowance?.capability).toBe("view.setPage");
    expect(allowance?.name).toBeTruthy();
  });

  it("hands back the same list while the keys are the same", () => {
    // A fresh object every read makes every snapshot look new, and a
    // subscriber comparing identities re-renders forever.
    const session = tableSession();
    const transport = replying();
    const store = createTableAssistant({
      session,
      transport,
      alwaysAllowed: ["view.setPage"],
    });
    store.connect();

    const first = store.getState().alwaysAllowed;
    // The host re-renders and hands over a fresh array of the same keys.
    store.update({ session, transport, alwaysAllowed: ["view.setPage"] });
    expect(store.getState().alwaysAllowed).toBe(first);
  });

  it("says nothing for a key the catalog does not carry", () => {
    // A capability the host allowed and then unmounted. The key is not a
    // name, so the entry is left out rather than printed raw.
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
      alwaysAllowed: ["host.gone"],
    });
    store.connect();

    // The entry stands — the reader agreed to it — with no name to show.
    expect(store.getState().alwaysAllowed).toEqual([
      { capability: "host.gone" },
    ]);
  });
});

describe("a question put to the reader", () => {
  it("waits, then hands the answer back to the turn", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: async ({ askUser }) => {
          const given = await askUser?.({
            id: "q1",
            question: "Which quarter?",
            options: [{ id: "q4", label: "Q4" }],
            allowFreeText: false,
          });
          return { text: `you said ${given?.optionId ?? "nothing"}` };
        },
      },
    });
    store.connect();

    const turn = store.send("summarise");
    await Promise.resolve();
    expect(store.getState().status).toBe("awaiting-user");
    expect(store.getState().pendingQuestion?.question).toBe("Which quarter?");

    store.answer({ optionId: "q4" });
    // Answering is not a new turn: the one that asked resumes.
    expect(store.getState().status).toBe("sending");
    await turn;

    expect(store.getState().messages.at(-1)?.text).toBe("you said q4");
    expect(store.getState().pendingQuestion).toBeNull();
  });

  it("is answered by nobody once its turn has been abandoned", async () => {
    let asked: Promise<unknown> | undefined;
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: ({ askUser }) => {
          asked = askUser?.({
            id: "q1",
            question: "Which?",
            options: [],
            allowFreeText: true,
          });
          return asked!.then(() => ({ text: "done" }));
        },
      },
    });
    store.connect();

    void store.send("first");
    await Promise.resolve();
    store.stop();

    // The reader is looking at something else now. Resolving to `undefined`
    // lets the transport report it unresolved rather than hang on an answer
    // nobody is being asked for.
    await expect(asked).resolves.toBeUndefined();
  });

  it("records what the reader chose, in the words they saw", async () => {
    // A chip that empties the question and leaves nothing behind reads as a
    // click that did nothing — and the conversation the next turn is sent
    // would show the assistant asking into silence.
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: async ({ askUser }) => {
          await askUser?.({
            id: "q1",
            question: "Which quarter?",
            options: [{ id: "d", label: "Q4" }],
            allowFreeText: false,
          });
          return { text: "done" };
        },
      },
    });
    store.connect();

    const turn = store.send("summarise");
    await Promise.resolve();
    store.answer({ optionId: "d" });
    await turn;

    const said = store.getState().messages.map((entry) => entry.text);
    // The question is in the conversation because the assistant said it, and
    // the answer follows it — "Q4", never "d", because the id is a
    // correlation handle and says nothing to whoever chose it.
    expect(said).toEqual(["summarise", "Which quarter?", "Q4", "done"]);
  });

  it("records a typed answer as what was typed", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: async ({ askUser }) => {
          await askUser?.({
            id: "q1",
            question: "Which quarter?",
            allowFreeText: true,
          });
          return { text: "done" };
        },
      },
    });
    store.connect();

    const turn = store.send("summarise");
    await Promise.resolve();
    store.answer({ text: "  the last one  " });
    await turn;

    expect(store.getState().messages.map((entry) => entry.text)).toEqual([
      "summarise",
      "Which quarter?",
      "the last one",
      "done",
    ]);
  });

  it("says nothing rather than an id it cannot put into words", async () => {
    // An option id that matches nothing is a correlation handle with no
    // label behind it. The turn still resumes — the backend gets the id —
    // but a transcript line reading "z" would say less than no line at all.
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: async ({ askUser }) => {
          await askUser?.({
            id: "q1",
            question: "Which?",
            options: [{ id: "d", label: "Q4" }],
            allowFreeText: false,
          });
          return { text: "done" };
        },
      },
    });
    store.connect();

    const turn = store.send("summarise");
    await Promise.resolve();
    store.answer({ optionId: "z" });
    await turn;

    // The question stays — the assistant said it — and nothing stands in for
    // an answer that could not be put into words.
    expect(store.getState().messages.map((entry) => entry.text)).toEqual([
      "summarise",
      "Which?",
      "done",
    ]);
  });

  it("adds nothing for an answer that says nothing", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: async ({ askUser }) => {
          await askUser?.({
            id: "q1",
            question: "Which?",
            allowFreeText: true,
          });
          return { text: "done" };
        },
      },
    });
    store.connect();

    const turn = store.send("summarise");
    await Promise.resolve();
    store.answer({ text: "   " });
    await turn;

    expect(store.getState().messages.map((entry) => entry.text)).toEqual([
      "summarise",
      "Which?",
      "done",
    ]);
  });

  it("ignores an answer nobody asked for", () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
    });
    store.connect();

    const before = store.getState();
    store.answer({ optionId: "q4" });
    expect(store.getState()).toBe(before);
  });
});

describe("putting a turn back", () => {
  /** A transport that moves the page and reports the revision it landed on. */
  function movingTransport(): AssistantTransport {
    let turn = 0;
    return {
      send: async ({ session }) => {
        turn += 1;
        const result = await session.execute(
          "view.setPage",
          { page: 4 },
          session.manifest().viewRevision,
          `test-turn-${String(turn)}`
        );
        return { text: "moved", results: [result], keys: ["view.setPage"] };
      },
    };
  }

  it("restores the view the turn started from", async () => {
    const table = movingTable();
    const store = createTableAssistant({
      session: table.session,
      transport: movingTransport(),
      // The host says where the view is; without that there is nothing for an
      // undo to compare against.
      contextInputs: () => ({ view: { page: table.page(), limit: 10 } }),
    });
    store.connect();

    await store.send("go to page 4");
    expect(table.page()).toBe(4);
    expect(store.getState().undo?.available).toBe(true);

    await store.undoTurn();
    expect(table.page()).toBe(1);
    // The offer is spent: the table it described no longer exists.
    expect(store.getState().undo).toBeNull();
  });

  it("declines once the reader has moved the table themselves", async () => {
    const table = movingTable();
    const store = createTableAssistant({
      session: table.session,
      transport: movingTransport(),
      contextInputs: () => ({ view: { page: table.page(), limit: 10 } }),
    });
    store.connect();
    await store.send("go to page 4");

    // Somebody else's hand on the table. The store is not told — a reader
    // clicking the table's own control notifies nothing in here.
    await table.session.execute(
      "view.setPage",
      { page: 7 },
      table.session.manifest().viewRevision,
      "reader-moved-it"
    );

    // Acting is refused whatever the chip currently says, because the offer
    // is re-checked at the moment it is taken, not when it was drawn.
    await store.undoTurn();
    expect(table.page()).toBe(7);

    // And on the next re-read the chip agrees: the table this plan described
    // is gone.
    store.setDraft("anything");
    expect(store.getState().undo?.available).toBe(false);
    expect(store.getState().undo?.blocked?.code).toBe("table-moved");
  });

  it("does nothing when there is no offer standing", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
    });
    store.connect();

    await store.undoTurn();
    expect(store.getState().error).toBeUndefined();
  });
});

describe("what the reader stopped being asked about", () => {
  it("tells the host to forget one, and republishes", () => {
    const onRevokeAlwaysAllow = vi.fn();
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
      onRevokeAlwaysAllow,
    });
    store.connect();
    const before = store.getState();

    store.revokeAlwaysAllow("edit.cells");

    expect(onRevokeAlwaysAllow).toHaveBeenCalledWith("edit.cells");
    // The list itself lives with whoever owns the memory. The store asks for a
    // re-read, and holds its snapshot when that re-read says the same thing —
    // so a host that has not actually revoked anything causes no churn.
    expect(store.getState()).toBe(before);
  });
});

describe("streamed text", () => {
  it("coalesces deltas rather than publishing one per token", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: ({ onPartialText }) => {
          onPartialText?.("a");
          onPartialText?.("ab");
          onPartialText?.("abc");
          return Promise.resolve({ text: "abc" });
        },
      },
    });
    store.connect();
    const seen = vi.fn();
    store.subscribe(seen);

    await store.send("count");

    // The reply is the authority for what happened, so the provisional text
    // is replaced rather than appended to.
    expect(store.getState().messages.at(-1)?.text).toBe("abc");
    expect(
      store.getState().messages.filter((m) => m.role === "assistant")
    ).toHaveLength(1);
  });
});

describe("a store nobody is using any more", () => {
  it("ignores every instruction once disposed", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
    });
    store.connect();
    store.dispose();

    // Each of these is a surface that has gone calling into a store that has
    // gone. None of them may throw, and none may publish.
    const seen = vi.fn();
    store.subscribe(seen);
    store.setDraft("x");
    store.clear();
    store.stop();
    store.answer({ optionId: "q" });
    store.revokeAlwaysAllow("edit.cells");
    store.update({ session: tableSession(), transport: replying() });
    await store.undoTurn();
    await store.send("hello");
    await store.runSuggestion("s1");

    expect(seen).not.toHaveBeenCalled();
  });
});

describe("clearing the transcript", () => {
  it("ends a turn in flight rather than leaving a reply nowhere to land", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();

    const turn = store.send("summarise");
    await Promise.resolve();
    store.clear();

    expect(store.getState().messages).toEqual([]);
    // A reader who asks for a clear transcript means it: the abandoned reply
    // lands nowhere rather than reappearing in an empty conversation.
    deferred.reply("too late");
    await turn;
    expect(store.getState().messages).toEqual([]);
  });
});

describe("a suggestion the table can no longer serve", () => {
  it("is not sent once its capability has gone", async () => {
    const send = vi.fn(() => Promise.resolve({ text: "ok" }));
    const store = createTableAssistant({
      session: tableSession(),
      transport: { send },
      suggestions: [
        {
          id: "s1",
          title: "Export it",
          prompt: "export",
          requires: ["export"],
        },
      ],
    });
    store.connect();

    await store.runSuggestion("s1");

    // The executor would refuse it anyway. This is so the refusal is not what
    // the reader finds out from.
    expect(send).not.toHaveBeenCalled();
  });

  it("does nothing for an id nobody authored", async () => {
    const send = vi.fn(() => Promise.resolve({ text: "ok" }));
    const store = createTableAssistant({
      session: tableSession(),
      transport: { send },
      suggestions: [],
    });
    store.connect();

    await store.runSuggestion("nonesuch");
    expect(send).not.toHaveBeenCalled();
  });
});

describe("what a re-render may safely hand the store", () => {
  it("holds its snapshot when the inputs say the same thing", () => {
    const session = tableSession();
    const transport = replying();
    const store = createTableAssistant({ session, transport });
    store.connect();

    const before = store.getState();
    // A binding is allowed to call this on every render. Doing so must not
    // move anything a subscriber can see.
    store.update({ session, transport });
    expect(store.getState()).toBe(before);
  });

  it("disconnects the transport it is replacing, not the new one", () => {
    const first = {
      send: () => Promise.resolve({ text: "" }),
      disconnect: vi.fn(),
    };
    const second = {
      send: () => Promise.resolve({ text: "" }),
      disconnect: vi.fn(),
    };
    const session = tableSession();
    const store = createTableAssistant({
      session,
      transport: first,
      transportKey: "a",
    });
    store.connect();

    store.update({ session, transport: second, transportKey: "b" });

    expect(first.disconnect).toHaveBeenCalledTimes(1);
    expect(second.disconnect).not.toHaveBeenCalled();
  });
});

describe("connecting and disconnecting", () => {
  it("reports a handshake the transport refused", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        connect: () => Promise.reject(new Error("that table is not mine")),
        send: () => Promise.resolve({ text: "" }),
      },
    });

    store.connect();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("that table is not mine");
  });

  it("goes quiet when the host disconnects it", () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(),
    });
    store.connect();

    store.disconnect();

    expect(store.getState().status).toBe("disconnected");
  });

  it("streams partial text into the message the reply will replace", async () => {
    let report: ((text: string) => void) | undefined;
    let settle: ((reply: { text: string }) => void) | undefined;
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: ({ onPartialText }) => {
          report = onPartialText;
          return new Promise((resolve) => {
            settle = resolve;
          });
        },
      },
    });
    store.connect();

    const turn = store.send("count");
    await Promise.resolve();
    report?.("one");
    // The coalescing flush runs off a microtask when there is no frame.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const streaming = store.getState().messages.at(-1);
    expect(streaming?.text).toBe("one");
    expect(streaming?.streaming).toBe(true);

    report?.("one two");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().messages.at(-1)?.text).toBe("one two");

    settle?.({ text: "one two three" });
    await turn;
    // The reply is the authority: the provisional message is replaced, not
    // left standing beside it.
    expect(store.getState().messages.at(-1)?.text).toBe("one two three");
    expect(
      store.getState().messages.filter((entry) => entry.role === "assistant")
    ).toHaveLength(1);
  });
});

describe("an undo the table refused", () => {
  it("reports why rather than claiming the view was put back", async () => {
    const table = movingTable();
    let turn = 0;
    const store = createTableAssistant({
      session: table.session,
      contextInputs: () => ({ view: { page: table.page(), limit: 10 } }),
      transport: {
        send: async ({ session }) => {
          turn += 1;
          const result = await session.execute(
            "view.setPage",
            { page: 4 },
            session.manifest().viewRevision,
            `t${String(turn)}`
          );
          return { text: "moved", results: [result], keys: ["view.setPage"] };
        },
      },
    });
    store.connect();
    await store.send("go to page 4");

    // The host's own setter starts failing between the turn and the undo.
    table.setPage.mockImplementationOnce(() => {
      throw new Error("the page is locked");
    });
    await store.undoTurn();

    expect(store.getState().error).toBeDefined();
  });
});

describe("what the badge says while a write waits on a person", () => {
  it("calls a parked turn awaiting approval, not working", () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
      awaitingApproval: true,
    });
    store.connect();

    void store.send("edit them");

    // A reader watching a spinner that will never resolve on its own is why
    // this is separate from `busy`: the turn is parked, not thinking.
    expect(store.getState().status).toBe("awaiting-approval");
    expect(store.getState().busy).toBe(true);
  });

  it("stays awaiting approval when a receipt came back parked", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: () =>
          Promise.resolve({
            text: "one of those needs you",
            results: [
              {
                ok: true,
                revision: 1,
                idempotencyKey: "ed",
                result: {
                  applied: false,
                  approval: "pending" as const,
                },
              },
            ],
            keys: ["edit.cells"],
          }),
      },
    });
    store.connect();

    await store.send("edit them");

    expect(store.getState().status).toBe("awaiting-approval");
  });

  it("reports a turn the backend could not finish", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: () =>
          Promise.resolve({
            text: "I got part way",
            unresolved: {
              code: "question-unanswered",
              message: "nobody answered the question",
              pending: ["view.setPage"],
            },
          }),
      },
    });
    store.connect();

    await store.send("go");

    expect(store.getState().error).toBe("nobody answered the question");
  });
});

describe("a conversation with nothing behind it", () => {
  it("has no view to compare, so offers no undo", async () => {
    const store = createTableAssistant({ transport: replying("ok") });
    store.connect();

    await store.send("go");

    // No session: nothing to read a view from, and nothing to put back.
    expect(store.getState().undo).toBeNull();
  });

  it("redraws its chips when the table's capabilities change underneath", () => {
    let offers = ["view.setPage"];
    const session = createAgentSession({
      observe: () =>
        observation({ hasSearch: offers.includes("view.setSearch") }),
      apply: { setPage: vi.fn(), setSearch: vi.fn() },
    });
    const store = createTableAssistant({
      session,
      transport: replying(),
      suggestions: [
        {
          id: "s1",
          title: "Search it",
          prompt: "search",
          requires: ["view.setSearch"],
        },
      ],
    });
    store.connect();

    expect(store.getState().suggestions).toHaveLength(0);

    // The host turned the feature on in place, without swapping the session.
    offers = ["view.setPage", "view.setSearch"];
    store.setDraft("nudge");

    expect(store.getState().suggestions).toHaveLength(1);
  });
});

describe("a turn the reader stopped", () => {
  it("is not reported as a failure, and puts the draft back", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();
    store.setDraft("summarise this");

    const turn = store.send("summarise this");
    await Promise.resolve();
    store.stop();
    // A transport that honours the signal rejects with the abort.
    deferred.throw(new DOMException("aborted", "AbortError"));
    await turn;

    // Stopping is not a failure to report as one, and nothing was resent.
    expect(store.getState().status).toBe("ready");
    expect(store.getState().error).toBeUndefined();
    expect(store.getState().draft).toBe("summarise this");
  });

  it("reports a transport that failed for its own reasons", async () => {
    const deferred = deferredTransport();
    const store = createTableAssistant({
      session: tableSession(),
      transport: deferred.transport,
    });
    store.connect();

    const turn = store.send("go");
    await Promise.resolve();
    deferred.throw(new Error("the backend is down"));
    await turn;

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("the backend is down");
  });
});

describe("a turn that came back with nothing in it", () => {
  it("reports the empty answer instead of an empty bubble", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: replying(""),
    });
    store.connect();
    store.setDraft("Show only the Core team.");
    await store.send();

    const state = store.getState();
    // The reader's own line stands; nothing is appended that says nothing.
    expect(state.messages.map((entry) => entry.role)).toEqual(["user"]);
    expect(state.status).toBe("error");
    expect(state.error).toMatch(/no text and nothing to apply/);
    // Retry is one keystroke rather than retyping, as after a failure.
    expect(state.draft).toBe("Show only the Core team.");
  });

  it("reports a reply that arrives with no text at all", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      // A host's own transport, across a boundary the type system does not
      // reach. Omitting `text` is the same silence as sending an empty one.
      transport: { send: () => Promise.resolve({} as AssistantTransportReply) },
    });
    store.connect();
    store.setDraft("Page 2");
    await store.send();

    const state = store.getState();
    expect(state.messages.map((entry) => entry.role)).toEqual(["user"]);
    expect(state.status).toBe("error");
    expect(state.error).toMatch(/no text and nothing to apply/);
  });

  it("keeps a wordless turn that applied something", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: () =>
          Promise.resolve({
            text: "",
            keys: ["view.page"],
            results: [{ ok: true, revision: 2, idempotencyKey: "page-2" }],
          }),
      },
    });
    store.connect();
    await store.send("Page 2");

    const state = store.getState();
    expect(state.messages.map((entry) => entry.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(state.messages[1]?.receipts).toHaveLength(1);
    expect(state.status).toBe("ready");
    expect(state.error).toBeUndefined();
  });

  it("keeps a wordless turn that said why it stopped", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: {
        send: () =>
          Promise.resolve({
            text: "",
            unresolved: {
              code: "question-unanswered",
              message: "nobody answered the question",
              pending: ["view.page"],
            },
          }),
      },
    });
    store.connect();
    await store.send("Page 2");

    const state = store.getState();
    expect(state.messages.map((entry) => entry.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(state.error).toBe("nobody answered the question");
  });
});

describe("a question the backend asked", () => {
  /** A transport that parks on its question, as the HTTP client does. */
  function asking() {
    let answered: ((given: unknown) => void) | undefined;
    return {
      transport: {
        send: async ({
          askUser,
        }: {
          askUser?: (q: unknown) => Promise<unknown>;
        }) => {
          const given = await askUser?.({
            id: "q1",
            question: "What should be reversed?",
            options: [{ id: "a", label: "Salary" }],
            allowFreeText: true,
          });
          return {
            text: given ? "Reversed by salary." : "Nothing to reverse.",
          };
        },
      } as never,
      settled: () => answered,
    };
  }

  it("says the conversation is waiting on the reader, not that it is ready", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: asking().transport,
    });
    store.connect();
    const turn = store.send("Reverse that");
    await vi.waitFor(() => {
      expect(store.getState().pendingQuestion).not.toBeNull();
    });

    // The reader is being asked something. A badge reading "ready" beside an
    // unanswered question says nothing is waiting on them when something is.
    expect(store.getState().pendingQuestion?.question).toBe(
      "What should be reversed?"
    );
    expect(store.getState().status).toBe("awaiting-user");

    store.answer({ optionId: "a" });
    await turn;
    expect(store.getState().pendingQuestion).toBeNull();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().messages.at(-1)?.text).toBe("Reversed by salary.");
  });

  it("reports the turn as busy while the question stands", async () => {
    const store = createTableAssistant({
      session: tableSession(),
      transport: asking().transport,
    });
    store.connect();
    const turn = store.send("Reverse that");
    await vi.waitFor(() => {
      expect(store.getState().pendingQuestion).not.toBeNull();
    });

    // Still in flight: the turn resumes on the answer, and a reader may stop
    // it rather than answer.
    expect(store.getState().busy).toBe(true);
    store.answer({ text: "" });
    await turn;
    expect(store.getState().busy).toBe(false);
  });
});
