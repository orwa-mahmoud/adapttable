/**
 * Grouping on a phone is a different code path from grouping on a desktop:
 * the card list rebuilds the whole body itself rather than reusing the table
 * row assembly, so every block a grouped table can contain — group headers,
 * host-inserted extra rows, and pinned summaries — has to be proven to reach
 * the cards too. Losing one of them there is invisible on a desktop run.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mobileCardsGroupingTests } from "../../react/test/kit/suites/mobileCardsGrouping";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderChakra } from "./test-utils";

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

describe("grouped card list (chakra)", () => {
  it("carries extra rows into an ungrouped card list", () => {
    renderChakra(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile
        extraRows={[
          { key: "s", kind: "separator", beforeRowId: "3" },
          { key: "n", kind: "fullWidth", render: () => "Team note" },
        ]}
      />
    );

    // Ungrouped is its own assembly path — the cards are built straight from
    // the row entries, so the host's inserted rows have to be woven in there
    // as well as in the grouped one.
    expect(screen.getByText("Team note")).toBeInTheDocument();
    expect(parts("separator-row")).toHaveLength(1);
    expect(screen.getByText("Ship")).toBeInTheDocument();
  });
});
