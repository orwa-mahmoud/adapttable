import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { grouping } from "./grouping";
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
 * Group footers for the mui adapter.
 *
 * Core decides where a footer goes; each adapter has to render it as a row of
 * its own kit, without the chevron and checkbox its header carries.
 */
describe("group footers (mui)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[
          grouping("team", {
            groupAggregates: total,
            groupFooters: extra?.groupFooters as boolean | undefined,
          }),
        ]}
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
    table({ groupFooters: true });
    fireEvent.click(
      document.querySelectorAll('[data-adapttable-part="group-toggle"]')[0]!
    );
    expect(footers()).toHaveLength(1);
  });
});
