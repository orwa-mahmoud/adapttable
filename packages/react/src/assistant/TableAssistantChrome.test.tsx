/**
 * What the chrome owns: structure, keyboard, focus, announcements.
 *
 * Every visible control here is a plain-HTML test slot, so a failure is the
 * chrome's behaviour and never a kit's styling.
 */
import { defaultLabels } from "@adapttable/core";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { tableAssistantTestSlots } from "../internal/chromeTestSlots";
import type { TableAssistantView } from "./assistantView";
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
      "What would you like to do with this table?"
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
              },
            ],
          },
        ],
      }),
    });

    expect(part("assistant-receipt-summary")).toHaveTextContent(
      "view.setGroupBy: done"
    );
    expect(part("assistant-receipt")).toHaveAttribute(
      "data-status",
      "executed"
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
    expect(part("assistant-send")).toHaveTextContent("Send");
    expect(part("assistant-close")).toHaveTextContent("Close");
  });

  it("asks its question and offers its placeholder", () => {
    bare();

    expect(part("assistant-empty-prompt")).toHaveTextContent(
      "What would you like to do with this table?"
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
    expect(part("assistant-receipt-summary")).toHaveTextContent(
      "edit.cells: staged"
    );
    expect(part("assistant-receipt-save")).toHaveTextContent(
      "Save in the table"
    );
  });

  it("labels the launcher, the stop control and the way back", () => {
    bare({ open: false });
    expect(part("assistant-launcher")).toHaveTextContent("Ask AI");

    bare({ assistant: view({ status: "sending" }) });
    expect(part("assistant-stop")).toHaveTextContent("Stop");

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
