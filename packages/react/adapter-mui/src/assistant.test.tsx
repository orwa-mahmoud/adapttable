/**
 * The assistant panel, rendered with THIS kit's own controls.
 *
 * Parity is not a shared look: it is that every visible control here comes
 * from MUI, and that the structure the chrome owns arrives intact.
 */
import { defaultLabels } from "@adapttable/react/adapter";
import { createTheme, ThemeProvider } from "@mui/material";
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
  return render(<ThemeProvider theme={createTheme()}>{node}</ThemeProvider>);
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
  it("opens the examples from the composer, in this kit's own menu", async () => {
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

    // In the composer, where a reader looks when they do not know what to
    // type — and drawn by this kit, not by the chrome.
    const trigger = part("assistant-examples-menu")!;
    expect(trigger).toBeTruthy();
    expect(part("assistant-composer")!.contains(trigger)).toBe(true);

    fireEvent.click(trigger);
    const items = await waitFor(() => {
      const found = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-adapttable-part="assistant-examples-item"]'
        ),
      ];
      expect(found).toHaveLength(2);
      return found;
    });

    fireEvent.click(items[1]!);
    expect(runSuggestion).toHaveBeenCalledWith("s2");
  });

  it("draws its controls with MUI's own components", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    // A raw <button> here would mean this kit is borrowing another kit's
    // look, which is the same defect as drawing the control in core.
    expect(part("assistant-send")!.className).toContain("MuiIconButton-root");
  });
});

describe("the kit's own controls", () => {
  it("sends on Enter and starts a line on Shift+Enter", () => {
    const send = vi.fn();
    mount(
      <TableAssistant
        assistant={view({ draft: "hello", send })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );
    const input = part("assistant-input")!;
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(send).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("runs a shortcut from the composer's menu", async () => {
    const runSuggestion = vi.fn();
    mount(
      <TableAssistant
        assistant={view({ runSuggestion })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    // This kit's menu renders its entries when it opens, not before.
    const trigger = part("assistant-examples-menu")!;
    fireEvent.click(trigger);
    const item = await waitFor(() => {
      const found = document.querySelector<HTMLElement>(
        '[data-adapttable-part="assistant-examples-item"]'
      );
      expect(found).toBeTruthy();
      return found!;
    });
    fireEvent.click(item);

    expect(runSuggestion).toHaveBeenCalledWith("s1");
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

  it("closes from the header", () => {
    const onOpenChange = vi.fn();
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(part("assistant-close")!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens the settings control the host supplied", () => {
    const onSettings = vi.fn();
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
        onSettings={onSettings}
      />
    );
    fireEvent.click(part("assistant-settings")!);

    expect(onSettings).toHaveBeenCalled();
  });

  it("disables the composer when nothing is connected", () => {
    mount(
      <TableAssistant
        assistant={view({ status: "disconnected" })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    expect(part("assistant-input")).toBeDisabled();
    expect(part("assistant-unavailable")).toBeTruthy();
  });

  it("closes the sheet through the kit's own dismiss", async () => {
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
    // Dispatched on the sheet itself. The chrome's listener sits on a child
    // element and never sees this, so what it proves is the KIT overlay's
    // own dismiss reaching the host.
    fireEvent.keyDown(part("assistant-sheet")!, { key: "Escape" });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("tones the badge by state in every state it can reach", () => {
    for (const [status, tone] of [
      ["ready", "neutral"],
      ["sending", "busy"],
      ["awaiting-approval", "warning"],
      ["error", "danger"],
    ] as const) {
      const { unmount } = mount(
        <TableAssistant
          assistant={view({ status })}
          labels={defaultLabels}
          open
          onOpenChange={() => undefined}
        />
      );
      expect(part("assistant-connection")).toHaveAttribute("data-tone", tone);
      unmount();
    }
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
