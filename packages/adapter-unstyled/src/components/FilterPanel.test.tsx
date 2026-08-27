import { defaultLabels } from "@adapttable/core";
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
