/**
 * The assistant panel, rendered with THIS kit's own controls.
 *
 * Parity is not a shared look: it is that every visible control here comes
 * from native HTML, and that the structure the chrome owns arrives intact.
 */
import { defaultLabels } from "@adapttable/react/adapter";
import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { assistantTests } from "../../react/test/kit/suites/assistant";
import { TableAssistant } from "./assistant";
import { kit } from "./data-table.test-utils";

for (const test of assistantTests(kit)) it(test.name, test.run);

interface View {
  status: string;
  messages: {
    id: string;
    role: "user" | "assistant";
    text: string;
    question?: {
      id: string;
      question: string;
      options?: { id: string; label: string }[];
      allowFreeText: boolean;
    };
    receipts?: {
      capabilityKey?: string;
      status: string;
      idempotencyKey: string;
      subject?: { kind?: string; detail?: string };
    }[];
  }[];
  draft: string;
  setDraft: (draft: string) => void;
  send: (text?: string) => void;
  stop: () => void;
  suggestions: { id: string; title: string }[];
  runSuggestion: (id: string) => void;
  answer?: (answer: { optionId?: string; text?: string }) => void;
}

function view(patch: Partial<View> = {}): View {
  return {
    status: "ready",
    messages: [],
    draft: "",
    setDraft: () => undefined,
    send: () => undefined,
    stop: () => undefined,
    suggestions: [{ id: "s1", title: "Group by city" }],
    runSuggestion: () => undefined,
    ...patch,
  };
}

