import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship" },
  { id: "2", title: "Test" },
  { id: "3", title: "Docs" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("row pinning (antd)", () => {
  it("renders nothing until pinning is armed", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    expect(screen.queryByRole("button", { name: "Pin to top" })).toBeNull();
    expect(part("pinned-top")).toBeNull();
  });

  it("pins a row to the top section and removes it from the scroll body", () => {
    const onPinnedRowIdsChange = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        pinnedRowIds={{ top: [], bottom: [] }}
        onPinnedRowIdsChange={onPinnedRowIdsChange}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Pin to top" })[0]!);
    expect(onPinnedRowIdsChange).toHaveBeenCalledExactlyOnceWith({
      top: ["1"],
      bottom: [],
    });
  });

  it("renders a controlled top pin on the pinned row itself", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        pinnedRowIds={{ top: ["1"], bottom: ["3"] }}
        onPinnedRowIdsChange={vi.fn()}
      />
    );
    // antd owns a single tbody, so the section marker lives on the row.
    expect(part("pinned-top")?.textContent).toContain("Ship");
    expect(part("pinned-bottom")?.textContent).toContain("Docs");
    expect(part("pinned-top")).toHaveAttribute("data-row-pin", "top");
    expect(part("pinned-bottom")).toHaveAttribute("data-row-pin", "bottom");
  });

  it("paints every cell of a pinned row so scrolled rows cannot show through", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        pinnedRowIds={{ top: ["1"], bottom: ["3"] }}
        onPinnedRowIdsChange={vi.fn()}
      />
    );
    // jsdom resolves no var() colours, so this checks the rule and its reach.
    const rule = [...part("root")!.querySelectorAll("style")]
      .map((style) => style.textContent ?? "")
      .find((text) => text.includes("tr[data-row-pin] > td"));
    expect(rule).toContain("background:var(--ant-color-bg-container");
    const selector = rule!.slice(0, rule!.indexOf("{"));
    for (const name of ["pinned-top", "pinned-bottom"]) {
      const cells = [...part(name)!.querySelectorAll("td")];
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) expect(cell.matches(selector)).toBe(true);
    }
    const scrolling = part("tbody")!.querySelector(
      "tr.ant-table-row:not([data-row-pin]) td"
    )!;
    expect(scrolling.matches(selector)).toBe(false);
  });

  it("offers pin actions on cards with no sticky chrome", () => {
    const onPinnedRowIdsChange = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile
        onPinnedRowIdsChange={onPinnedRowIdsChange}
      />
    );
    expect(part("pinned-top")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Pin to top" })[0]!);
    expect(onPinnedRowIdsChange).toHaveBeenCalled();
  });
});
