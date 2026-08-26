import { defaultLabels } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FilterPopover } from "./FilterPopover";

function renderPopover(props?: Partial<Parameters<typeof FilterPopover>[0]>) {
  const onClose = props?.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <FilterPopover
        open
        onClose={onClose}
        filters={<div>filter body</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        classNames={{}}
        {...props}
      >
        <button type="button">Filters</button>
      </FilterPopover>
    ),
  };
}

describe("FilterPopover", () => {
  function stubTrigger(rect: {
    left: number;
    right: number;
    top?: number;
    bottom?: number;
  }) {
    const root = document.querySelector<HTMLElement>(
      '[data-adapttable-part="filters-anchor"]'
    )!;
    const top = rect.top ?? 10;
    const bottom = rect.bottom ?? 40;
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
      left: rect.left,
      right: rect.right,
      top,
      bottom,
      width: rect.right - rect.left,
      height: bottom - top,
      x: rect.left,
      y: top,
      toJSON: () => ({}),
    });
  }

  it("anchors to the inline-end edge in LTR", () => {
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      1280
    );
    renderPopover({ dir: "ltr" });
    stubTrigger({ left: 520, right: 900 });
    fireEvent.resize(window);
    const card = document.querySelector(
      '[data-adapttable-part="filters-popover"]'
    )!;
    expect(card.parentElement).toBe(document.body);
    expect(card).toHaveStyle({ position: "fixed", left: "520px" });
  });

  it("anchors to the inline-start edge in RTL", () => {
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      1280
    );
    renderPopover({ dir: "rtl" });
    stubTrigger({ left: 100, right: 240 });
    fireEvent.resize(window);
    const card = document.querySelector(
      '[data-adapttable-part="filters-popover"]'
    )!;
    expect(card).toHaveStyle({ left: "100px" });
    expect(card).toHaveAttribute("data-dir", "rtl");
    expect(card).toHaveAttribute("dir", "rtl");
  });

  it("does not render the card when closed", () => {
    renderPopover({ open: false });
    expect(
      document.querySelector('[data-adapttable-part="filters-popover"]')
    ).toBeNull();
  });

  it("never renders a full-screen backdrop in popover mode", () => {
    renderPopover();
    expect(
      document.querySelector('[data-adapttable-part="filters-backdrop"]')
    ).toBeNull();
    // Portalled + fixed so sticky thead cannot cover it — not a scrim:
    // it does not claim the viewport.
    const card = document.querySelector<HTMLElement>(
      '[data-adapttable-part="filters-popover"]'
    )!;
    expect(card).toHaveStyle({ position: "fixed" });
    expect(card.style.inset).not.toBe("0px");
    expect(card.style.width).not.toBe("100%");
    expect(card.parentElement).toBe(document.body);
  });

  it("disables Clear all when no filters are active", () => {
    renderPopover({ activeFilterCount: 0 });
    expect(screen.getByRole("button", { name: "Clear all" })).toBeDisabled();
  });

  it("invokes onClearFilters from Clear all when filters are active", () => {
    const onClearFilters = vi.fn();
    renderPopover({ activeFilterCount: 2, onClearFilters });
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("tolerates Clear all with no handler wired", () => {
    renderPopover({ activeFilterCount: 1 });
    const clear = screen.getByRole("button", { name: "Clear all" });
    expect(() => fireEvent.click(clear)).not.toThrow();
  });

  it("closes on Escape but ignores other keys", () => {
    const { onClose } = renderPopover();
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on an outside click but stays open for inside clicks", () => {
    const { onClose } = renderPopover();
    // Click inside the popover card — must NOT close.
    fireEvent.click(
      document.querySelector('[data-adapttable-part="filters-popover"]')!
    );
    expect(onClose).not.toHaveBeenCalled();
    // Click on the anchored trigger — still inside the anchor, must NOT close.
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(onClose).not.toHaveBeenCalled();
    // Click on the document body (outside) — closes.
    fireEvent.click(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when the clicked control unmounts mid-click", () => {
    function SelfReplace() {
      const [gone, setGone] = useState(false);
      if (gone) return <span>replaced</span>;
      return (
        <button type="button" onClick={() => setGone(true)}>
          Add condition
        </button>
      );
    }
    const { onClose } = renderPopover({ filters: <SelfReplace /> });
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    expect(screen.getByText("replaced")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open while a control inside it holds focus (native picker popups)", () => {
    const { onClose } = renderPopover({
      filters: (
        <select data-testid="op" aria-label="Operator">
          <option value="">-</option>
        </select>
      ),
    });
    // A native <select>/date/number popup keeps focus on the control inside the
    // popover while dispatching a document-level click outside the popover DOM.
    screen.getByTestId("op").focus();
    fireEvent.click(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the active-filter count beside the title", () => {
    renderPopover({ activeFilterCount: 3 });
    expect(
      document.querySelector('[data-adapttable-part="filters-title"]')
    ).toHaveTextContent("(3)");
  });

  describe("viewport collision", () => {
    // jsdom has no layout engine, so the card's geometry is stubbed to mirror
    // what a real 390px phone reports: a 320px card anchored under a trigger
    // near the right edge lands at left: -173 (measured on the live demo).
    function stubCardRect(rect: { left: number; right: number }) {
      const card = document.querySelector<HTMLDivElement>(
        '[data-adapttable-part="filters-popover"]'
      )!;
      vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
        ...rect,
        width: rect.right - rect.left,
        height: 400,
        top: 0,
        bottom: 400,
        x: rect.left,
        y: 0,
        toJSON: () => ({}),
      });
      return card;
    }

    it("shifts a card that overflows the left edge back into the viewport", () => {
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
        390
      );
      renderPopover({ dir: "ltr" });
      const card = stubCardRect({ left: -173, right: 147 });
      // Re-open so the effect measures the stubbed geometry.
      fireEvent.resize(window);
      // -173 → needs +181 to clear the 8px gutter.
      expect(card.style.transform).toBe("translateX(181px)");
    });

    it("shifts a card that overflows the right edge back into the viewport", () => {
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
        390
      );
      renderPopover({ dir: "rtl" });
      const card = stubCardRect({ left: 150, right: 470 });
      fireEvent.resize(window);
      // 470 → needs -88 to clear the 8px gutter.
      expect(card.style.transform).toBe("translateX(-88px)");
    });

    it("leaves a card that already fits untouched", () => {
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
        1280
      );
      renderPopover({ dir: "ltr" });
      const card = stubCardRect({ left: 900, right: 1220 });
      fireEvent.resize(window);
      expect(card.style.transform).toBe("");
    });

    it("caps the card width so it can never exceed the viewport", () => {
      renderPopover();
      const card = document.querySelector<HTMLElement>(
        '[data-adapttable-part="filters-popover"]'
      )!;
      expect(card.style.maxWidth).toBe("calc(100vw - 16px)");
    });
  });
});
