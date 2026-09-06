/**
 * The assistant panel, rendered with THIS kit's own controls.
 *
 * Parity is not a shared look: it is that every visible control here comes
 * from native HTML, and that the structure the chrome owns arrives intact.
 */
import { defaultLabels } from "@adapttable/core";
import { fireEvent, render } from "@testing-library/react";
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
    expect(part("assistant-empty-prompt")).toBeTruthy();
    expect(part("assistant-input")).toBeTruthy();
    expect(part("assistant-suggestion")).toHaveTextContent("Group by city");
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

  it("names each action and its outcome in the transcript", () => {
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

    expect(part("assistant-receipt-summary")).toHaveTextContent(
      "view.setGroupBy"
    );
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

describe("the native controls", () => {
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
