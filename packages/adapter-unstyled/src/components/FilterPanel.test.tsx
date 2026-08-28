import { defaultLabels } from "@adapttable/core";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterPanel } from "./FilterPanel";

describe("FilterPanel", () => {
  it("places the drawer on the left in RTL mode", () => {
    render(
      <FilterPanel
        open
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        dir="rtl"
        classNames={{ filtersPanel: "panel-rtl" }}
      />
    );
    // The drawer PORTALS to <body> (transformed ancestors must not become
    // its containing block), so query the document, not the container.
    expect(document.querySelector('[data-dir="rtl"]')).toBeTruthy();
  });

  it("invokes onClearFilters from the clear button when filters are active", () => {
    const onClearFilters = vi.fn();
    const { getByRole } = render(
      <FilterPanel
        open
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={2}
        onClearFilters={onClearFilters}
        labels={defaultLabels}
        classNames={{}}
      />
    );
    fireEvent.click(getByRole("button", { name: "Clear all" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <FilterPanel
        open
        onClose={onClose}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        classNames={{}}
      />
    );
    fireEvent.click(
      document.querySelector('[data-adapttable-part="filters-backdrop"]')!
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("wraps Shift+Tab from the dialog itself back to the last control", () => {
    render(
      <FilterPanel
        open
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        classNames={{}}
      />
    );
    const panel = document.querySelector<HTMLElement>(
      '[data-adapttable-part="filters-panel"]'
    )!;
    act(() => panel.focus());
    fireEvent.keyDown(panel, { key: "Tab", shiftKey: true });
    const last = document.querySelector(
      '[data-adapttable-part="filters-done"]'
    );
    expect(document.activeElement).toBe(last);
  });

  it("pulls Tab back inside when focus has left the drawer", () => {
    render(
      <FilterPanel
        open
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        classNames={{}}
      />
    );
    const stray = document.createElement("button");
    stray.textContent = "outside";
    document.body.appendChild(stray);
    act(() => stray.focus());
    fireEvent.keyDown(document, { key: "Tab" });
    const first = document.querySelector(
      '[data-adapttable-part="filters-close"]'
    );
    expect(document.activeElement).toBe(first);
    stray.remove();
  });
});

/**
 * The drawer's motion. A side sheet that appears and disappears reads as a
 * glitch rather than a panel, so both edges animate — and the exit is the one
 * that needs proving, because it means the node outlives `open`.
 */
describe("FilterPanel motion", () => {
  /** Stub `matchMedia` so the reduced-motion preference can be set per test. */
  function stubMotion(prefersReduced: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: prefersReduced,
        media: "",
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }))
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const panel = () =>
    document.querySelector<HTMLElement>(
      '[data-adapttable-part="filters-panel"]'
    );

  function renderPanel(props: { open: boolean; dir?: "ltr" | "rtl" }) {
    return render(
      <FilterPanel
        open={props.open}
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        dir={props.dir}
        classNames={{}}
      />
    );
  }

  it("slides out before it leaves, then removes itself", async () => {
    stubMotion(false);
    const { rerender } = renderPanel({ open: true });
    await waitFor(() => expect(panel()).toHaveAttribute("data-state", "open"));
    expect(panel()!.style.transform).toBe("translateX(0)");

    rerender(
      <FilterPanel
        open={false}
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        classNames={{}}
      />
    );

    // Still painted, already off-screen-bound, and no longer a dialog.
    const leaving = panel()!;
    expect(leaving).toHaveAttribute("data-state", "closed");
    expect(leaving.style.transform).toBe("translateX(100%)");
    expect(leaving).toHaveAttribute("inert");

    await waitFor(() => expect(panel()).toBeNull());
  });

  it("arrives from and leaves toward the inline-end edge in RTL", async () => {
    stubMotion(false);
    const { rerender } = renderPanel({ open: true, dir: "rtl" });
    // In RTL the panel is pinned to the left, so the edge it travels from is
    // the left one — mirrored, not the same slide with Arabic labels.
    expect(panel()!.style.transform).toBe("translateX(-100%)");
    await waitFor(() => expect(panel()!.style.transform).toBe("translateX(0)"));

    rerender(
      <FilterPanel
        open={false}
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        dir="rtl"
        classNames={{}}
      />
    );
    expect(panel()!.style.transform).toBe("translateX(-100%)");
  });

  it("under reduced motion nothing travels and nothing lingers", () => {
    stubMotion(true);
    const { rerender } = renderPanel({ open: true });
    // No frame delay: the panel is where it belongs on the first paint.
    expect(panel()!.style.transform).toBe("translateX(0)");

    rerender(
      <FilterPanel
        open={false}
        onClose={vi.fn()}
        filters={<div>filters</div>}
        activeFilterCount={0}
        labels={defaultLabels}
        classNames={{}}
      />
    );
    // Gone on the same tick — no node left waiting for an animation that was
    // never going to run.
    expect(panel()).toBeNull();
  });
});
