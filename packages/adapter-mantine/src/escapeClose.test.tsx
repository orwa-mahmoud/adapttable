import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderMantine } from "./test-utils";

/**
 * Mantine's Popover dismiss only reacts to Escape once focus is inside the
 * dropdown. The Columns and Saved-views menus leave focus on their trigger,
 * so both need `useEscapeClose` — every other adapter's kit closes them.
 */
interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [{ id: "a", name: "Alice" }];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

function mount() {
  renderMantine(
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      urlSync={false}
      enableColumnMenu
      savedViews={{ storageKey: "escape-close" }}
    />
  );
}

async function expectEscapeCloses(triggerName: string) {
  const trigger = screen.getByRole("button", { name: triggerName });
  fireEvent.click(trigger);
  await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
  // From the trigger, where focus actually sits — not from inside the panel.
  fireEvent.keyDown(document.body, { key: "Escape" });
  await waitFor(() =>
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  );
}

describe("Escape closes the toolbar menus (Mantine)", () => {
  it("closes the column menu", async () => {
    mount();
    await expectEscapeCloses("Columns");
  });

  it("closes the saved-views menu", async () => {
    mount();
    await expectEscapeCloses("Saved views");
  });
});
