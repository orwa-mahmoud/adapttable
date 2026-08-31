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

describe("cell spanning (antd)", () => {
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

  it("does not sticky-pin a row when a team span would overlay the next people", () => {
    const rows: Task[] = [
      { id: "1", title: "Chioma", team: "Core" },
      { id: "2", title: "Fatima", team: "Core" },
      { id: "3", title: "Elena", team: "Core" },
      { id: "4", title: "Sefa", team: "Data" },
      { id: "5", title: "Omar", team: "Data" },
    ];
    const { container } = render(
      <DataTable
        data={rows}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        pinnedRowIds={{ top: ["1"], bottom: [] }}
        onPinnedRowIdsChange={() => undefined}
        getCellSpan={({ column, sectionRows, sectionRowIndex }) => {
          if (column.key !== "team") return undefined;
          const current = sectionRows[sectionRowIndex];
          if (!current) return undefined;
          if (sectionRows[sectionRowIndex - 1]?.team === current.team) {
            return undefined;
          }
          let span = 1;
          while (sectionRows[sectionRowIndex + span]?.team === current.team) {
            span += 1;
          }
          return span > 1 ? { rowSpan: span } : undefined;
        }}
      />
    );
    const pinned = container.querySelector(
      '[data-adapttable-part="pinned-top"]'
    );
    expect(pinned?.textContent).toContain("Chioma");
    expect(pinned?.textContent).not.toContain("Fatima");
    expect(pinned).toHaveAttribute("data-row-pin", "top");
    expect(pinned).not.toHaveStyle({ position: "sticky" });
    const pinnedTeam = pinned?.querySelector('[data-column-key="team"]');
    expect(pinnedTeam?.getAttribute("rowspan")).toBe("3");
    const fatima = [...container.querySelectorAll("tbody tr")].find((tr) =>
      tr.textContent?.includes("Fatima")
    );
    expect(fatima?.querySelector('[data-column-key="team"]')).toBeNull();
    const sefa = [...container.querySelectorAll("tbody tr")].find((tr) =>
      tr.textContent?.includes("Sefa")
    );
    expect(
      sefa?.querySelector('[data-column-key="team"]')?.getAttribute("rowspan")
    ).toBe("2");
  });

  it("keeps sticky pin chrome when no cell spans", () => {
    const { container } = render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        pinnedRowIds={{ top: ["1"], bottom: [] }}
        onPinnedRowIdsChange={() => undefined}
      />
    );
    const pinned = container.querySelector(
      '[data-adapttable-part="pinned-top"]'
    );
    expect(pinned?.textContent).toContain("Ship");
    expect(pinned).toHaveStyle({ position: "sticky" });
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
    expect(first?.textContent).toContain("Ship");
    expect(first?.textContent).not.toContain("Core");
  });
});
