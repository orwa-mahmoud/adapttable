import { Theme } from "@radix-ui/themes";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
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
    onRowReorder?: (from: number, to: number, row: Task) => void;
    forceMobile?: boolean;
    enableColumnMenu?: boolean;
  } = {}
) {
  return (
    <Theme>
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        onRowReorder={extra.onRowReorder}
        forceMobile={extra.forceMobile}
        enableColumnMenu={extra.enableColumnMenu}
      />
    </Theme>
  );
}

describe("row reorder (radix)", () => {
  it("renders nothing until onRowReorder is set", () => {
    render(table());
    expect(part("row-reorder-handle")).toBeNull();
  });

  it("lifts on Space and commits on the second Space", () => {
    const onRowReorder = vi.fn();
    render(table({ onRowReorder }));
    const grip = part("row-reorder-handle");
    expect(grip).not.toBeNull();
    fireEvent.keyDown(grip!, { key: " " });
    expect(grip).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(grip!, { key: "ArrowDown" });
    fireEvent.keyDown(grip!, { key: " " });
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("prevents default on a neighbour's dragover after a pointer lift", () => {
    render(table({ onRowReorder: vi.fn() }));
    const grip = part("row-reorder-handle");
    expect(grip).not.toBeNull();
    const store: Record<string, string> = {};
    const dataTransfer = {
      dropEffect: "none",
      effectAllowed: "all",
      setData: (type: string, value: string) => {
        store[type] = value;
      },
      getData: (type: string) => store[type] ?? "",
    };
    fireEvent.dragStart(grip!, { dataTransfer });
    const neighbour = document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="row"]'
    )[1];
    expect(neighbour).toBeTruthy();
    const over = createEvent.dragOver(neighbour!, { dataTransfer });
    fireEvent(neighbour!, over);
    expect(over.defaultPrevented).toBe(true);
  });

  it("moves a card with the up/down buttons", () => {
    const onRowReorder = vi.fn();
    render(table({ onRowReorder, forceMobile: true }));
    expect(part("row-reorder-handle")).toBeNull();
    fireEvent.click(part("row-reorder-down")!);
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("lists the reorder column in the Columns menu", async () => {
    render(table({ onRowReorder: vi.fn(), enableColumnMenu: true }));
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      await screen.findByRole("button", { name: "Hide column: Reorder row" })
    ).toBeInTheDocument();
  });
});
