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
      {...props}
    />
  );
  return { onOpenChange };
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
  it("asks what to do and offers what this table can run", () => {
    mount({
      assistant: view({
        suggestions: [{ id: "a", title: "Group by city" }],
      }),
    });

    expect(part("assistant-empty-prompt")).toHaveTextContent(
      "What would you like to do?"
    );
    expect(part("assistant-suggestion")).toHaveTextContent("Group by city");
  });

  it("runs the suggestion by its id", () => {
    const runSuggestion = vi.fn();
    mount({
      assistant: view({
        suggestions: [{ id: "group", title: "Group by city" }],
        runSuggestion,
      }),
    });
    fireEvent.click(part("assistant-suggestion")!);

    expect(runSuggestion).toHaveBeenCalledWith("group");
  });

  it("keeps the extras behind a more control", () => {
    mount({
      assistant: view({
        suggestions: [{ id: "a", title: "First" }],
        moreSuggestions: [{ id: "b", title: "Second" }],
      }),
    });

    expect(parts("assistant-suggestion")).toHaveLength(1);
    fireEvent.click(part("assistant-suggestions-more")!);
    expect(parts("assistant-suggestion")).toHaveLength(2);
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

    expect(part("assistant-empty-prompt")).toHaveTextContent(
      "What would you like to do?"
    );
    expect(part("assistant-input")).toHaveAttribute(
      "placeholder",
      "Ask about this table…"
    );
  });

  it("names the speakers and the outcome", () => {
    bare({
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
    expect(part("assistant-launcher")).toHaveTextContent("Ask AI");

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
    const answer = vi.fn();
    mount({ assistant: view({ pendingQuestion: question, answer }) });

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

  it("takes a typed answer when the backend said it would", () => {
    const answer = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: {
          ...question,
          options: undefined,
          allowFreeText: true,
        },
        answer,
      }),
    });

    const input = part("assistant-question-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "  Q4  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(answer).toHaveBeenCalledWith({ text: "Q4" });
  });

  it("leaves Shift+Enter and an IME composition alone", () => {
    const answer = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: {
          ...question,
          options: undefined,
          allowFreeText: true,
        },
        answer,
      }),
    });

    const input = part("assistant-question-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Q4" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(answer).not.toHaveBeenCalled();
  });

  it("draws nothing when the host cannot answer one", () => {
    mount({ assistant: view({ pendingQuestion: question }) });

    expect(part("assistant-question")).toBeNull();
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
  it("sends what they typed, and clears the box", () => {
    const onAnswer = vi.fn();
    mount({
      assistant: view({
        pendingQuestion: {
          id: "q1",
          question: "What should I call it?",
          allowFreeText: true,
        },
        answer: onAnswer,
      }),
    });

    const box = part("assistant-question-input") as HTMLInputElement | null;
    expect(box).toBeTruthy();
    fireEvent.change(box!, {
      target: { value: "  Q4 report  " },
    });
    fireEvent.click(part("assistant-question-send")!);

    // Trimmed, because the surrounding spaces are the reader's typing rather
    // than their answer.
    expect(onAnswer).toHaveBeenCalledWith({ text: "Q4 report" });
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
        answer: onAnswer,
      }),
    });

    fireEvent.change(part("assistant-question-input") as HTMLInputElement, {
      target: { value: "   " },
    });
    fireEvent.click(part("assistant-question-send")!);

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
  }

  it("calls an applied edit a change", () => {
    withReceipt("executed");

    expect(part("assistant-receipt-change")).toHaveTextContent(
      "Changed from 170 to 185"
    );
  });

  it("calls a refused edit a proposal, not a change", () => {
    withReceipt("rejected");

    // The strikethrough shows what was asked for; the sentence a screen
    // reader hears must not say the table did it.
    expect(part("assistant-receipt-change")).toHaveTextContent(
      "Proposed: 170 to 185"
    );
    expect(part("assistant-receipt-change")).not.toHaveTextContent("Changed");
  });

  it("calls a staged edit a proposal too — nothing is saved yet", () => {
    withReceipt("staged");

    expect(part("assistant-receipt-change")).not.toHaveTextContent("Changed");
  });

  it("still shows both values whatever the outcome", () => {
    withReceipt("rejected");

    expect(part("assistant-receipt-before")).toHaveTextContent("170");
    expect(part("assistant-receipt-after")).toHaveTextContent("185");
  });
});
