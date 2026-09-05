/**
 * The side panel, checked on the parts a kit would get wrong.
 *
 * Which panel is showing is trivial; the tab strip is not. A `tablist` has
 * a contract — one tab stop for the whole strip, arrows that wrap and carry
 * the selection with them, a body labelled by the tab that opened it — and
 * every one of those is invisible until someone navigates by keyboard.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  SidePanelChrome,
  SidePanelLayout,
  type SidePanelSlots,
} from "./SidePanelChrome";

const slots: SidePanelSlots = {
  Frame: ({ children, side, className }) => (
    <aside data-testid="frame" data-side={side} className={className}>
      {children}
    </aside>
  ),
  Tab: ({ panel, buttonProps }) => (
    <button {...buttonProps}>{panel.label}</button>
  ),
  Close: ({ label, onClose }) => (
    <button type="button" onClick={onClose}>
      {label}
    </button>
  ),
};

const PANELS = [
  { key: "filters", label: "Filters", content: <p>filter form</p> },
  { key: "columns", label: "Columns", content: <p>column list</p> },
  { key: "pivot", label: "Pivot", content: <p>pivot builder</p> },
];

/** The tab that currently holds the strip's only tab stop. */
function selectedTab(): HTMLElement {
  return screen
    .getAllByRole("tab")
    .find((tab) => tab.getAttribute("tabindex") === "0")!;
}

function setup(overrides?: Partial<Parameters<typeof SidePanelChrome>[0]>) {
  const onOpenPanel = vi.fn();
  const onClose = vi.fn();
  render(
    <SidePanelChrome
      panels={PANELS}
      openPanel="filters"
      onOpenPanel={onOpenPanel}
      onClose={onClose}
      slots={slots}
      {...overrides}
    />
  );
  return { onOpenPanel, onClose };
}

describe("SidePanelChrome", () => {
  it("renders nothing when there are no panels", () => {
    setup({ panels: [] });

    expect(screen.queryByTestId("frame")).toBeNull();
  });

  it("shows the open panel's content and no other", () => {
    setup();

    expect(screen.getByText("filter form")).toBeInTheDocument();
    expect(screen.queryByText("column list")).toBeNull();
  });

  it("gives the strip one tab stop, on the selected tab", () => {
    setup();

    expect(screen.getByRole("tab", { name: "Filters" })).toHaveAttribute(
      "tabindex",
      "0"
    );
    expect(screen.getByRole("tab", { name: "Columns" })).toHaveAttribute(
      "tabindex",
      "-1"
    );
  });

  it("labels the body with the tab that opened it", () => {
    setup();
    const body = screen.getByRole("tabpanel");

    expect(body).toHaveAttribute(
      "aria-labelledby",
      screen.getByRole("tab", { name: "Filters" }).id
    );
  });

  it("moves the selection with the arrow keys, wrapping at the ends", () => {
    const { onOpenPanel } = setup();
    fireEvent.keyDown(selectedTab(), { key: "ArrowRight" });

    expect(onOpenPanel).toHaveBeenCalledWith("columns");

    onOpenPanel.mockClear();
    fireEvent.keyDown(selectedTab(), { key: "ArrowLeft" });

    // Wraps to the last panel rather than stopping at the first.
    expect(onOpenPanel).toHaveBeenCalledWith("pivot");
  });

  it("jumps to the ends with Home and End", () => {
    const { onOpenPanel } = setup({ openPanel: "columns" });
    fireEvent.keyDown(selectedTab(), { key: "End" });

    expect(onOpenPanel).toHaveBeenCalledWith("pivot");

    onOpenPanel.mockClear();
    fireEvent.keyDown(selectedTab(), { key: "Home" });

    expect(onOpenPanel).toHaveBeenCalledWith("filters");
  });

  it("ignores keys that mean nothing to a tab strip", () => {
    const { onOpenPanel } = setup();
    fireEvent.keyDown(selectedTab(), { key: "a" });

    expect(onOpenPanel).not.toHaveBeenCalled();
  });

  it("closes on Escape from the tabs and from the body alike", () => {
    const { onClose } = setup();
    fireEvent.keyDown(selectedTab(), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByText("filter form"), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("opens a panel when its tab is clicked", () => {
    const { onOpenPanel } = setup();
    fireEvent.click(screen.getByRole("tab", { name: "Pivot" }));

    expect(onOpenPanel).toHaveBeenCalledWith("pivot");
  });

  it("closes from the close control", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("names itself when there is only one panel and no tabs to do it", () => {
    setup({ panels: [PANELS[0]!], openPanel: "filters" });

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByLabelText("Filters")).toBeInTheDocument();
  });

  it("falls back to the first panel when the open one is gone", () => {
    setup({ openPanel: "vanished" });

    expect(screen.getByText("filter form")).toBeInTheDocument();
  });

  it("docks to the end unless told otherwise, and takes the kit's class", () => {
    setup({ className: "kit-panel" });

    expect(screen.getByTestId("frame")).toHaveAttribute("data-side", "end");
    expect(screen.getByTestId("frame")).toHaveClass("kit-panel");
  });

  it("docks to the start when asked", () => {
    setup({ side: "start" });

    expect(screen.getByTestId("frame")).toHaveAttribute("data-side", "start");
  });

  it("uses the host's own words", () => {
    setup({ labels: { sidePanel: "Einstellungen", closePanel: "Schließen" } });

    expect(screen.getByRole("tablist")).toHaveAccessibleName("Einstellungen");
    expect(
      screen.getByRole("button", { name: "Schließen" })
    ).toBeInTheDocument();
  });

  it("keeps two tables on a page from sharing ids", () => {
    setup({ idPrefix: "second" });

    expect(screen.getByRole("tab", { name: "Filters" }).id).toBe(
      "second-tab-filters"
    );
  });
});

describe("SidePanelLayout", () => {
  it("adds no element at all when there is no panel", () => {
    const { container } = render(
      <SidePanelLayout body={<p data-testid="body">rows</p>} />
    );

    expect(screen.getByTestId("body")).toBeInTheDocument();
    expect(
      container.querySelector('[data-adapttable-part="table-region"]')
    ).toBeNull();
  });

  it("puts the two side by side once there is one", () => {
    const { container } = render(
      <SidePanelLayout body={<p>rows</p>} panel={<aside>panel</aside>} />
    );
    const region = container.querySelector(
      '[data-adapttable-part="table-region"]'
    );

    expect(region).not.toBeNull();
    // `min-width: 0` is what lets the table keep its own scrollbar rather
    // than forcing the row wider than its container.
    expect(
      container.querySelector<HTMLElement>(
        '[data-adapttable-part="table-region-main"]'
      )?.style.minWidth
    ).toBe("0px");
  });

  it("reverses the row to dock at the start", () => {
    const { container } = render(
      <SidePanelLayout
        body={<p>rows</p>}
        panel={<aside>p</aside>}
        side="start"
      />
    );

    expect(
      container.querySelector<HTMLElement>(
        '[data-adapttable-part="table-region"]'
      )?.style.flexDirection
    ).toBe("row-reverse");
  });
});
