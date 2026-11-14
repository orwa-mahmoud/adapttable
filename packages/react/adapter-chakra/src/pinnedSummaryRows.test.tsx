import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
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

function renderTable(ui: ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}

describe("pinned summary rows (chakra)", () => {
  it("sets totals apart from the people rows", () => {
    renderTable(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[pinnedSummaryRows({ top: [TOP], bottom: [BOTTOM] })]}
      />
    );
    const weight = (cell: Element | null | undefined) =>
      cell ? getComputedStyle(cell).fontWeight : undefined;
    for (const name of ["pinned-summary-top", "pinned-summary-bottom"]) {
      expect(
        weight(part(name)?.querySelector("td[data-column-key=title]"))
      ).toBe("600");
    }
    expect(weight(screen.getByText("Ship").closest("td"))).not.toBe("600");
  });
});
