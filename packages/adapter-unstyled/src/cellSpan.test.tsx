import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
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

describe("cell spanning (unstyled)", () => {
  it("is one cell per column until a span is asked for", () => {
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    const first = container.querySelector("tbody tr");
    expect(
      first?.querySelectorAll("td[data-adapttable-part='cell']")
    ).toHaveLength(2);
  });

  it("omits the covered cell and sets colSpan on the origin", () => {
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        getCellSpan={({ column, rowIndex }) =>
          column.key === "title" && rowIndex === 0 ? { colSpan: 2 } : undefined
        }
      />
    );
    const first = container.querySelector("tbody tr");
    const cells = first?.querySelectorAll("td[data-adapttable-part='cell']");
    expect(cells).toHaveLength(1);
    expect(cells?.[0]?.getAttribute("colspan")).toBe("2");
    expect(cells?.[0]?.getAttribute("data-cell-span")).toBe("2x1");
    expect(cells?.[0]).toHaveStyle({ textAlign: "center" });
    expect(first?.textContent).toContain("Ship");
    expect(first?.textContent).not.toContain("Core");
  });

  it("skips the merge paint when appearance is plain", () => {
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        cellSpanAppearance="plain"
        getCellSpan={({ column, rowIndex }) =>
          column.key === "title" && rowIndex === 0 ? { colSpan: 2 } : undefined
        }
      />
    );
    const cell = container.querySelector(
      "tbody tr td[data-adapttable-part='cell']"
    );
    expect(cell).toHaveAttribute("colspan", "2");
    expect(cell).toHaveAttribute("data-cell-span", "2x1");
    expect(cell).not.toHaveStyle({ textAlign: "center" });
  });

  it("sets rowSpan on the origin and skips the covered row", () => {
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        getCellSpan={({ column, rowIndex }) =>
          column.key === "team" && rowIndex === 0 ? { rowSpan: 2 } : undefined
        }
      />
    );
    const origin = container.querySelector(
      'td[data-column-key="team"]'
    ) as HTMLElement;
    expect(origin).toHaveAttribute("rowspan", "2");
    expect(origin).toHaveAttribute("data-cell-span", "1x2");
    const rows = container.querySelectorAll("tbody tr");
    expect(
      rows[1]?.querySelectorAll("td[data-adapttable-part='cell']")
    ).toHaveLength(1);
  });
});
