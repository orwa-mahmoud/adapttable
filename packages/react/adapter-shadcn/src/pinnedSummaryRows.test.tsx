import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { pinnedSummaryRowsTests } from "../../react/test/kit/suites/pinnedSummaryRows";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { pinnedSummaryRows } from "./pinned-summary-rows";

for (const test of pinnedSummaryRowsTests(kit)) it(test.name, test.run);

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
const TOP = { id: "totals", title: "Team total", team: "All" };
const BOTTOM = { id: "grand", title: "Grand total", team: "All" };

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("pinned summary rows (shadcn)", () => {
  it("sets totals apart from the people rows", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[pinnedSummaryRows({ top: [TOP], bottom: [BOTTOM] })]}
      />
    );
    // The preset's variant targets cells inside each pinned summary section.
    for (const name of ["pinned-summary-top", "pinned-summary-bottom"]) {
      const cell = part(name)?.querySelector("td[data-column-key=title]");
      expect(cell?.className).toContain(
        `[[data-adapttable-part=${name}]_&]:font-semibold`
      );
      expect(cell?.closest(`[data-adapttable-part="${name}"]`)).not.toBeNull();
    }
  });
});
