import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";
import { pinnedSummaryRows } from "./pinned-summary-rows";

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

describe("pinned summary rows (mui)", () => {
  it("renders nothing until the factory is composed", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    expect(part("pinned-summary-top")).toBeNull();
    expect(part("pinned-summary-bottom")).toBeNull();
  });

  it("sticks host objects above and below the scroll body", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[pinnedSummaryRows({ top: [TOP], bottom: [BOTTOM] })]}
      />
    );
    expect(part("pinned-summary-top")?.textContent).toContain("Team total");
    expect(part("pinned-summary-bottom")?.textContent).toContain("Grand total");
    expect(part("pinned-summary-top")).toHaveAttribute(
      "aria-label",
      "Summary row"
    );
    expect(screen.getByText("Ship")).toBeInTheDocument();
  });

  it("stays on a grouped table where lift-a-data-row pinning is refused", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="team"
        features={[
          grouping("team"),
          pinnedSummaryRows({ top: [TOP], bottom: [BOTTOM] }),
        ]}
      />
    );
    expect(part("pinned-summary-top")?.textContent).toContain("Team total");
    expect(part("pinned-summary-bottom")?.textContent).toContain("Grand total");
    expect(part("group-row")).not.toBeNull();
  });

  it("renders summary cards on mobile without selection chrome", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile
        onSelectionChange={() => undefined}
        features={[pinnedSummaryRows({ top: [TOP] })]}
      />
    );
    const card = part("pinned-summary-top");
    expect(card?.textContent).toContain("Team total");
    expect(card).toHaveAttribute("aria-label", "Summary row");
    expect(card?.querySelector("input[type='checkbox']")).toBeNull();
  });
});
