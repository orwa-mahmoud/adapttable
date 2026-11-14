/**
 * Grouping on a phone is a different code path from grouping on a desktop:
 * the card list rebuilds the whole body itself rather than reusing the table
 * row assembly, so every block a grouped table can contain — group headers,
 * host-inserted extra rows, and pinned summaries — has to be proven to reach
 * the cards too. Losing one of them there is invisible on a desktop run.
 */
import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mobileCardsGroupingTests } from "../../react/test/kit/suites/mobileCardsGrouping";
import { DataTable, kit } from "./data-table.test-utils";
import { grouping } from "./grouping";
import { groupingPanel } from "./grouping-panel";
import type { ColumnDef } from "./index";
import { renderAntd } from "./test-utils";

for (const test of mobileCardsGroupingTests(kit)) it(test.name, test.run);

interface Task {
  id: string;
  title: string;
  team: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", team: "Core" },
  { id: "2", title: "Test", team: "Core" },
  { id: "3", title: "Write guide", team: "Docs" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

const parts = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
];

describe("grouped card list (antd)", () => {
  it("formats and captions mobile subtotals through their declared columns", () => {
    renderAntd(
      <DataTable
        data={ROWS}
        columns={COLS.map((column) =>
          column.key === "title"
            ? {
                ...column,
                mobileLabel: "Completed tasks",
                formatAggregate: (value) =>
                  typeof value === "number" ? `${value} tasks` : undefined,
              }
            : column
        )}
        rowKey={(row) => row.id}
        urlSync={false}
        forceMobile
        features={[
          grouping(["team"], {
            groupAggregates: (rows: readonly Task[]) => ({
              title: rows.length,
            }),
          }),
        ]}
      />
    );
    const core = parts("group-card").find((card) =>
      card.textContent?.includes("Core")
    )!;
    expect(within(core).getByText("Completed tasks")).toBeInTheDocument();
    expect(within(core).getByText("2 tasks")).toHaveAttribute(
      "data-column",
      "title"
    );
  });

  it("renders group cards through the interactive grouping panel too", () => {
    renderAntd(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile
        features={[groupingPanel(["team"])]}
      />
    );

    // The panel feature supplies its own card slot; on a phone that slot is
    // the only thing standing between a grouped table and a flat list.
    const headers = parts("group-card").map((el) => el.textContent ?? "");
    expect(headers.some((text) => text.includes("Core"))).toBe(true);
    expect(headers.some((text) => text.includes("Docs"))).toBe(true);
  });
});
