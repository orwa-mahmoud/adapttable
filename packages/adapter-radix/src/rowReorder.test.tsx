import { Theme } from "@radix-ui/themes";
import {
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
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
  { id: "3", title: "Docs", team: "Web" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

function enable(onRowReorder?: (from: number, to: number, row: Task) => void) {
  return onRowReorder ? { features: [rowReorder(onRowReorder)] } : {};
}

function table(
  extra: {
    onRowReorder?: (from: number, to: number, row: Task) => void;
    forceMobile?: boolean;
    enableColumnMenu?: boolean;
  } = {}
) {
  const reorder = enable(extra.onRowReorder);
  return (
    <Theme>
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        {...reorder}
        forceMobile={extra.forceMobile}
        enableColumnMenu={extra.enableColumnMenu}
      />
    </Theme>
  );
}

describe("row reorder (radix)", () => {
  it("renders nothing until the feature is composed", () => {
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

  it("confirms grouped moves and restores focus after cancel or confirm", async () => {
    const onGroupMove = vi.fn();
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          groupBy="team"
          features={[
            rowReorder<Task>(vi.fn(), {
              movePolicy: "confirm",
              onGroupMove,
            }),
          ]}
        />
      </Theme>
    );
    const trigger = document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="row-move-menu-trigger"]'
    )[0]!;

    const selectWeb = async () => {
      fireEvent.pointerDown(trigger, { button: 0 });
      const menu = await screen.findByRole("menu", { name: /move to group/i });
      fireEvent.click(within(menu).getByRole("menuitem", { name: "Web" }));
      return screen.findByRole("alertdialog", {
        name: "Confirm row move",
      });
    };

    let confirmation = await selectWeb();
    // A real pointer presses before it clicks, and the dialog's buttons stop
    // that press reaching the row beneath them.
    const cancel = within(confirmation).getByRole("button", { name: "Cancel" });
    fireEvent.pointerDown(cancel);
    fireEvent.click(cancel);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onGroupMove).not.toHaveBeenCalled();

    confirmation = await selectWeb();
    const move = within(confirmation).getByRole("button", { name: "Move" });
    fireEvent.pointerDown(move);
    fireEvent.click(move);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onGroupMove).toHaveBeenCalledTimes(1);
    expect(onGroupMove.mock.calls[0]?.[0]).toBe(ROWS[0]);
  });

  it("keeps rejected destinations visible with their reason in RTL", async () => {
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          dir="rtl"
          groupBy="team"
          features={[rowReorder<Task>(vi.fn())]}
        />
      </Theme>
    );
    const trigger = document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="row-move-menu-trigger"]'
    )[0]!;
    fireEvent.pointerDown(trigger, { button: 0 });
    const menu = await screen.findByRole("menu", { name: /move to group/i });
    const item = within(menu).getByRole("menuitem", { name: /Web/ });
    expect(menu).toHaveAttribute("dir", "rtl");
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("Cross-boundary row moves are disabled");

    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("renders the destination menu on mobile cards", () => {
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile
          groupBy="team"
          features={[
            rowReorder<Task>(vi.fn(), {
              movePolicy: "auto",
              onGroupMove: vi.fn(),
            }),
          ]}
        />
      </Theme>
    );
    expect(part("row-reorder-handle")).toBeNull();
    expect(part("row-move-menu-trigger")).toBeInTheDocument();
  });

  it("lists the reorder column in the Columns menu", async () => {
    render(table({ onRowReorder: vi.fn(), enableColumnMenu: true }));
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));
    expect(
      await screen.findByRole("button", { name: "Hide column: Reorder row" })
    ).toBeInTheDocument();
  });
});