function part(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-adapttable-part="${name}"]`
  );
}

function mount(node: ReactElement) {
  return render(<>{node}</>);
}

const QUESTION = {
  id: "q1",
  question: "Which team did you mean?",
  options: [
    { id: "core", label: "Core" },
    { id: "platform", label: "Platform" },
  ],
  allowFreeText: false,
};

describe("TableAssistant", () => {
  it("opens the examples from the composer, in this kit's own menu", () => {
    // Native IS the kit here, so `<details>` and a `menu` list are the real
    // thing rather than a stand-in for a kit's popup.
    const runSuggestion = vi.fn();
    mount(
      <TableAssistant
        assistant={view({
          messages: [{ id: "m1", role: "assistant", text: "Done." }],
          suggestions: [
            { id: "s1", title: "Group by city" },
            { id: "s2", title: "Sort by salary" },
          ],
          runSuggestion,
        })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    const trigger = part("assistant-examples-menu")!;
    expect(trigger.tagName).toBe("SUMMARY");
    expect(part("assistant-composer")!.contains(trigger)).toBe(true);

    const items = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="assistant-examples-item"]'
      ),
    ];
    expect(items).toHaveLength(2);

    const disclosure = trigger.closest("details")!;
    disclosure.setAttribute("open", "");
    fireEvent.click(items[1]!);
    expect(runSuggestion).toHaveBeenCalledWith("s2");
    // Picking one closes the menu, the way a menu closes anywhere else.
    expect(disclosure.hasAttribute("open")).toBe(false);
  });

  it("asks the backend's question with this kit's own option controls", () => {
    // The suggestion control has two homes: the shortcuts menu, and the
    // options on a question the backend put to the reader.
    const answer = vi.fn();
    mount(
      <TableAssistant
        assistant={view({
          status: "awaiting-user",
          // The question is an attribute of the message that asked it, so
          // this kit's option controls hang from that message.
          messages: [
            {
              id: "m1",
              role: "assistant",
              text: "Which team did you mean?",
              question: QUESTION,
            },
          ],
          answer,
        })}
        // This is about the option controls, not the opening line.
        greeting=""
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    expect(part("assistant-message-text")).toHaveTextContent(
      "Which team did you mean?"
    );
    const options = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="assistant-question-option"]'
      ),
    ];
    expect(options).toHaveLength(2);
    fireEvent.click(options[1]!);
    expect(answer).toHaveBeenCalledWith({ optionId: "platform" });
  });

  it("draws its controls as native elements", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    // Native IS this kit: the parts are the styling surface, not a class
    // borrowed from a component library.
    expect(part("assistant-send")!.tagName).toBe("BUTTON");
    expect(part("assistant-input")!.tagName).toBe("TEXTAREA");
  });
});

describe("the native controls", () => {
  it("dismisses shortcuts with Escape before closing the assistant", async () => {
    const onOpenChange = vi.fn();
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open
        onOpenChange={onOpenChange}
      />
    );
    const trigger = part("assistant-examples-menu")!;
    const disclosure = trigger.closest("details")!;
    fireEvent.click(trigger);
    disclosure.open = true;
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(disclosure.open).toBe(true);
    fireEvent.keyDown(part("assistant-examples-item")!, { key: "Escape" });
    await Promise.resolve();
    expect(disclosure.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("blocks shortcut activation while connecting", () => {
    const runSuggestion = vi.fn();
    mount(
      <TableAssistant
        assistant={view({ status: "connecting", runSuggestion })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );
    const trigger = part("assistant-examples-menu")!;
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect(fireEvent.click(trigger)).toBe(false);
    expect(trigger.closest("details")!.open).toBe(false);
    expect(part("assistant-examples-item")).toBeDisabled();
    fireEvent.click(part("assistant-examples-item")!);
    expect(runSuggestion).not.toHaveBeenCalled();
  });

  it("opens the sheet as a real modal dialog", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        presentation="sheet"
        open
        onOpenChange={() => undefined}
      />
    );

    const dialog = part("assistant-sheet") as HTMLDialogElement;
    expect(dialog.tagName).toBe("DIALOG");
    // The browser owns the focus trap, the backdrop and the top layer, so
    // nothing here reimplements them.
    expect(dialog.open).toBe(true);
  });

  it("opens the sheet through the browser's modal dialog where it has one", () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: showModal,
    });
    try {
      mount(
        <TableAssistant
          assistant={view()}
          labels={defaultLabels}
          presentation="sheet"
          open
          onOpenChange={() => undefined}
        />
      );
      expect(showModal).toHaveBeenCalledTimes(1);
      expect((part("assistant-sheet") as HTMLDialogElement).open).toBe(true);
    } finally {
      Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    }
  });

  it("closes the dialog when the panel closes", () => {
    const { rerender } = mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        presentation="sheet"
        open
        onOpenChange={() => undefined}
      />
    );
    rerender(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        presentation="sheet"
        open={false}
        onOpenChange={() => undefined}
      />
    );

    expect(part("assistant-sheet")).toBeNull();
  });

  it("treats the browser's own dismiss as a close request", () => {
    const onOpenChange = vi.fn();
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        presentation="sheet"
        open
        onOpenChange={onOpenChange}
      />
    );
    // Escape on a native dialog fires cancel. Letting it close by itself
    // would leave the host believing the panel is still open.
    fireEvent(
      part("assistant-sheet")!,
      new Event("cancel", { bubbles: false, cancelable: true })
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

/**
 * The floating window is the presentation the flagship demo uses, so every
 * kit has to supply a surface for it — and that surface must not be the
 * in-flow panel, which would put the table back in a column beside it.
 */

describe("the dictation language chooser", () => {
  /** Dictation that offers a choice, so the chip has something to choose. */
  const speech = {
    available: true,
    state: { status: "idle" as const, language: "en-US", interim: "" },
    languages: ["en-US", "ar-SA"],
    start: () => undefined,
    stop: () => undefined,
    setLanguage: vi.fn(),
  };

  it("fills the slot with this kit's own chooser", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        speech={speech}
        open
        onOpenChange={() => undefined}
      />
    );

    const chip = document.querySelector(
      '[data-adapttable-part="assistant-voice-language"]'
    );
    expect(chip).not.toBeNull();
    // The chrome names it; the kit draws it.
    expect(
      document.querySelector('[aria-label="Dictation language"]')
    ).not.toBeNull();
    fireEvent.change(chip!, { target: { value: "ar-SA" } });
    expect(speech.setLanguage).toHaveBeenCalledWith("ar-SA");
  });

  it("draws no chip when there is only one language to choose", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        speech={{ ...speech, languages: ["en-US"] }}
        open
        onOpenChange={() => undefined}
      />
    );

    // A question with one answer is slower than typing.
    expect(
      document.querySelector(
        '[data-adapttable-part="assistant-voice-language"]'
      )
    ).toBeNull();
  });
});
