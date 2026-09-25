/**
 * The menu's structure, and the one ordering rule it owns.
 *
 * Focus, portalling and outside-click belong to each kit's own menu
 * primitive, so there is nothing here to test about them. What core decides
 * is what appears, in what order, with dividers where the model asked for
 * them — and that a menu closes BEFORE its entry runs, which an entry that
 * opens a dialog or moves focus depends on.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContextMenuChrome, type ContextMenuSlots } from "./ContextMenuChrome";

const slots: ContextMenuSlots = {
  Surface: ({ at, label, children, className, anchorRef }) => (
    <div
      role="menu"
      aria-label={label}
      className={className}
      data-testid="menu"
      data-at={`${String(at.x)},${String(at.y)}`}
      data-anchored={anchorRef.current ? "yes" : "no"}
    >
      {children}
    </div>
  ),
  Item: ({ item, onSelect }) => (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      data-danger={item.danger === true ? "" : undefined}
      onClick={onSelect}
    >
      {item.label}
    </button>
  ),
  Separator: () => <hr data-testid="sep" />,
};

const ITEMS = [
  { key: "copy", label: "Copy", onSelect: vi.fn() },
  { key: "cut", label: "Cut", onSelect: vi.fn() },
  { key: "audit", label: "Audit", separatorBefore: true, onSelect: vi.fn() },
];

describe("ContextMenuChrome", () => {
  it("renders nothing when it is closed", () => {
    render(
      <ContextMenuChrome
        items={ITEMS}
        at={null}
        onClose={vi.fn()}
        slots={slots}
      />
    );

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("renders nothing when there is nothing to offer", () => {
    render(
      <ContextMenuChrome
        items={[]}
        at={{ x: 1, y: 2 }}
        onClose={vi.fn()}
        slots={slots}
      />
    );

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lists the entries in order, at the point it was opened", () => {
    render(
      <ContextMenuChrome
        items={ITEMS}
        at={{ x: 40, y: 90 }}
        onClose={vi.fn()}
        slots={slots}
      />
    );

    expect(screen.getByTestId("menu")).toHaveAttribute("data-at", "40,90");
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual(
      ["Copy", "Cut", "Audit"]
    );
  });

  it("draws a divider only where the model asked for one", () => {
    render(
      <ContextMenuChrome
        items={ITEMS}
        at={{ x: 1, y: 1 }}
        onClose={vi.fn()}
        slots={slots}
      />
    );

    expect(screen.getAllByTestId("sep")).toHaveLength(1);
  });

  it("puts nothing between the menu and its items", () => {
    render(
      <ContextMenuChrome
        items={ITEMS}
        at={{ x: 1, y: 1 }}
        onClose={vi.fn()}
        slots={slots}
      />
    );
    const menu = screen.getByRole("menu");

    // Every child is an entry or a divider — a wrapper here would break
    // the keyboard navigation each kit's menu implements over it.
    for (const child of menu.children) {
      expect(["BUTTON", "HR"]).toContain(child.tagName);
    }
  });

  it("closes before the entry runs", () => {
    const order: string[] = [];
    const onClose = vi.fn(() => order.push("close"));
    render(
      <ContextMenuChrome
        items={[
          {
            key: "go",
            label: "Go",
            onSelect: () => order.push("select"),
          },
        ]}
        at={{ x: 1, y: 1 }}
        onClose={onClose}
        slots={slots}
      />
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Go" }));

    expect(order).toEqual(["close", "select"]);
  });

  it("names the menu, in the host's words when it has them", () => {
    const { rerender } = render(
      <ContextMenuChrome
        items={ITEMS}
        at={{ x: 1, y: 1 }}
        onClose={vi.fn()}
        slots={slots}
      />
    );

    expect(screen.getByRole("menu")).toHaveAccessibleName("Table actions");

    rerender(
      <ContextMenuChrome
        items={ITEMS}
        at={{ x: 1, y: 1 }}
        onClose={vi.fn()}
        labels={{ contextMenu: "Tabellenaktionen" }}
        className="kit-menu"
        slots={slots}
      />
    );

    expect(screen.getByRole("menu")).toHaveAccessibleName("Tabellenaktionen");
    expect(screen.getByRole("menu")).toHaveClass("kit-menu");
  });

  it("passes an entry's own flags to the kit", () => {
    render(
      <ContextMenuChrome
        items={[
          { key: "d", label: "Delete", danger: true, onSelect: vi.fn() },
          { key: "x", label: "Locked", disabled: true, onSelect: vi.fn() },
        ]}
        at={{ x: 1, y: 1 }}
        onClose={vi.fn()}
        slots={slots}
      />
    );

    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
      "data-danger"
    );
    expect(screen.getByRole("menuitem", { name: "Locked" })).toBeDisabled();
  });

  it("puts a zero-size anchor at the point the kit's menu can attach to", () => {
    render(
      <ContextMenuChrome
        items={ITEMS}
        at={{ x: 40, y: 90 }}
        onClose={vi.fn()}
        slots={slots}
      />
    );
    const anchor = document.querySelector<HTMLElement>(
      '[data-adapttable-part="context-menu-anchor"]'
    );

    // Every kit's menu positions against an element, not coordinates; a
    // right-click has coordinates and no element, so core supplies one.
    expect(anchor).not.toBeNull();
    expect(anchor?.style.position).toBe("fixed");
    expect(anchor?.style.left).toBe("40px");
    expect(anchor?.style.top).toBe("90px");
    // It must never be able to take a click meant for the row beneath it.
    expect(anchor?.style.pointerEvents).toBe("none");
  });

  it("has no anchor when there is no menu", () => {
    render(
      <ContextMenuChrome
        items={ITEMS}
        at={null}
        onClose={vi.fn()}
        slots={slots}
      />
    );

    expect(
      document.querySelector('[data-adapttable-part="context-menu-anchor"]')
    ).toBeNull();
  });
});
