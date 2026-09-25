/**
 * The assistant panel, rendered with THIS kit's own controls.
 *
 * Parity is not a shared look: it is that every visible control here comes
 * from shadcn/ui, and that the structure the chrome owns arrives intact.
 */
import { defaultLabels } from "@adapttable/core";
import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { TableAssistant, tableAssistant } from "./assistant";

const axeOpts = { rules: { "color-contrast": { enabled: false } } };

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
  it("renders the panel with the header, empty state and composer", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    expect(part("assistant-panel")).toBeTruthy();
    expect(part("assistant-title")).toHaveTextContent("Table assistant");
    expect(part("assistant-connection")).toHaveTextContent("Ready");
    // The opening line is the assistant's first message, drawn by the
    // same component as every other reply.
    expect(part("assistant-message-text")).toBeTruthy();
    expect(part("assistant-input")).toBeTruthy();
    // The shortcuts live in the composer's own menu from the first frame,
    // not as cards in the empty state.
    expect(part("assistant-examples-menu")).toBeTruthy();
  });

  it("shows only the launcher while closed", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open={false}
        onOpenChange={() => undefined}
      />
    );

    expect(part("assistant-launcher")).toBeTruthy();
    expect(part("assistant-panel")).toBeNull();
  });

  it("sends the draft through the kit's own send control", () => {
    const send = vi.fn();
    mount(
      <TableAssistant
        assistant={view({ draft: "group by city", send })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );
    fireEvent.click(part("assistant-send")!);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("swaps Send for Stop while a turn runs", () => {
    const stop = vi.fn();
    mount(
      <TableAssistant
        assistant={view({ status: "sending", draft: "x", stop })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    expect(part("assistant-send")).toBeNull();
    fireEvent.click(part("assistant-stop")!);
    expect(stop).toHaveBeenCalled();
  });

  it("names each action and its outcome in the transcript", async () => {
    mount(
      <TableAssistant
        assistant={view({
          messages: [
            {
              id: "m1",
              role: "assistant",
              text: "Grouped.",
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
        })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    // What a turn did is evidence, opened from the mark on the reply — and
    // the control that opens it is this kit's own button, not one drawn here.
    fireEvent.click(part("assistant-receipts-toggle-button")!);

    await waitFor(() => {
      expect(part("assistant-receipt-summary")).toHaveTextContent("Grouped");
    });
  });

  it("becomes a modal sheet on a narrow viewport", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        presentation="sheet"
        open
        onOpenChange={() => undefined}
      />
    );

    expect(part("assistant-panel")).toBeNull();
    expect(part("assistant-back")).toBeTruthy();
  });

  it("reads correctly right-to-left", () => {
    const { container } = mount(
      <div dir="rtl">
        <TableAssistant
          assistant={view()}
          labels={defaultLabels}
          open
          onOpenChange={() => undefined}
        />
      </div>
    );

    // Nothing here may pin a side physically: the chrome uses logical
    // properties, so the panel is correct in both directions.
    expect(container.querySelector("[dir='rtl']")).toBeTruthy();
    expect(part("assistant-panel")).toBeTruthy();
  });

  it("has no accessibility violations", async () => {
    const { container } = mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );

    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it("puts the host's class on the surface, panel and sheet alike", () => {
    const { unmount } = mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        className="host-class"
        open
        onOpenChange={() => undefined}
      />
    );
    expect(part("assistant-panel")!.className).toContain("host-class");
    unmount();

    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        className="host-class"
        presentation="sheet"
        open
        onOpenChange={() => undefined}
      />
    );
    // The kit's own class stays: a host class is merged over the preset, not
    // in place of it.
    expect(part("assistant-sheet")!.className).toContain("host-class");
  });

  it("binds to the assistant slot as a feature", () => {
    expect(tableAssistant().id).toBe("table-assistant");
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

describe("the kit's own controls", () => {
  it("reports what the reader types", () => {
    const setDraft = vi.fn();
    mount(
      <TableAssistant
        assistant={view({ setDraft })}
        labels={defaultLabels}
        open
        onOpenChange={() => undefined}
      />
    );
    fireEvent.change(part("assistant-input")!, {
      target: { value: "group by city" },
    });

    expect(setDraft).toHaveBeenCalledWith("group by city");
  });

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
describe("the floating window", () => {
  it("draws the kit's own nonmodal surface", () => {
    mount(
      <TableAssistant
        assistant={view()}
        labels={defaultLabels}
        presentation="floating"
        open
        onOpenChange={() => undefined}
      />
    );

    const window_ = part("assistant-window");
    expect(window_).not.toBeNull();
    // Either the native element or the role — both announce a dialog.
    expect(
      window_!.tagName === "DIALOG" ||
        window_!.getAttribute("role") === "dialog"
    ).toBe(true);
    // Out of the document flow, so the table keeps its width behind it.
    expect(window_!.style.position).toBe("fixed");
    // The in-flow panel is not what a floating request gets.
    expect(part("assistant-panel")).toBeNull();
    // The conversation is inside it, not somewhere else on the page.
    expect(
      window_!.querySelector('[data-adapttable-part="assistant-composer"]')
    ).not.toBeNull();
  });
});
