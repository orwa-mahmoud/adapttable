import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  team: string;
  budget: number;
}
const ROWS: Row[] = [
  { id: "1", team: "Core", budget: 10 },
  { id: "2", team: "Core", budget: 30 },
  { id: "3", team: "Web", budget: 50 },
];
const COLS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "budget", header: "Budget", accessor: (r) => r.budget },
];
const total = (rows: readonly Row[]) => ({
  budget: rows.reduce((sum, row) => sum + row.budget, 0),
});

/**
 * Group footers and the grand total.
 *
 * The footers repeat what the header said, at the bottom of the group — which
 * is where the reader of a long group is by the time they want the number.
 */
describe("group footers (unstyled)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="team"
        groupAggregates={total}
        {...extra}
      />
    );
  const footers = () =>
    [
      ...document.querySelectorAll('[data-adapttable-part="group-footer-row"]'),
    ].map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "");

  it("renders nothing without the prop", () => {
    table();
    expect(footers()).toHaveLength(0);
  });

  it("closes each group with its own total", () => {
    table({ groupFooters: true });
    const rows = footers();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("Core total");
    expect(rows[0]).toContain("40");
    expect(rows[1]).toContain("Web total");
  });

  it("carries no chevron and no checkbox — the header owns both", () => {
    table({ groupFooters: true, bulkActions: [{ id: "x", label: "X" }] });
    const footer = document.querySelector(
      '[data-adapttable-part="group-footer-row"]'
    )!;
    expect(
      footer.querySelector('[data-adapttable-part="group-toggle"]')
    ).toBeNull();
    expect(
      footer.querySelector('[data-adapttable-part="group-select"]')
    ).toBeNull();
  });

  it("says nothing beneath a collapsed group, footer included", () => {
    // A closed header already carries the totals; a footer under it would be
    // the same numbers twice with nothing between them.
    const { container } = table({ groupFooters: true });
    const toggle = container.querySelectorAll(
      '[data-adapttable-part="group-toggle"]'
    )[0]!;
    fireEvent.click(toggle);
    expect(footers()).toHaveLength(1);
  });

  it("totals every level of a nested group, innermost first", () => {
    render(
      <DataTable
        data={[
          { id: "1", team: "Core", budget: 10 },
          { id: "2", team: "Core", budget: 30 },
        ]}
        columns={[...COLS, { key: "id", header: "Id", accessor: (r) => r.id }]}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy={["team", "id"]}
        groupAggregates={total}
        groupFooters
      />
    );
    const rows = footers();
    // Two leaf groups close before their parent does.
    expect(rows).toHaveLength(3);
    expect(rows[2]).toContain("Core total");
  });

  it("leaves the grand total to summaryRow, over the whole set", () => {
    table({ groupFooters: true, summaryRow: total });
    const summary = document.querySelector(
      '[data-adapttable-part="summary-row"]'
    );
    expect(summary?.textContent).toContain("90");
  });
});
