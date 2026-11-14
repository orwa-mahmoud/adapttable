import { Theme } from "@radix-ui/themes";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { rowEditingTests } from "../../react/test/kit/suites/rowEditing";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

for (const test of rowEditingTests(kit)) it(test.name, test.run);

interface Task {
  id: string;
  title: string;
  points: number;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", points: 3 },
  { id: "2", title: "Test", points: 5 },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title, editable: true },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("row-mode control presentation (radix)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          rowEditing
          onRowEdit={vi.fn()}
          {...extra}
        />
      </Theme>
    );

  it("draws the kit's own glyph, named by its label", () => {
    table();
    const begin = part("row-edit-begin")!;

    expect(begin.querySelector("svg")).not.toBeNull();
    expect(begin).toHaveAccessibleName("Edit row");
    expect(begin).toHaveAttribute("title", "Edit row");
  });

  it("shows the label as text when the host asks for it", () => {
    table({ rowEditIcons: { begin: false } });
    const begin = part("row-edit-begin")!;

    expect(begin.querySelector("svg")).toBeNull();
    expect(begin).toHaveTextContent("Edit row");
  });

  it("takes the host's own glyph in place of its own", () => {
    table({ rowEditIcons: { begin: <span data-testid="host-glyph" /> } });

    expect(screen.getAllByTestId("host-glyph").length).toBeGreaterThan(0);
  });
});
