import {
  type ColumnDef,
  createMemoryAdapter,
  useFrontendData,
} from "@adapttable/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo } from "react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import { groupingPanel } from "./grouping-panel";

interface Row {
  id: string;
  team: string;
  status: string;
  qty: number;
}

const rows: Row[] = [
  { id: "1", team: "Core", status: "Open", qty: 2 },
  { id: "2", team: "Web", status: "Done", qty: 3 },
];

const columns: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "status", header: "Status", accessor: (row) => row.status },
  {
    key: "qty",
    header: "Quantity",
    accessor: (row) => row.qty,
    aggregatable: {
      default: "sum",
      operations: ["sum", "avg"],
    },
  },
];

function renderTable(initial: readonly string[] = []) {
  return render(<Harness initial={initial} />);
}

function Harness({
  initial,
}: Readonly<{
  initial: readonly string[];
}>) {
  const urlAdapter = useMemo(() => createMemoryAdapter(""), []);
  const source = useFrontendData({ data: rows, columns, urlAdapter });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(row) => row.id}
      features={[groupingPanel<Row>(initial, {})]}
    />
  );
}

function groupingKeys(): string[] {
  return [
    ...document.querySelectorAll(
      '[data-adapttable-part="grouping-chip-handle"]'
    ),
  ].map((element) => element.textContent?.replace("⋮⋮", "").trim() ?? "");
}

describe("unstyled GroupingPanel", () => {
  it("renders above the table with shared part names and native controls", () => {
    renderTable(["team"]);

    const panel = document.querySelector(
      '[data-adapttable-part="grouping-panel"]'
    )!;
    const table = document.querySelector('[data-adapttable-part="table"]')!;
    expect(panel).toHaveAccessibleName("Row grouping");
    expect(panel.compareDocumentPosition(table)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(
      document.querySelector('[data-adapttable-part="grouping-drop-zone"]')
    ).not.toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Add grouping column" }).tagName
    ).toBe("SELECT");
  });

  it("adds a grouping column from the native select", () => {
    renderTable();

    fireEvent.change(
      screen.getByRole("combobox", { name: "Add grouping column" }),
      { target: { value: "team" } }
    );

    expect(groupingKeys()).toEqual(["Team"]);
  });

  it("reorders grouping chips with arrow keys", () => {
    renderTable(["team", "status"]);

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Move Team grouping" }),
      { key: "ArrowRight" }
    );

    expect(groupingKeys()).toEqual(["Status", "Team"]);
  });

  it("removes a grouping chip", () => {
    renderTable(["team"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Team from grouping" })
    );

    expect(groupingKeys()).toEqual([]);
  });

  it("selects an aggregate column and aggregation", () => {
    renderTable(["team"]);

    const aggregate = screen.getByRole("combobox", {
      name: "Quantity aggregation",
    });
    expect(aggregate).toHaveValue("sum");
    fireEvent.change(aggregate, { target: { value: "avg" } });

    expect(aggregate).toHaveValue("avg");
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Quantity aggregation" })
    );
    expect(
      screen.queryByRole("combobox", { name: "Quantity aggregation" })
    ).not.toBeInTheDocument();
  });
});
