/**
 * Grouping on a phone is a different code path from grouping on a desktop:
 * the card list rebuilds the whole body itself rather than reusing the table
 * row assembly, so every block a grouped table can contain — group headers,
 * host-inserted extra rows, and pinned summaries — has to be proven to reach
 * the cards too. Losing one of them there is invisible on a desktop run.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mobileCardsGroupingTests } from "../../react/test/kit/suites/mobileCardsGrouping";
import { DataTable, kit } from "./data-table.test-utils";
import { groupingPanel } from "./grouping-panel";
import type { ColumnDef } from "./index";

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

describe("grouped card list (unstyled)", () => {
  it("renders group cards through the interactive grouping panel too", () => {
    render(
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
