/**
 * What the chrome owns: structure, keyboard, focus, announcements.
 *
 * Every visible control here is a plain-HTML test slot, so a failure is the
 * chrome's behaviour and never a kit's styling.
 */
import { defaultLabels } from "@adapttable/core";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AgentApprovalPending } from "../editing/AgentApprovalChrome";
import { tableAssistantTestSlots } from "../internal/chromeTestSlots";
import type {
  TableAssistantReceiptView,
  TableAssistantView,
} from "./assistantView";
import type { SpeechInputHandle } from "./speechView";
import { TableAssistantChrome } from "./TableAssistantChrome";

function part(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-adapttable-part="${name}"]`
  );
}

function parts(name: string): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      `[data-adapttable-part="${name}"]`
    ),
  ];
}

function view(patch: Partial<TableAssistantView> = {}): TableAssistantView {
  return {
    status: "ready",
    messages: [],
    draft: "",
    setDraft: () => undefined,
    send: () => undefined,
    stop: () => undefined,
    suggestions: [],
    runSuggestion: () => undefined,
    ...patch,
  };
}

function mount(
  props: Partial<Parameters<typeof TableAssistantChrome>[0]> = {}
): { onOpenChange: ReturnType<typeof vi.fn> } {
  const onOpenChange = vi.fn();
  render(
    <TableAssistantChrome
      slots={tableAssistantTestSlots}
      labels={defaultLabels}
      assistant={view()}
      open
      onOpenChange={onOpenChange}
      // The opening line is the assistant's first message, so it is in every
      // transcript. Silenced by default here, and turned on by the tests that
      // are about it — otherwise every assertion on "the reply" would have to
      // count past it.
      greeting=""
      {...props}
    />
  );
  return { onOpenChange };
}

describe("while a turn is running", () => {
  it("says so where the reply will land, not only in the header", () => {
    // A reader who has just pressed send is looking at the transcript, not
    // at a word in the title bar.
    mount({
      assistant: view({
        status: "sending",
        busy: true,
        messages: [{ id: "m1", role: "user", text: "sort by salary" }],
      }),
    });

    const working = part("assistant-working");
    expect(working).toBeTruthy();
    expect(part("assistant-working-text")).toHaveTextContent("Working");
    // The live region above the composer already announces it; hearing the
    // same thing twice tells a screen reader reader nothing.
    expect(working).toHaveAttribute("aria-hidden", "true");
  });

  it("shows none once the turn has settled", () => {
    mount({
      assistant: view({
        status: "ready",
        messages: [{ id: "m1", role: "assistant", text: "Sorted." }],
      }),
    });

    expect(part("assistant-working")).toBeNull();
  });
});

describe("what a turn did, when the reader asks for it", () => {
  const oneAction = {
    messages: [
      {
        id: "m1",
        role: "assistant" as const,
        text: "Sorted.",
        receipts: [
          {
            capabilityKey: "view.setSort",
            status: "executed",
            idempotencyKey: "k1",
            subject: { kind: "sort", terms: [{ column: "Salary" }] },
          },
        ],
      },
    ],
  };

  it("stays closed until it is opened, and says how many there are", () => {
    // The reply is the answer; what it took to get there is evidence, and
    // evidence is worth having to hand rather than in the way.
    mount({ assistant: view(oneAction) });

    expect(parts("assistant-receipt")).toHaveLength(0);
    const toggle = part("assistant-receipts-toggle-button")!;
    // Closed, the control is a mark under the reply rather than a line of
    // text competing with it — so the count is its accessible name.
    expect(toggle).toHaveAccessibleName("1 action");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(parts("assistant-receipt")).toHaveLength(1);
    expect(part("assistant-receipts-toggle-button")).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    fireEvent.click(part("assistant-receipts-toggle-button")!);
    expect(parts("assistant-receipt")).toHaveLength(0);
  });

  it("counts only what a reader would want shown", () => {
    // A read changed nothing, so it is not one of the actions on offer.
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [
              {
                capabilityKey: "rows.read",
                status: "executed",
                idempotencyKey: "k1",
                subject: { kind: "read" },
              },
              {
                capabilityKey: "view.setSort",
                status: "executed",
                idempotencyKey: "k2",
                subject: { kind: "sort", terms: [{ column: "Salary" }] },
              },
            ],
          },
        ],
      }),
    });

    expect(part("assistant-receipts-toggle-button")).toHaveAccessibleName(
      "1 action"
    );
  });

  it("offers no control at all for a host that keeps its own account", () => {
    mount({ assistant: view(oneAction), receipts: false });

    expect(part("assistant-receipts-toggle-button")).toBeNull();
    expect(parts("assistant-receipt")).toHaveLength(0);
  });
});

describe("what a receipt card offers", () => {
  const twoActions = {
    messages: [
      {
        id: "m1",
        role: "assistant" as const,
        text: "Done.",
        receipts: [
          {
            capabilityKey: "view.setFilters",
            status: "executed",
            idempotencyKey: "k1",
            undoable: true,
            subject: {
              kind: "filter",
              terms: [{ column: "Team", value: "Platform" }],
            },
          },
          {
            capabilityKey: "view.setSort",
            status: "executed",
            idempotencyKey: "k2",
            undoable: true,
            subject: { kind: "sort", terms: [{ column: "Salary" }] },
          },
        ],
      },
    ],
  };

  it("puts back the one action the reader pressed", () => {
    const undoAction = vi.fn();
    mount({ assistant: view({ ...twoActions, undoAction }) });
    showActions();

    const controls = parts("assistant-receipt-undo-button");
    expect(controls).toHaveLength(2);
    fireEvent.click(controls[1]!);
    expect(undoAction).toHaveBeenCalledWith("k2");
  });

  it("puts the control on the one card that moved something", () => {
    // A turn can draw two cards and change only one thing — re-applying a
    // sort already in place moves nothing. A loose button above them says
    // nothing about which card it answers for.
    const undoAction = vi.fn();
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [
              {
                capabilityKey: "view.setSort",
                status: "executed",
                idempotencyKey: "k1",
                subject: { kind: "sort", terms: [{ column: "Salary" }] },
              },
              {
                capabilityKey: "view.setFilters",
                status: "executed",
                idempotencyKey: "k2",
                undoable: true,
                subject: {
                  kind: "filter",
                  terms: [{ column: "Status", value: "Active" }],
                },
              },
            ],
          },
        ],
        undo: { messageId: "m1", available: true },
        undoAction,
      }),
    });
    showActions();

    // One control, on the card it belongs to — and no second one above.
    const controls = parts("assistant-receipt-undo-button");
    expect(controls).toHaveLength(1);
    expect(part("assistant-undo-button")).toBeNull();
    fireEvent.click(controls[0]!);
    expect(undoAction).toHaveBeenCalledWith("k2");
  });

  it("offers both scopes once, headed by the one that undoes everything", () => {
    // Two scopes, two controls, said once each: the heading puts the turn
    // back, a row puts itself back. Without the heading naming the turn, the
    // same word appeared three times with nothing to say which was which.
    const undoTurn = vi.fn();
    const undoAction = vi.fn();
    mount({
      assistant: view({
        ...twoActions,
        undo: { messageId: "m1", available: true },
        undoTurn,
        undoAction,
      }),
    });
    showActions();

    expect(part("assistant-receipts-heading")).toHaveTextContent(
      "What this turn changed"
    );
    const all = part("assistant-receipts-undo-all-button")!;
    expect(all).toHaveAccessibleName("Undo all");
    expect(parts("assistant-receipt-undo-button")).toHaveLength(2);

    fireEvent.click(all);
    expect(undoTurn).toHaveBeenCalledTimes(1);
    expect(undoAction).not.toHaveBeenCalled();
  });

  it("drops Undo all beside a single change", () => {
    // One change needs one decision — the same rule the approval review
    // follows. A second control that does exactly what the first does is a
    // question, not an offer.
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Sorted.",
            receipts: [
              {
                capabilityKey: "view.setSort",
                status: "executed",
                idempotencyKey: "k1",
                undoable: true,
                subject: { kind: "sort", terms: [{ column: "Salary" }] },
              },
            ],
          },
        ],
        undo: { messageId: "m1", available: true },
        undoTurn: vi.fn(),
        undoAction: vi.fn(),
      }),
    });
    showActions();

    expect(part("assistant-receipts-undo-all-button")).toBeNull();
    expect(parts("assistant-receipt-undo-button")).toHaveLength(1);
  });

  it("keeps the turn reversible when no single action is", () => {
    // The turn can be put back and no row can be put back on its own. The
    // heading carries it, reading "Undo" — there is nothing to be "all" of.
    const undoTurn = vi.fn();
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [
              {
                capabilityKey: "view.setSort",
                status: "executed",
                idempotencyKey: "k1",
                subject: { kind: "sort", terms: [{ column: "Salary" }] },
              },
            ],
          },
        ],
        undo: { messageId: "m1", available: true },
        undoTurn,
      }),
    });
    showActions();

    const only = part("assistant-receipts-undo-all-button")!;
    expect(only).toHaveAccessibleName("Undo");
    expect(parts("assistant-receipt-undo-button")).toHaveLength(0);
    fireEvent.click(only);
    expect(undoTurn).toHaveBeenCalledTimes(1);
  });

  it("points its tail at the mark that opened it", () => {
    // The mark rides the bubble's trailing corner, and that corner moves with
    // every reply's length. The tail is measured against it rather than set
    // to a guess, and it stays hidden until it has something to point at.
    mount({ assistant: view(twoActions) });
    showActions();

    const tail = part("assistant-receipts-tail")!;
    expect(tail).toBeTruthy();
    // jsdom measures every box as zero, so the inset resolves rather than
    // staying unset — what this pins is that the measurement ran at all.
    expect(tail.style.visibility).toBe("visible");
    expect(tail.style.insetInlineEnd).toContain("px");
  });

  it("gives every action its own glyph, tiled so the list can be scanned", () => {
    // A row reading "Filter applied · Team is Platform" is a sentence to
    // parse; a funnel beside it is recognised before it is read.
    mount({ assistant: view(twoActions) });
    showActions();

    expect(
      parts("assistant-receipt-icon").map((icon) =>
        icon.getAttribute("data-kind")
      )
    ).toEqual(["filter", "sort"]);
  });

  it("keeps a read's own refusal out of the reader's conversation", () => {
    // The model resolved a row by name, was refused, read the rows and wrote
    // the value. The turn worked; the refusal was advice to the caller, and
    // showing it says the opposite of what happened.
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Priya Nair's salary is now 185.",
            receipts: [
              {
                capabilityKey: "rows.resolve",
                status: "failed",
                idempotencyKey: "k1",
                message: 'no row with key "Priya Nair" in the visible rows',
                subject: { kind: "read" },
              },
              {
                capabilityKey: "edit.cells",
                status: "executed",
                idempotencyKey: "k2",
                subject: {
                  kind: "edit",
                  terms: [{ column: "Salary", value: "185" }],
                },
              },
            ],
          },
        ],
      }),
    });
    showActions();

    const cards = parts("assistant-receipt");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent("Salary set to 185");
    expect(part("assistant-receipt-message")).toBeNull();
  });

  it("draws no cards for a host that keeps its own account", () => {
    mount({ assistant: view(twoActions), receipts: false });

    // Hidden, not lost: the receipts are still in the conversation state for
    // a host reading them.
    expect(parts("assistant-receipt")).toHaveLength(0);
    expect(part("assistant-message")).toBeTruthy();
  });
});

describe("the examples, once a conversation has started", () => {
  const started = {
    messages: [{ id: "m1", role: "assistant" as const, text: "Done." }],
    suggestions: [{ id: "group", title: "Group by city" }],
    moreSuggestions: [{ id: "sort", title: "Sort by salary" }],
  };

  it("moves into the composer, where a reader looks for what to type", () => {
    const runSuggestion = vi.fn();
    mount({ assistant: view({ ...started, runSuggestion }) });

    // In the composer, and no longer a disclosure under a scrolling
    // transcript — which is where it was least reachable.
    const trigger = part("assistant-examples-menu");
    expect(trigger).toBeTruthy();
    expect(part("assistant-composer")!.contains(trigger)).toBe(true);

    // Everything eligible, primary and overflow alike: a menu has the room a
    // split list did not.
    const items = parts("assistant-examples-item");
    expect(items).toHaveLength(2);
    fireEvent.click(items[1]!);
    expect(runSuggestion).toHaveBeenCalledWith("sort");
  });

  it("is there from the first frame, before anything has been asked", () => {
    mount({ assistant: view({ ...started, messages: [] }) });

    expect(part("assistant-examples-menu")).toBeTruthy();
    expect(parts("assistant-suggestion")).toHaveLength(0);
  });
});

/**
 * Open every turn's actions.
 *
 * They are closed until asked for, so a test that reads a receipt card opens
 * it the way a reader would.
 */
function showActions(): void {
  for (const toggle of parts("assistant-receipts-toggle-button")) {
    fireEvent.click(toggle);
  }
}

describe("the launcher", () => {
  it("is the only thing shown while the panel is closed", () => {
    mount({ open: false });

    expect(part("assistant-launcher")).toBeTruthy();
    expect(part("assistant-panel")).toBeNull();
  });

  it("asks to open", () => {
    const { onOpenChange } = mount({ open: false });
    fireEvent.click(part("assistant-launcher")!);

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("gives way to the panel once open", () => {
    mount();

    expect(part("assistant-launcher")).toBeNull();
    expect(part("assistant-panel")).toBeTruthy();
  });

  it("can be left out for a host with its own trigger", () => {
    mount({ open: false, launcher: false });

    expect(part("assistant-launcher")).toBeNull();
  });

  it("takes focus back when the panel closes", () => {
    const { rerender } = render(
      <TableAssistantChrome
        slots={tableAssistantTestSlots}
        labels={defaultLabels}
        assistant={view()}
        open
        onOpenChange={() => undefined}
      />
    );
    rerender(
      <TableAssistantChrome
        slots={tableAssistantTestSlots}
        labels={defaultLabels}
        assistant={view()}
        open={false}
        onOpenChange={() => undefined}
      />
    );

    // Without this the next Tab starts from the top of the page.
    expect(document.activeElement).toBe(part("assistant-launcher"));
  });
});

describe("the header", () => {
  it("names itself and its connection state", () => {
    mount({ assistant: view({ status: "connecting" }) });

    expect(part("assistant-title")).toHaveTextContent("Table assistant");
    expect(part("assistant-connection")).toHaveTextContent("Connecting");
  });

  it("tones the badge by state rather than by colour alone", () => {
    mount({ assistant: view({ status: "error" }) });

    expect(part("assistant-connection")).toHaveAttribute("data-tone", "danger");
    // The word is there too — a tone is not a label.
    expect(part("assistant-connection")).toHaveTextContent("Error");
  });

  it("draws no settings control unless the host supplies one", () => {
    mount();
    expect(part("assistant-settings")).toBeNull();

    const onSettings = vi.fn();
    mount({ onSettings });
    fireEvent.click(part("assistant-settings")!);
    expect(onSettings).toHaveBeenCalled();
  });

  it("closes on the close control", () => {
    const { onOpenChange } = mount();
    fireEvent.click(part("assistant-close")!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Escape", () => {
  it("closes the panel", () => {
    const { onOpenChange } = mount();
    fireEvent.keyDown(part("assistant-surface")!, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("leaves an inner overlay's Escape alone", () => {
    const { onOpenChange } = mount();
    // A kit popover inside the panel answers first and marks the key
    // handled. Closing the whole panel too would dismiss two things with one
    // press, so the key is dispatched from inside and really is prevented on
    // the way out rather than being declared prevented.
    const inner = part("assistant-input")!;
    inner.addEventListener("keydown", (event) => {
      event.preventDefault();
    });
    fireEvent.keyDown(inner, { key: "Escape" });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("still closes when nothing inside handled the key", () => {
    const { onOpenChange } = mount();
    fireEvent.keyDown(part("assistant-input")!, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("the empty state", () => {
  it("asks what to do, and keeps the examples in one place", () => {
    mount({
      greeting: undefined,
      assistant: view({ suggestions: [{ id: "a", title: "Group by city" }] }),
    });

    // The opening line is the assistant's first message, drawn by the same
    // component as every other — not a screen shown instead of one.
    expect(part("assistant-message-text")).toHaveTextContent(
      "What would you like to do?"
    );
    // A kit with a menu has them in the composer from the first frame —
    // cards here and a menu a message later is two places to look.
    expect(parts("assistant-suggestion")).toHaveLength(0);
    expect(part("assistant-examples-menu")).toBeTruthy();
  });

  it("opens with the host's own greeting when it has one", () => {
    // The first thing anyone reads. A table that knows what it is for says
    // so better than a built-in question can.
    mount({
      greeting: "Ask me about this quarter's pipeline.",
      assistant: view({ suggestions: [{ id: "a", title: "Group by city" }] }),
    });

    expect(part("assistant-message-text")).toHaveTextContent(
      "Ask me about this quarter's pipeline."
    );
  });

  it("opens silent when the host asks for silence", () => {
    // An empty greeting is a host saying "say nothing" — not a host that
    // forgot to set one. Nothing stands in for the message nobody wrote.
    mount({ greeting: "", assistant: view() });

    expect(parts("assistant-message-text")).toHaveLength(0);
    expect(parts("assistant-message-mark")).toHaveLength(0);
  });

  it("still says what the host told it to, with no greeting", () => {
    // Silence is about the assistant's own opening line. A note the host
    // wrote is the host talking, and it still gets said.
    mount({
      greeting: "",
      note: "Scripted until you connect.",
      assistant: view(),
    });

    expect(part("assistant-empty-prompt")).toBeNull();
    expect(part("assistant-empty-note")).toHaveTextContent(
      "Scripted until you connect."
    );
  });

  it("gives way to the transcript once there is one", () => {
    mount({
      assistant: view({
        messages: [{ id: "m1", role: "user", text: "hello" }],
        suggestions: [{ id: "a", title: "First" }],
      }),
    });

    expect(part("assistant-empty")).toBeNull();
    expect(part("assistant-messages")).toBeTruthy();
  });
});

describe("the transcript", () => {
  it("names the speaker rather than relying on colour", () => {
    mount({
      assistant: view({
        messages: [
          { id: "m1", role: "user", text: "group by city" },
          { id: "m2", role: "assistant", text: "Grouped." },
        ],
      }),
    });

    const speakers = parts("assistant-message-speaker").map(
      (el) => el.textContent
    );
    expect(speakers).toEqual(["You", "Assistant"]);
    expect(parts("assistant-message")[0]).toHaveAttribute("data-role", "user");
  });

  it("renders backend text as text, never as markup", () => {
    mount({
      assistant: view({
        messages: [
          { id: "m1", role: "assistant", text: "<img src=x onerror=alert(1)>" },
        ],
      }),
    });

    const text = part("assistant-message-text")!;
    expect(text.querySelector("img")).toBeNull();
    expect(text).toHaveTextContent("<img src=x onerror=alert(1)>");
  });

  it("carries the host's offer at the end of the reply it belongs to", () => {
    const onRun = vi.fn();
    mount({
      assistant: view({
        messages: [
          { id: "m1", role: "user", text: "what is the weather" },
          { id: "m2", role: "assistant", text: "I cannot answer that." },
        ],
      }),
      messageAction: (message) =>
        message.text === "I cannot answer that."
          ? { label: "Connect a backend", onRun }
          : undefined,
    });

    const offers = parts("assistant-message-action");
    expect(offers).toHaveLength(1);
    const button = offers[0]!.querySelector("button")!;
    expect(button).toHaveTextContent("Connect a backend");

    fireEvent.click(button);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("leaves messages the host declined to answer for untouched", () => {
    mount({
      assistant: view({
        messages: [{ id: "m1", role: "assistant", text: "Filter applied." }],
      }),
      messageAction: () => undefined,
    });

    expect(parts("assistant-message-action")).toHaveLength(0);
  });

  it("names each action and what became of it", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [
              {
                capabilityKey: "view.setGroupBy",
                status: "executed",
                idempotencyKey: "k1",
                subject: { kind: "group", detail: "Team" },
              },
            ],
          },
        ],
      }),
    });
    showActions();

    // The card names what changed, in the reader's terms.
    expect(part("assistant-receipt-summary")).toHaveTextContent("Grouped");
    expect(part("assistant-receipt-summary")).toHaveTextContent("Team");
    // A technical capability key never reaches the ordinary conversation.
    expect(part("assistant-receipt-summary")).not.toHaveTextContent(
      "view.setGroupBy"
    );
    expect(part("assistant-receipt")).toHaveAttribute(
      "data-status",
      "executed"
    );
  });

  it("phrases a column and a value the reader's language joins", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [
              {
                capabilityKey: "view.setFilters",
                status: "executed",
                idempotencyKey: "k1",
                subject: {
                  kind: "filter",
                  terms: [{ column: "Team", value: "Platform" }],
                },
              },
              {
                capabilityKey: "view.setSort",
                status: "executed",
                idempotencyKey: "k2",
                subject: {
                  kind: "sort",
                  terms: [{ column: "Salary" }],
                  direction: "desc",
                },
              },
            ],
          },
        ],
      }),
    });
    showActions();

    // Two actions, two cards, and neither of them says "done".
    const [filter, sort] = parts("assistant-receipt-summary");
    expect(filter).toHaveTextContent("Filter applied");
    expect(filter).toHaveTextContent("Team is Platform");
    expect(sort).toHaveTextContent("Sorted");
    expect(sort).toHaveTextContent("Salary, descending");
    expect(parts("assistant-receipt")).toHaveLength(2);
  });

  it("says what a cleared filter did, not what an applied one would have", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [
              {
                capabilityKey: "view.setFilters",
                status: "executed",
                idempotencyKey: "k1",
                subject: { kind: "filter", cleared: true },
              },
            ],
          },
        ],
      }),
    });
    showActions();

    expect(part("assistant-receipt-summary")).toHaveTextContent(
      "Filters cleared"
    );
    expect(part("assistant-receipt-detail-text")).toBeNull();
  });

  it("shows a host's own wording ahead of its own", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [
              {
                capabilityKey: "view.setFilters",
                status: "executed",
                idempotencyKey: "k1",
                subject: {
                  kind: "filter",
                  detail: "everyone still with us",
                  terms: [{ column: "Status", value: "Active" }],
                },
              },
            ],
          },
        ],
      }),
    });
    showActions();

    expect(part("assistant-receipt-detail-text")).toHaveTextContent(
      "everyone still with us"
    );
  });

  it("says a staged write still needs saving in the table", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Prepared.",
            receipts: [
              {
                capabilityKey: "edit.cells",
                status: "staged",
                idempotencyKey: "k1",
              },
            ],
          },
        ],
      }),
    });
    showActions();

    // "staged" alone reads as done to anyone who has not read the docs.
    expect(part("assistant-receipt-save")).toHaveTextContent(
      "Save in the table"
    );
  });

  it("keeps a failure's detail behind a control", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "That did not work.",
            receipts: [
              {
                capabilityKey: "view.pinColumn",
                status: "failed",
                message: 'column "secret" is not pinnable',
                idempotencyKey: "k1",
              },
            ],
          },
        ],
      }),
    });
    showActions();

    expect(part("assistant-receipt-message")).toBeNull();
    const detail = part("assistant-receipt-detail")!;
    expect(detail).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(detail);
    expect(part("assistant-receipt-message")).toHaveTextContent("not pinnable");
  });

  it("draws no detail control when there is nothing to expand", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Done.",
            receipts: [{ status: "executed", idempotencyKey: "k1" }],
          },
        ],
      }),
    });

    expect(part("assistant-receipt-detail")).toBeNull();
  });
});

describe("the composer", () => {
  it("sends on Enter", () => {
    const send = vi.fn();
    mount({ assistant: view({ draft: "hello", send }) });
    fireEvent.keyDown(part("assistant-input")!, { key: "Enter" });

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("starts a line on Shift+Enter", () => {
    const send = vi.fn();
    mount({ assistant: view({ draft: "hello", send }) });
    fireEvent.keyDown(part("assistant-input")!, {
      key: "Enter",
      shiftKey: true,
    });

    expect(send).not.toHaveBeenCalled();
  });

  it("leaves Enter to the IME mid-composition", () => {
    const send = vi.fn();
    mount({ assistant: view({ draft: "にほん", send }) });
    // Enter here is choosing a candidate. Sending would post a half-written
    // word — and the reader cannot get it back.
    fireEvent.keyDown(part("assistant-input")!, {
      key: "Enter",
      isComposing: true,
    });

    expect(send).not.toHaveBeenCalled();
  });

  it("sends on the Send control", () => {
    const send = vi.fn();
    mount({ assistant: view({ draft: "hello", send }) });
    fireEvent.click(part("assistant-send")!);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refuses an empty draft without becoming a dead end", () => {
    mount({ assistant: view({ draft: "   " }) });

    expect(part("assistant-send")).toBeDisabled();
    expect(part("assistant-input")).not.toBeDisabled();
  });

  it("becomes Stop while a turn runs", () => {
    const stop = vi.fn();
    mount({ assistant: view({ status: "sending", draft: "hello", stop }) });

    expect(part("assistant-send")).toBeNull();
    fireEvent.click(part("assistant-stop")!);
    expect(stop).toHaveBeenCalled();
  });

  it("keeps Stop while a write waits on a human", () => {
    const stop = vi.fn();
    // `execute` has not returned: the turn is parked on an approval, not
    // finished. Reporting it as ready would strand the reader with a Send
    // button and no way to abandon the write.
    mount({
      assistant: view({
        status: "awaiting-approval",
        busy: true,
        draft: "hello",
        stop,
      }),
    });

    expect(part("assistant-send")).toBeNull();
    fireEvent.click(part("assistant-stop")!);
    expect(stop).toHaveBeenCalled();
  });

  it("shows Send again once an approval has been decided", () => {
    // Same status, but the turn is over — the receipt is in the transcript
    // and there is nothing left to stop.
    mount({
      assistant: view({
        status: "awaiting-approval",
        busy: false,
        draft: "hello",
      }),
    });

    expect(part("assistant-stop")).toBeNull();
    expect(part("assistant-send")).not.toBeNull();
  });

  it("does not send on Enter while a turn runs", () => {
    const send = vi.fn();
    mount({ assistant: view({ status: "sending", draft: "hello", send }) });
    fireEvent.keyDown(part("assistant-input")!, { key: "Enter" });

    expect(send).not.toHaveBeenCalled();
  });

  it("explains a disconnected assistant instead of going silent", () => {
    mount({ assistant: view({ status: "disconnected" }) });

    expect(part("assistant-input")).toBeDisabled();
    expect(part("assistant-unavailable")).toHaveTextContent("not connected");
  });

  it("reports an error where a screen reader will hear it", () => {
    mount({ assistant: view({ status: "error", error: "backend down" }) });

    expect(part("assistant-error")).toHaveTextContent("backend down");
    expect(part("assistant-error")).toHaveAttribute("role", "alert");
  });

  it("announces status, not the whole conversation", () => {
    mount({
      assistant: view({
        status: "sending",
        messages: [{ id: "m1", role: "user", text: "a long question" }],
      }),
    });

    const live = part("assistant-status")!;
    expect(live).toHaveTextContent("Working");
    expect(live).not.toHaveTextContent("a long question");
  });
});

describe("the narrow-viewport sheet", () => {
  it("is modal and offers a way back to the table", () => {
    mount({ presentation: "sheet" });

    expect(part("assistant-panel")).toBeNull();
    const sheet = part("assistant-sheet")!;
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(part("assistant-back")).toHaveTextContent("Back to table");
  });

  it("closes from the back control", () => {
    const { onOpenChange } = mount({ presentation: "sheet" });
    fireEvent.click(part("assistant-back")!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("draws no back control in the nonmodal panel", () => {
    mount({ presentation: "panel" });

    expect(part("assistant-back")).toBeNull();
  });
});

/**
 * Every visible string has a built-in English fallback, so a host that never
 * wires labels still gets a usable panel rather than blank controls.
 */
describe("without labels", () => {
  function bare(
    props: Partial<Parameters<typeof TableAssistantChrome>[0]> = {}
  ): void {
    render(
      <TableAssistantChrome
        slots={tableAssistantTestSlots}
        assistant={view()}
        open
        onOpenChange={() => undefined}
        {...props}
      />
    );
  }

  it("names itself, its state and its controls in English", () => {
    bare({ assistant: view({ status: "awaiting-approval" }) });

    expect(part("assistant-title")).toHaveTextContent("Table assistant");
    // No labels means no translation table either, so the raw token is
    // softened rather than shown with its hyphen.
    expect(part("assistant-connection")).toHaveTextContent("awaiting approval");
    // Send and Close are icon controls: the English reaches the reader as
    // their accessible name, which is what a screen reader announces.
    expect(part("assistant-send")).toHaveAccessibleName("Send");
    expect(part("assistant-close")).toHaveAccessibleName("Close");
  });

  it("asks its question and offers its placeholder", () => {
    bare();

    expect(part("assistant-message-text")).toHaveTextContent(
      "What would you like to do?"
    );
    expect(part("assistant-input")).toHaveAttribute(
      "placeholder",
      "Ask about this table…"
    );
  });

  it("names the speakers and the outcome", () => {
    bare({
      greeting: "",
      assistant: view({
        messages: [
          { id: "m1", role: "user", text: "hi" },
          {
            id: "m2",
            role: "assistant",
            text: "Prepared.",
            receipts: [
              {
                capabilityKey: "edit.cells",
                status: "staged",
                idempotencyKey: "k1",
              },
            ],
          },
        ],
      }),
    });
    showActions();

    expect(
      parts("assistant-message-speaker").map((el) => el.textContent)
    ).toEqual(["You", "Assistant"]);
    // Without a subject the card still reports the status honestly, and
    // still keeps the capability key out of the summary.
    expect(part("assistant-receipt-summary")).toHaveTextContent("staged");
    expect(part("assistant-receipt-summary")).not.toHaveTextContent(
      "edit.cells"
    );
    expect(part("assistant-receipt-save")).toHaveTextContent(
      "Save in the table"
    );
  });

  it("labels the launcher, the stop control and the way back", () => {
    bare({ open: false });
    // The launcher wears the assistant's face and nothing else: its name is
    // on the control for anyone who cannot see it.
    expect(part("assistant-launcher")).toHaveAccessibleName("Ask AI");

    bare({ assistant: view({ status: "sending" }) });
    expect(part("assistant-stop")).toHaveAccessibleName("Stop");

    bare({ presentation: "sheet" });
    expect(part("assistant-back")).toHaveTextContent("Back to table");
  });

  it("explains a disconnected assistant", () => {
    bare({ assistant: view({ status: "disconnected" }) });

    expect(part("assistant-unavailable")).toHaveTextContent(
      "The assistant is not connected."
    );
  });

  it("labels the detail control", () => {
    bare({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "No.",
            receipts: [
              { status: "failed", message: "why", idempotencyKey: "k1" },
            ],
          },
        ],
      }),
    });
    showActions();

    expect(part("assistant-receipt-detail")).toHaveTextContent("Details");
  });
});

describe("reviewing a write inside the conversation", () => {
  const pending = (
    patch: Partial<AgentApprovalPending> = {}
  ): AgentApprovalPending => ({
    proposals: [
      {
        rowKey: "r1",
        rowLabel: "Ada",
        column: "salary",
        before: 100,
        after: 200,
      },
      {
        rowKey: "r2",
        rowLabel: "Grace",
        column: "salary",
        before: 110,
        after: 210,
      },
      {
        rowKey: "r3",
        rowLabel: "Alan",
        column: "salary",
        before: 120,
        after: 220,
      },
      {
        rowKey: "r4",
        rowLabel: "Jean",
        column: "salary",
        before: 130,
        after: 230,
      },
    ],
    decisions: ["pending", "pending", "pending", "pending"],
    presentation: "widget",
    approve: () => undefined,
    reject: () => undefined,
    decideAt: () => undefined,
    ...patch,
  });

  it("draws the review in the panel, not somewhere the reader has to find", () => {
    mount({ approval: pending() });
    expect(part("assistant-approval")).not.toBeNull();
    expect(part("approval-review-summary")).toHaveTextContent(
      "4 proposed changes across 4 rows"
    );
    expect(part("agent-approval-approve")).toHaveTextContent("Approve all");
  });

  it("draws nothing but a notice for a write reviewed elsewhere", () => {
    mount({ approval: pending({ presentation: "table" }) });
    expect(part("assistant-approval")).toBeNull();
    expect(parts("agent-approval-approve")).toHaveLength(0);
    expect(part("assistant-approval-elsewhere")).toHaveTextContent(
      "waiting for your decision"
    );
  });

  it("previews three changes and opens the rest in the window itself", () => {
    mount({ approval: pending() });
    expect(parts("agent-approval-row")).toHaveLength(3);

    fireEvent.click(part("approval-review-expand")!);
    // In place: the conversation gives way, no second overlay opens.
    expect(part("assistant-approval-full")).not.toBeNull();
    expect(parts("agent-approval-row")).toHaveLength(4);
    expect(part("assistant-conversation")).toHaveAttribute("hidden");

    fireEvent.click(part("approval-review-back")!);
    expect(part("assistant-approval-full")).toBeNull();
    expect(part("assistant-conversation")).not.toHaveAttribute("hidden");
  });

  it("routes a per-row decision to the position it belongs to", () => {
    const decideAt = vi.fn();
    mount({ approval: pending({ decideAt }) });
    fireEvent.click(parts("approval-review-row-reject")[1]!);
    expect(decideAt).toHaveBeenCalledWith(1, false);
  });

  it("promises only the rest once a row has been decided", () => {
    mount({
      approval: pending({
        decisions: ["rejected", "pending", "pending", "pending"],
      }),
    });
    expect(part("agent-approval-approve")).toHaveTextContent(
      "Approve remaining"
    );
    expect(part("approval-review-tally")).toHaveTextContent(
      "0 approved · 1 rejected · 3 left"
    );
  });

  it("names an opaque operation and offers no per-row controls", () => {
    mount({
      approval: pending({
        proposals: [],
        decisions: [],
        decideAt: undefined,
        operation: {
          capability: "staff.activateAll",
          title: "Activate everyone",
          arguments: { status: "Active" },
        },
      }),
    });
    expect(part("approval-review-operation-name")).toHaveTextContent(
      "Activate everyone"
    );
    expect(parts("approval-review-row-approve")).toHaveLength(0);
    expect(part("approval-review-expand")).toBeNull();
  });
});

describe("reviewing in a modal instead", () => {
  const modal = (): AgentApprovalPending => ({
    proposals: [
      {
        rowKey: "r1",
        rowLabel: "Ada",
        column: "salary",
        before: 100,
        after: 200,
      },
    ],
    decisions: ["pending"],
    presentation: "modal",
    approve: () => undefined,
    reject: () => undefined,
  });

  it("draws the review in the kit's own dialog, and nowhere else", () => {
    mount({ approval: modal() });
    expect(part("assistant-approval-modal")).not.toBeNull();
    expect(part("assistant-approval")).toBeNull();
    // One set of controls for one decision.
    expect(parts("agent-approval-approve")).toHaveLength(1);
  });

  it("draws it whether or not the conversation is open", () => {
    mount({ approval: modal(), open: false });
    expect(part("assistant-approval-modal")).not.toBeNull();
  });

  it("shows every change, since a dialog has room for them", () => {
    const many = Array.from({ length: 5 }, (_, index) => ({
      rowKey: `r${String(index)}`,
      column: "salary",
      after: index,
    }));
    mount({
      approval: {
        ...modal(),
        proposals: many,
        decisions: many.map(() => "pending" as const),
      },
    });
    expect(parts("agent-approval-row")).toHaveLength(5);
    expect(part("approval-review-expand")).toBeNull();
  });

  it("treats dismissing the dialog as a refusal, never as consent", () => {
    const reject = vi.fn();
    const approve = vi.fn();
    mount({ approval: { ...modal(), reject, approve } });

    // The kit's own dismissal — its backdrop or close control — routes to
    // reject. Walking away from a question is not answering yes.
    const dialog = part("assistant-approval-modal")!;
    fireEvent.click(
      dialog.querySelector<HTMLElement>('[data-testid="sheet-backdrop"]')!
    );
    expect(reject).toHaveBeenCalledTimes(1);
    expect(approve).not.toHaveBeenCalled();
  });
});

describe("a write parked behind a closed panel", () => {
  const pending = (): AgentApprovalPending => ({
    proposals: [{ rowKey: "r1", column: "salary", before: 100, after: 200 }],
    decisions: ["pending"],
    presentation: "widget",
    approve: () => undefined,
    reject: () => undefined,
  });

  it("says so on the launcher, so it is not left sitting unseen", () => {
    mount({ open: false, approval: pending() });
    const launcher = part("assistant-launcher")!;
    expect(part("assistant-launcher-waiting")).not.toBeNull();
    expect(launcher).toHaveAccessibleName(/waiting for your decision/i);
  });

  it("says nothing when nothing is waiting", () => {
    mount({ open: false });
    expect(part("assistant-launcher-waiting")).toBeNull();
    expect(part("assistant-launcher")).toHaveAccessibleName("Ask AI");
  });

  it("neither approves nor discards when the panel closes", () => {
    const approve = vi.fn();
    const reject = vi.fn();
    mount({ open: false, approval: { ...pending(), approve, reject } });
    // Closing is not an answer. The write is still parked.
    expect(approve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });
});

describe("a question the backend asked", () => {
  const question = {
    id: "q-1",
    question: "Which quarter?",
    options: [
      { id: "q3", label: "Q3" },
      { id: "q4", label: "Q4" },
    ],
    allowFreeText: false,
  };

  it("offers each choice as a chip and answers with the one pressed", () => {
    // The chips hang from the message that asked, not from a slot beside the
    // transcript: one thing to keep in step, not two.
    const answer = vi.fn();
    mount({
      assistant: view({
        messages: [
          { id: "m1", role: "assistant", text: question.question, question },
        ],
        pendingQuestion: question,
        answer,
      }),
    });

    const chips = parts("assistant-question-option");
    expect(chips).toHaveLength(2);
    fireEvent.click(chips[1]!);

    expect(answer).toHaveBeenCalledWith({ optionId: "q4" });
  });

  it("offers no typed answer when the backend accepts only a choice", () => {
    mount({ assistant: view({ pendingQuestion: question, answer: vi.fn() }) });

    // An input beside a closed set invites an answer that will be refused.
    expect(part("assistant-question-input")).toBeNull();
  });

  it("answers from the composer, whatever the backend said it would take", () => {
    // The panel has one box and it is at the bottom, where a reader types.
    // A second box drawn beside the question is a form; this is a
    // conversation, and the closed set the backend declared does not stop
    // someone saying what they actually want.
    const answer = vi.fn();
    const setDraft = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: { ...question, allowFreeText: false },
        draft: "  neither — show me Platform  ",
        setDraft,
        answer,
      }),
    });

    expect(part("assistant-question-input")).toBeNull();
    fireEvent.keyDown(part("assistant-input")!, { key: "Enter" });

    expect(answer).toHaveBeenCalledWith({
      text: "neither — show me Platform",
    });
    expect(setDraft).toHaveBeenCalledWith("");
  });

  it("invites an answer rather than a new question while one is open", () => {
    mount({
      assistant: view({ pendingQuestion: question, answer: vi.fn() }),
    });

    expect(part("assistant-input")).toHaveAttribute(
      "placeholder",
      "Type an answer"
    );
  });

  it("offers Send, not Stop, while it is the reader's turn", () => {
    // The turn is parked on the reader. Reported busy, the composer drew the
    // stop control where send belongs and Enter did nothing — a question you
    // could read and could not answer.
    mount({
      assistant: view({
        pendingQuestion: question,
        busy: true,
        status: "awaiting-user",
        draft: "the last one",
        answer: vi.fn(),
      }),
    });

    expect(part("assistant-send")).toBeTruthy();
    expect(part("assistant-stop")).toBeNull();
  });

  it("answers on Enter while the turn is parked", () => {
    const answer = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: question,
        busy: true,
        status: "awaiting-user",
        draft: "the last one",
        answer,
      }),
    });

    fireEvent.keyDown(part("assistant-input")!, { key: "Enter" });
    expect(answer).toHaveBeenCalledWith({ text: "the last one" });
  });

  it("leaves Shift+Enter and an IME composition alone", () => {
    const answer = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: question,
        draft: "Q4",
        answer,
      }),
    });

    const input = part("assistant-input")!;
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(answer).not.toHaveBeenCalled();
  });

  it("draws nothing when the host cannot answer one", () => {
    mount({ assistant: view({ pendingQuestion: question }) });

    expect(part("assistant-question")).toBeNull();
  });
});

describe("the mark beside each speaker", () => {
  const talking = {
    messages: [
      { id: "m-0", role: "user" as const, text: "sort it" },
      { id: "m-1", role: "assistant" as const, text: "Sorted." },
    ],
  };

  it("draws a built-in face for each side when the host names none", () => {
    mount({ assistant: view(talking) });

    expect(part("assistant-user-mark")).toBeTruthy();
    expect(part("assistant-message-mark")).toBeTruthy();
    expect(parts("assistant-initials")).toHaveLength(0);
  });

  it("reads a string as a name and draws its initials", () => {
    // The two-letter circle every product falls back to for someone it has
    // no picture of — the first letter of each of the first two words.
    mount({
      assistant: view(talking),
      avatars: { user: "ada lovelace", assistant: "Table Bot Nine" },
    });

    // The header's mark, then the exchange: the assistant wears its name in
    // both places, which is the point of naming it once.
    expect(parts("assistant-initials").map((mark) => mark.textContent)).toEqual(
      ["TB", "AL", "TB"]
    );
  });

  it("takes one letter from a name of one word", () => {
    mount({ assistant: view(talking), avatars: { user: "Ada" } });

    expect(part("assistant-initials")).toHaveTextContent("A");
  });

  it("keeps the built-in face for a name that is only spaces", () => {
    // An empty circle says less than a face does.
    mount({ assistant: view(talking), avatars: { user: "   " } });

    expect(parts("assistant-initials")).toHaveLength(0);
    expect(part("assistant-user-mark")).toBeTruthy();
  });

  it("renders whatever the host gave, when it gave an element", () => {
    mount({
      assistant: view(talking),
      avatars: { user: <img src="/me.png" alt="" data-testid="mine" /> },
    });

    expect(part("assistant-user-mark")?.querySelector("img")).toBeTruthy();
  });

  it("wears the same face in the header and on the launcher", () => {
    // One assistant. A header or a corner button wearing something else is a
    // second one.
    mount({ assistant: view(talking), avatars: { assistant: "Table Bot" } });
    expect(part("assistant-mark")).toHaveTextContent("TB");

    mount({
      open: false,
      assistant: view(talking),
      avatars: { assistant: "Table Bot" },
    });
    expect(part("assistant-launcher-mark")).toHaveTextContent("TB");
  });
});

describe("putting a turn back", () => {
  const message = {
    id: "m-1",
    role: "assistant" as const,
    text: "Sorted by total.",
  };

  it("offers Undo on the turn the offer belongs to, and nowhere else", () => {
    const undoTurn = vi.fn();
    mount({
      assistant: view({
        messages: [{ id: "m-0", role: "user", text: "sort it" }, message],
        undo: { messageId: "m-1", available: true },
        undoTurn,
      }),
    });

    expect(parts("assistant-undo")).toHaveLength(1);
    fireEvent.click(part("assistant-undo-button")!);
    expect(undoTurn).toHaveBeenCalledTimes(1);
  });

  it("disables it and says why once the table has moved", () => {
    const undoTurn = vi.fn();
    mount({
      assistant: view({
        messages: [message],
        undo: {
          messageId: "m-1",
          available: false,
          blockedCode: "table-moved",
        },
        undoTurn,
      }),
    });

    const button = part("assistant-undo-button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(part("assistant-undo-reason")?.textContent).toBe(
      "The table has changed since this ran."
    );
  });

  it("offers nothing when no turn moved the table", () => {
    mount({ assistant: view({ messages: [message] }) });

    expect(part("assistant-undo")).toBeNull();
  });
});

describe("a reply still arriving", () => {
  it("shows what has landed, marked provisional", () => {
    mount({
      assistant: view({
        messages: [
          {
            id: "m-1",
            role: "assistant",
            text: "",
            partialText: "Sorting by",
          },
        ],
      }),
    });

    const text = part("assistant-message-text");
    expect(text?.textContent).toBe("Sorting by");
    expect(text?.dataset.streaming).toBe("true");
  });

  it("shows the settled reply once it lands, unmarked", () => {
    mount({
      assistant: view({
        messages: [{ id: "m-1", role: "assistant", text: "Sorted by total." }],
      }),
    });

    const text = part("assistant-message-text");
    expect(text?.textContent).toBe("Sorted by total.");
    expect(text?.dataset.streaming).toBeUndefined();
  });
});

describe("what the reader stopped being asked about", () => {
  it("lists each one with a way to start asking again", () => {
    const revokeAlwaysAllow = vi.fn();
    mount({
      assistant: view({
        alwaysAllowed: ["edit.cells"],
        revokeAlwaysAllow,
      }),
    });

    expect(parts("assistant-always-allowed-item")).toHaveLength(1);
    const control = part("assistant-always-allowed-revoke")!;
    // The key is a developer detail; the reader sees what it means.
    expect(control.textContent).toBe("editing cells");
    fireEvent.click(control);
    expect(revokeAlwaysAllow).toHaveBeenCalledWith("edit.cells");
  });

  it("draws nothing when the reader has waved nothing through", () => {
    mount({
      assistant: view({ alwaysAllowed: [], revokeAlwaysAllow: vi.fn() }),
    });

    expect(part("assistant-always-allowed")).toBeNull();
  });
});

describe("dictating instead of typing", () => {
  /** A speech input the test drives by hand. */
  function speech(patch: Partial<SpeechInputHandle> = {}): SpeechInputHandle & {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    setLanguage: ReturnType<typeof vi.fn>;
  } {
    return {
      available: true,
      state: { status: "idle", language: "en-GB", interim: "" },
      languages: ["en-GB", "fr-FR"],
      start: vi.fn(),
      stop: vi.fn(),
      setLanguage: vi.fn(),
      ...patch,
    } as SpeechInputHandle & {
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      setLanguage: ReturnType<typeof vi.fn>;
    };
  }

  it("offers a mic when the browser can listen", () => {
    const input = speech();
    mount({ speech: input });

    const mic = part("assistant-voice");
    expect(mic).toBeTruthy();
    fireEvent.click(mic!);
    expect(input.start).toHaveBeenCalledTimes(1);
  });

  it("has no mic at all when this browser cannot listen", () => {
    // Absent rather than disabled: a disabled control raises a question the
    // reader has no way to answer.
    mount({ speech: speech({ available: false }) });

    expect(part("assistant-voice")).toBeNull();
  });

  it("says it is listening, and offers to stop", () => {
    const input = speech({
      state: { status: "listening", language: "en-GB", interim: "show me" },
    });
    mount({ speech: input });

    // Announced once when it starts, not on every word heard.
    expect(part("assistant-voice-status")?.textContent).toBe("Listening");

    fireEvent.click(part("assistant-voice")!);
    expect(input.stop).toHaveBeenCalledTimes(1);
  });

  it("offers a language when there is a choice to make", () => {
    const input = speech();
    mount({ speech: input });

    const chip = part("assistant-voice-language") as HTMLSelectElement | null;
    expect(chip).toBeTruthy();
    fireEvent.change(chip!, {
      target: { value: "fr-FR" },
    });
    expect(input.setLanguage).toHaveBeenCalledWith("fr-FR");
  });

  it("shows no chip when there is only one answer", () => {
    // Asking a reader which language they are about to speak, when there is
    // only one, is slower than typing.
    mount({ speech: speech({ languages: ["en-GB"] }) });

    expect(part("assistant-voice-language")).toBeNull();
  });
});

describe("answering a question in the reader's own words", () => {
  it("sends what they typed, trimmed, and clears the box", () => {
    const onAnswer = vi.fn();
    const setDraft = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: {
          id: "q1",
          question: "What should I call it?",
          allowFreeText: true,
        },
        draft: "  Q4 report  ",
        setDraft,
        answer: onAnswer,
      }),
    });

    fireEvent.click(part("assistant-send")!);

    // Trimmed, because the surrounding spaces are the reader's typing rather
    // than their answer.
    expect(onAnswer).toHaveBeenCalledWith({ text: "Q4 report" });
    expect(setDraft).toHaveBeenCalledWith("");
  });

  it("sends nothing when they typed nothing", () => {
    const onAnswer = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: {
          id: "q1",
          question: "What should I call it?",
          allowFreeText: true,
        },
        draft: "   ",
        answer: onAnswer,
      }),
    });

    fireEvent.click(part("assistant-send")!);

    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe("what a before-and-after pair is spoken as", () => {
  function withReceipt(status: TableAssistantReceiptView["status"]) {
    mount({
      assistant: view({
        messages: [
          {
            id: "m1",
            role: "assistant",
            text: "Here you go.",
            receipts: [
              {
                capabilityKey: "edit.cells",
                status,
                idempotencyKey: "k1",
                subject: {
                  kind: "edit",
                  row: "Priya Nair",
                  column: "Salary",
                  before: "170",
                  after: "185",
                },
              },
            ],
          },
        ],
      }),
    });
    showActions();
  }

  it("calls an applied edit a change", () => {
    withReceipt("executed");

    expect(part("assistant-receipt-change")).toHaveTextContent(
      "Changed from 170 to 185"
    );
  });
  showActions();

  it("calls a refused edit a proposal, not a change", () => {
    withReceipt("rejected");

    // The strikethrough shows what was asked for; the sentence a screen
    // reader hears must not say the table did it.
    expect(part("assistant-receipt-change")).toHaveTextContent(
      "Proposed: 170 to 185"
    );
    expect(part("assistant-receipt-change")).not.toHaveTextContent("Changed");
  });
  showActions();

  it("calls a staged edit a proposal too — nothing is saved yet", () => {
    withReceipt("staged");

    expect(part("assistant-receipt-change")).not.toHaveTextContent("Changed");
  });
  showActions();

  it("still shows both values whatever the outcome", () => {
    withReceipt("rejected");

    expect(part("assistant-receipt-before")).toHaveTextContent("170");
    expect(part("assistant-receipt-after")).toHaveTextContent("185");
  });
  showActions();
});
