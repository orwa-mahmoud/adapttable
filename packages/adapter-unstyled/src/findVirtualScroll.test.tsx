import { createMemoryAdapter } from "@adapttable/react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { findInTable } from "./find-in-table";
import type { ColumnDef } from "./index";
import { virtualize } from "./virtualize";

interface Row {
  id: string;
  name: string;
}
const NEEDLES = new Set([60, 9500]);
const ROWS: Row[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: String(i),
  name: NEEDLES.has(i) ? `Needle ${i}` : `Person ${i}`,
}));
const COLS: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];

/**
 * jsdom has no layout, so the page never scrolls on its own: `scrollTo` moves
 * `scrollY` and fires the scroll event the window virtualizer listens for,
 * which is what a browser does.
 */
const originalScrollTo = window.scrollTo;
beforeEach(() => {
  window.scrollTo = vi.fn((options?: ScrollToOptions | number) => {
    const top = typeof options === "number" ? 0 : (options?.top ?? 0);
    Object.defineProperty(window, "scrollY", {
      value: top,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
  }) as typeof window.scrollTo;
});
afterEach(() => {
  window.scrollTo = originalScrollTo;
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

const currentMatch = () =>
  document.querySelector<HTMLElement>("[data-cell-match-current]");
const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("find in a virtualized table (unstyled)", () => {
  it("brings a match outside the window into it, and the next one too", async () => {
    render(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("find=Needle")}
        paginationMode="infinite"
        features={[virtualize(), findInTable()]}
      />
    );
    // Row 9500 is far outside the first window.
    expect(document.body.textContent).not.toContain("Needle 9500");

    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(currentMatch()).toHaveTextContent("Needle 60");

    fireEvent.keyDown(part("find-input")!, { key: "Enter" });
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(window.scrollTo).toHaveBeenCalled();
    expect(currentMatch()).toHaveTextContent("Needle 9500");
  });
});
