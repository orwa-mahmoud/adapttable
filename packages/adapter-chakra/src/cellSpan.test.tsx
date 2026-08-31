import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";

interface Task {
  id: string;
  title: string;
  team: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", team: "Core" },
  { id: "2", title: "Test", team: "Core" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

const wrap = (node: React.ReactNode) => (
  <ChakraProvider value={defaultSystem}>{node}</ChakraProvider>
);

describe("cell spanning (chakra)", () => {
  it("is one cell per column until a span is asked for", () => {
    const { container } = render(
      wrap(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      )
    );
    const first = container.querySelector("tbody tr");
    expect(
      first?.querySelectorAll("td[data-adapttable-part='cell']")
    ).toHaveLength(2);
  });

  it("omits the covered cell and sets colSpan on the origin", () => {
    const { container } = render(
      wrap(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          getCellSpan={({ column, rowIndex }) =>
            column.key === "title" && rowIndex === 0
              ? { colSpan: 2 }
              : undefined
          }
        />
      )
    );
    const first = container.querySelector("tbody tr");
    const cells = first?.querySelectorAll("td[data-adapttable-part='cell']");
    expect(cells).toHaveLength(1);
    expect(cells?.[0]?.getAttribute("colspan")).toBe("2");
    expect(first?.textContent).toContain("Ship");
    expect(first?.textContent).not.toContain("Core");
  });
});
