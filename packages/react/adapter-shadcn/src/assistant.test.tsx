/**
 * The assistant panel, rendered with THIS kit's own controls.
 *
 * Parity is not a shared look: it is that every visible control here comes
 * from shadcn/ui, and that the structure the chrome owns arrives intact.
 */
import { defaultLabels } from "@adapttable/react/adapter";
import { fireEvent, render } from "@testing-library/react";
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

describe("TableAssistant", () => {
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

  it("runs a shortcut from the composer's menu", () => {
    const runSuggestion = vi.fn();
    mount(
      <TableAssistant
        assistant={view({ runSuggestion })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );
    fireEvent.click(
      document.querySelector<HTMLElement>(
        '[data-adapttable-part="assistant-examples-item"]'
      )!
    );

    expect(runSuggestion).toHaveBeenCalledWith("s1");
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
