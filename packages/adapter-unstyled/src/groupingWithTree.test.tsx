/**
 * Grouping and a tree composed together.
 *
 * The body draws one walked model: with grouping armed it draws the groups,
 * and their rows carry no tree chevrons.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";
import { tree } from "./tree";

interface Row {
  id: string;
  name: string;
  team: string;
  parentId?: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Lead", team: "Core" },
  { id: "2", name: "Report", team: "Core", parentId: "1" },
  { id: "3", name: "Analyst", team: "Data" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

describe("grouping with a tree (unstyled)", () => {
  it("draws the groups, and their rows carry no tree chevrons", () => {
    render(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        features={[
          grouping("team"),
          tree<Row>({ getParentId: (row) => row.parentId }),
        ]}
      />
    );

    expect(
      document.querySelectorAll('[data-adapttable-part="group-row"]')
    ).toHaveLength(2);
    expect(
      document.querySelector('[data-adapttable-part="tree-toggle"]')
    ).toBeNull();
  });
});
