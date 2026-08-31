/**
 * Multi-level column groups, in antd's own nested-column tree.
 *
 * antd expresses a group as a parent column with `children`, so the shared
 * group-row model has to be folded into that shape — and the shape is easy to
 * get subtly wrong in a way only a browser shows: a column rendered under two
 * parents appears twice in every row.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  role: string;
  team: string;
  start: string;
  budget: string;
  load: string;
}

const ROWS: Row[] = [
  {
    id: "1",
    name: "Ada",
    role: "Lead",
    team: "Core",
    start: "2026-01-01",
    budget: "10",
    load: "50",
  },
];

// Two ungrouped columns, a one-level group, then a TWO-level group — so the
// header is three rows deep and the ungrouped leaves sit above nothing.
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "role", header: "Role", accessor: (r) => r.role },
  { key: "team", header: "Team", accessor: (r) => r.team, group: "Assignment" },
  {
    key: "start",
    header: "Start",
    accessor: (r) => r.start,
    group: ["Delivery", "Timeline"],
  },
  {
    key: "budget",
    header: "Budget",
    accessor: (r) => r.budget,
    group: ["Delivery", "Money"],
  },
  { key: "load", header: "Load", accessor: (r) => r.load },
];

function Harness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: createMemoryAdapter(""),
    columns,
  });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}

describe("column groups (antd)", () => {
  it("renders every column once per row, whatever the header depth", () => {
    render(<Harness />);
    const bodyRow = screen.getAllByRole("row").at(-1)!;
    const keys = [...bodyRow.querySelectorAll("[data-column-key]")].map(
      (cell) => cell.getAttribute("data-column-key")
    );
    // A deeper header row merges its unlabelled cells across the group
    // boundaries above it, so an ungrouped leaf used to be handed to every
    // parent that gap touched — and rendered once for each of them.
    expect(keys).toEqual(["name", "role", "team", "start", "budget", "load"]);
  });

  it("puts each group over exactly the columns it names", () => {
    render(<Harness />);
    // A one-column group needs no colspan; the two-level one covers both of
    // its leaves and no more.
    expect(
      screen.getByText("Assignment").closest("th")?.getAttribute("colspan")
    ).toBeNull();
    expect(
      screen.getByText("Delivery").closest("th")?.getAttribute("colspan")
    ).toBe("2");
    // The inner level sits under Delivery, one leaf each.
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("Money")).toBeInTheDocument();
  });
});
