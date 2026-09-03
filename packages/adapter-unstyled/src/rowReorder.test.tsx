import type { TableRowReorderState } from "@adapttable/core";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RowReorderHandle } from "./components/kitControls";
import { DataTable } from "./data-table.test-utils";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";

interface Task {
  id: string;
  title: string;
  team: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", team: "Core" },
  { id: "2", title: "Test", team: "Core" },
  { id: "3", title: "Docs", team: "Docs" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

/**
 * Row reorder is opt-in: omit `onRowReorder` and nothing renders. Pass it
 * and a grip appears; Space lifts, arrows move, Space drops.
 */

function enable(onRowReorder?: (from: number, to: number, row: Task) => void) {
  return onRowReorder ? { features: [rowReorder(onRowReorder)] } : {};
}

describe("row reorder (unstyled)", () => {
  it("renders nothing until the feature is composed", () => {
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
        {...enable(onRowReorder)}
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
        {...enable(vi.fn())}
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
        {...enable(onRowReorder)}
      />
    );
    expect(part("row-reorder-handle")).toBeNull();
    const down = part("row-reorder-down");
    expect(down).not.toBeNull();
    fireEvent.click(down!);
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("offers a keyboard menu and confirms a cross-group move", () => {
    const onGroupMove = vi.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="team"
        features={[
          grouping("team"),
          rowReorder<Task>(vi.fn(), {
            movePolicy: "confirm",
            onGroupMove,
          }),
        ]}
      />
    );

    const trigger = screen.getAllByLabelText("Move to group…", {
      selector: "[data-adapttable-part='row-move-menu-trigger']",
    })[0]!;
    fireEvent.click(trigger);
    const menu = trigger.closest("details")!;
    fireEvent.click(menu.querySelector<HTMLElement>('[role="menuitem"]')!);
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Confirm row move"
    );
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    expect(onGroupMove).toHaveBeenCalledOnce();
    expect(onGroupMove.mock.calls[0]?.[0]).toBe(ROWS[0]);
    expect(onGroupMove.mock.calls[0]?.[1]).toMatchObject({ label: "Core" });
    expect(onGroupMove.mock.calls[0]?.[2]).toMatchObject({ label: "Docs" });
    expect(trigger).toHaveFocus();
  });

  it("keeps the nested move menu available on mobile cards", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile
        groupBy="team"
        features={[
          grouping("team"),
          rowReorder<Task>(vi.fn(), {
            movePolicy: "never",
            onGroupMove: vi.fn(),
          }),
        ]}
      />
    );

    expect(screen.getAllByLabelText("Move to group…").length).toBeGreaterThan(
      0
    );
  });

  it("lists the reorder column in the Columns menu", async () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        enableColumnMenu
        {...enable(vi.fn())}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      await screen.findByRole("button", { name: "Hide column: Reorder row" })
    ).toBeInTheDocument();
  });
});

describe("row reorder host confirmation (unstyled handle)", () => {
  const LABELS = {
    reorderRow: "Reorder row",
    moveRowUp: "Move row up",
    moveRowDown: "Move row down",
    rowLifted: () => "",
    rowMoved: () => "",
    rowReorderCancelled: "",
    moveToGroup: "Move to group…",
  };

  it("makes the kit grip and menu inert while host confirmation is pending", () => {
    const reorder = {
      lifted: null,
      overIndex: null,
      overPosition: null,
      pendingMove: null,
      hostConfirmPending: true,
      announcement: "",
      isLifted: () => false,
      dragProps: () => ({
        draggable: true as const,
        onDragStart: () => undefined,
        onDragEnd: () => undefined,
      }),
      dropProps: () => ({
        onDragOver: () => undefined,
        onDrop: () => undefined,
      }),
      handleKeyDown: () => undefined,
      moveBy: () => undefined,
      moveMenu: () => ({
        kind: "group" as const,
        label: "Move to group…",
        targets: [{ id: "docs", label: "Docs" }],
      }),
      selectMoveTarget: () => undefined,
      confirmMove: () => undefined,
      cancelMove: () => undefined,
      rowAttrs: () => ({}),
    } as unknown as TableRowReorderState<Task>;
    render(
      <RowReorderHandle
        reorder={reorder}
        labels={LABELS}
        rowId="1"
        localIndex={0}
        row={ROWS[0]!}
        windowStart={0}
        rowCount={2}
      />
    );
    expect(screen.getByRole("button", { name: "Reorder row" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Docs" })).toBeDisabled();
  });
});
