import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";

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

function enable(
  path: "prop" | "feature",
  onRowReorder?: (from: number, to: number, row: Task) => void
) {
  if (!onRowReorder) return {};
  return path === "feature"
    ? { features: [rowReorder(onRowReorder)] }
    : { onRowReorder };
}

describe.each(["prop", "feature"] as const)(
  "row reorder via %s (mui)",
  (path) => {
    it("renders nothing until onRowReorder is set", () => {
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      );
      expect(part("row-reorder-handle")).toBeNull();
    });

    it("lifts on Space and commits on the second Space", () => {
      const onRowReorder = vi.fn();
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...enable(path, onRowReorder)}
        />
      );
      const grip = part("row-reorder-handle");
      expect(grip).not.toBeNull();
      fireEvent.keyDown(grip!, { key: " " });
      expect(grip).toHaveAttribute("aria-pressed", "true");
      fireEvent.keyDown(grip!, { key: "ArrowDown" });
      fireEvent.keyDown(grip!, { key: " " });
      expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
    });

    it("prevents default on a neighbour's dragover after a pointer lift", () => {
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...enable(path, vi.fn())}
        />
      );
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
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile
          {...enable(path, onRowReorder)}
        />
      );
      expect(part("row-reorder-handle")).toBeNull();
      fireEvent.click(part("row-reorder-down")!);
      expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
    });

    it("lists the reorder column in the Columns menu", async () => {
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          enableColumnMenu
          {...enable(path, vi.fn())}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "Columns" }));
      expect(
        await screen.findByRole("button", { name: "Hide column: Reorder row" })
      ).toBeInTheDocument();
    });
  }
);
