/**
 * Row actions collapsed into their own menu.
 *
 * The inline strip and the overflow menu are separate components in every
 * kit, so a kit can pass the strip's tests while its menu never runs an
 * action, never states why one is unavailable, and never keeps the click off
 * the row underneath.
 */
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderMui as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

interface Options {
  readonly onEdit?: () => void;
  readonly onRowClick?: () => void;
  readonly blockDelete?: boolean;
}

function table({ onEdit, onRowClick, blockDelete }: Options = {}): void {
  renderKit(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      onRowClick={onRowClick}
      rowActionsLayout="menu"
      rowActions={[
        { key: "edit", label: "Edit", onClick: onEdit ?? (() => undefined) },
        {
          key: "delete",
          label: "Delete",
          onClick: () => undefined,
          disabledReason: () =>
            blockDelete === true
              ? "Archived rows cannot be deleted"
              : undefined,
        },
      ]}
    />
  );
}

async function openActions(): Promise<void> {
  const trigger = part("row-actions-trigger");
  expect(trigger).not.toBeNull();
  fireEvent.pointerDown(trigger!, { button: 0 });
  fireEvent.click(trigger!);
  await screen.findByText("Edit");
}

describe("row actions menu (mui)", () => {
  it("names itself and runs the action it was opened for", async () => {
    const onEdit = vi.fn();
    table({ onEdit });
    expect(part("row-actions-trigger")).toHaveAccessibleName("Row actions");
    await openActions();
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("says why an action is unavailable instead of hiding it", async () => {
    table({ blockDelete: true });
    await openActions();
    const entry = screen.getByText("Delete").closest("[title]");
    expect(entry).toHaveAttribute("title", "Archived rows cannot be deleted");
  });

  it("keeps the row's own click handler out of it", async () => {
    const onRowClick = vi.fn();
    const onEdit = vi.fn();
    table({ onEdit, onRowClick });
    await openActions();
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
