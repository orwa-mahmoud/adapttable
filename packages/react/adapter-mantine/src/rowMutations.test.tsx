import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { rowMutationsTests } from "../../react/test/kit/suites/rowMutations";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

for (const test of rowMutationsTests(kit)) it(test.name, test.run);

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship" },
  { id: "2", title: "Test" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
];

it("draws a row's duplicate action as Mantine's icon, named by its label", () => {
  kit.render(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      onDuplicateRow={vi.fn()}
    />
  );
  const action = screen.getAllByRole("button", { name: /duplicate row/i })[0]!;
  expect(action.querySelector("svg")).not.toBeNull();
  expect(action.textContent?.trim()).toBe("");
});
