/**
 * The saved-views management panel.
 *
 * The slots are plain HTML: what is being tested is what core decides — the
 * card's title, which controls exist on which row and in what order, what each
 * one does, that applying a view is clicking its name, and that renaming can be
 * abandoned without changing anything.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { CSSProperties } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SavedViewsPanelChrome,
  type SavedViewsPanelSlots,
} from "./SavedViewsPanelChrome";
import type { SavedView } from "./useSavedViews";

const VIEWS: SavedView[] = [
  { name: "Mine", search: "t.q=a" },
  { name: "Team", search: "t.q=b", isDefault: true },
];

const slots: SavedViewsPanelSlots = {
  Surface: ({ children, title, footer, ...rest }) => (
    <div {...rest}>
      <h2>{title}</h2>
      {children}
      {footer && <footer>{footer}</footer>}
    </div>
  ),
  Empty: ({ message }) => <p>{message}</p>,
  Input: ({ label, value, onChange, onCommit, onCancel }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit();
        if (event.key === "Escape") onCancel();
      }}
    />
  ),
  Row: ({
    name,
    viewName,
    isEditing,
    isDefault,
    defaultLabel,
    onApply,
    applyLabel,
    controls,
    ...rest
  }) => (
    <div {...rest}>
      {isEditing ? (
        name
      ) : (
        <button type="button" title={applyLabel} onClick={onApply}>
          {viewName}
        </button>
      )}
      {isDefault && <em>{defaultLabel}</em>}
      {controls.map((control) => (
        <button
          key={control.key}
          type="button"
          data-control={control.key}
          aria-label={control.label}
          aria-pressed={control.pressed}
          disabled={!control.onPress}
          onClick={control.onPress}
        >
          {control.icon}
        </button>
      ))}
    </div>
  ),
};

function renderPanel(
  over: Partial<Parameters<typeof SavedViewsPanelChrome>[0]> = {}
) {
  const handlers = {
    onApply: vi.fn(),
    onRename: vi.fn(),
    onMove: vi.fn(),
    onSetDefault: vi.fn(),
    onRemove: vi.fn(),
  };
  render(
    <SavedViewsPanelChrome
      views={VIEWS}
      slots={slots}
      {...handlers}
      {...over}
    />
  );
  return handlers;
}

/** The controls one row offers, in the order the chrome hands them over. */
const controlKeysOfRow = (index: number) =>
  Array.from(
    document
      .querySelectorAll('[data-adapttable-part="saved-view-row"]')
      [index]?.querySelectorAll("[data-control]") ?? []
  ).map((node) => node.getAttribute("data-control"));

describe("SavedViewsPanelChrome", () => {
  it("titles the card and lists every view", () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "Saved views" })
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-adapttable-part="saved-view-row"]')
    ).toHaveLength(2);
  });

  it("makes the view's own name the control that applies it", () => {
    const handlers = renderPanel();

    // The row's primary action is the widest target on it and carries the
    // view's name — not a sixth button competing with Delete for attention.
    const apply = screen.getByRole("button", { name: "Mine" });
    expect(apply).toHaveAttribute("title", "Apply view");
    fireEvent.click(apply);

    expect(handlers.onApply).toHaveBeenCalledWith("Mine");
  });

  it("marks the default view", () => {
    renderPanel();

    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("gives every row the same five controls, in the same order", () => {
    renderPanel();

    const order = ["rename", "moveUp", "moveDown", "default", "remove"];
    expect(controlKeysOfRow(0)).toEqual(order);
    expect(controlKeysOfRow(1)).toEqual(order);
  });

  it("disables the move controls at each end rather than dropping them", () => {
    renderPanel();

    // A control that vanishes on the last row makes every row jump as the list
    // is reordered, so the button stays and reports that it cannot run.
    expect(
      screen.getAllByRole("button", { name: "Move view up" })
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Move view up" })[0]
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: "Move view down" })[1]
    ).toBeDisabled();
  });

  it("reports the default control's own state", () => {
    renderPanel();

    const buttons = screen.getAllByRole("button", { name: "Set as default" });
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("reports move, default and delete", () => {
    const handlers = renderPanel();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Move view down" })[0]!
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Set as default" })[0]!
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Delete view" })[0]!);

    expect(handlers.onMove).toHaveBeenCalledWith("Mine", 1);
    expect(handlers.onSetDefault).toHaveBeenCalledWith("Mine");
    expect(handlers.onRemove).toHaveBeenCalledWith("Mine");
  });

  it("withholds every control on a view this reader does not own", () => {
    renderPanel({
      views: [{ name: "Shared", search: "t.q=c", readOnly: true }],
    });

    for (const button of screen.getAllByRole("button")) {
      if (button.hasAttribute("data-control")) expect(button).toBeDisabled();
    }
  });

  it("renames in place, seeded with the current name", () => {
    const handlers = renderPanel();

    fireEvent.click(screen.getAllByRole("button", { name: "Rename view" })[0]!);
    const input = screen.getByRole("textbox", { name: "View name" });
    expect(input).toHaveValue("Mine");

    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handlers.onRename).toHaveBeenCalledWith("Mine", "Renamed");
  });

  it("abandons a rename on Escape without changing anything", () => {
    const handlers = renderPanel();

    fireEvent.click(screen.getAllByRole("button", { name: "Rename view" })[0]!);
    const input = screen.getByRole("textbox", { name: "View name" });
    fireEvent.change(input, { target: { value: "Nope" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(handlers.onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("puts the host's note inside the card", () => {
    renderPanel({ footer: "Upgraded on load: Legacy view (v1)" });

    // Under the list and inside the surface — outside it the note reads as a
    // caption belonging to whatever comes next on the page.
    const panel = document.querySelector(
      '[data-adapttable-part="saved-views-panel"]'
    );
    expect(panel?.querySelector("footer")?.textContent).toBe(
      "Upgraded on load: Legacy view (v1)"
    );
  });

  it("hands every row the same layout", () => {
    const seen: Record<string, CSSProperties>[] = [];
    renderPanel({
      slots: {
        ...slots,
        Row: ({ name, layout, ...rest }) => {
          seen.push(layout);
          return <div {...rest}>{name}</div>;
        },
      },
    });

    // The row wraps and the cluster does not: a panel too narrow to hold the
    // name and the five icons on one line drops the whole cluster to the next
    // line intact, rather than breaking it into two ragged halves.
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
    const layout = seen[0]!;
    expect(layout.row).toMatchObject({ display: "flex", flexWrap: "wrap" });
    expect(layout.caption?.gap).toBeGreaterThan(0);
    expect(layout.controls).toMatchObject({ flex: "0 0 auto" });
    expect(layout.control).toMatchObject({ flex: "0 0 auto" });
  });

  it("says so when nothing has been saved", () => {
    renderPanel({ views: [] });

    expect(
      document.querySelectorAll('[data-adapttable-part="saved-view-row"]')
    ).toHaveLength(0);
    expect(screen.getAllByText("Saved views").length).toBeGreaterThan(1);
  });
});
