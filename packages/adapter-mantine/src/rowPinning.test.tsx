import type { RowPinState } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
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

function table(
  extra: {
    pinnedRowIds?: RowPinState;
    onPinnedRowIdsChange?: (next: RowPinState) => void;
    forceMobile?: boolean;
  } = {}
) {
  return (
    <MantineProvider>
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        pinnedRowIds={extra.pinnedRowIds}
        onPinnedRowIdsChange={extra.onPinnedRowIdsChange}
        forceMobile={extra.forceMobile}
      />
    </MantineProvider>
  );
}

describe("row pinning (mantine)", () => {
  it("renders nothing until pinning is armed", () => {
    render(table());
    expect(screen.queryByRole("button", { name: "Pin to top" })).toBeNull();
    expect(part("pinned-top")).toBeNull();
  });

  it("pins a row to the top section and removes it from the scroll body", () => {
    const onPinnedRowIdsChange = vi.fn();
    render(
      table({
        pinnedRowIds: { top: [], bottom: [] },
        onPinnedRowIdsChange,
      })
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Pin to top" })[0]!);
    expect(onPinnedRowIdsChange).toHaveBeenCalledExactlyOnceWith({
      top: ["1"],
      bottom: [],
    });
  });

  it("renders a controlled top pin in the body", () => {
    render(
      table({
        pinnedRowIds: { top: ["1"], bottom: ["3"] },
        onPinnedRowIdsChange: vi.fn(),
      })
    );
    expect(part("pinned-top")?.textContent).toContain("Ship");
    expect(part("pinned-bottom")?.textContent).toContain("Docs");
    expect(part("tbody")?.textContent).toContain("Test");
    expect(part("pinned-top")).toHaveAttribute("data-row-pin", "top");
    expect(part("pinned-bottom")).toHaveAttribute("data-row-pin", "bottom");
  });

  it("offers pin actions on cards with no sticky chrome", () => {
    const onPinnedRowIdsChange = vi.fn();
    render(table({ forceMobile: true, onPinnedRowIdsChange }));
    expect(part("pinned-top")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Pin to top" })[0]!);
    expect(onPinnedRowIdsChange).toHaveBeenCalled();
  });
});
