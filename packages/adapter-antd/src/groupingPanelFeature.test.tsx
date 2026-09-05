import type { ColumnDef } from "@adapttable/react";

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { columnMenu } from "./column-menu";
import { DataTable } from "./DataTable";
import { groupingPanel } from "./grouping-panel";
import { renderAntd } from "./test-utils";

interface Row {
  id: string;
  team: string;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: "1", team: "Core", name: "Ada", amount: 10 },
  { id: "2", team: "Core", name: "Grace", amount: 20 },
];

const columns: ColumnDef<Row>[] = [
  {
    key: "team",
    header: "Team",
    accessor: (row) => row.team,
    sortable: true,
  },
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "amount", header: "Amount", accessor: (row) => row.amount },
];

function renderTable() {
  return renderAntd(
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      urlSync={false}
      features={[groupingPanel(["team"]), columnMenu()]}
    />
  );
}

describe("grouping-panel feature (antd)", () => {
  it("mounts above the body and merges drag props into sortable headers", async () => {
    renderTable();

    const panel = document.querySelector(
      '[data-adapttable-part="grouping-panel"]'
    );
    const body = document.querySelector('[data-adapttable-part="tbody"]');
    expect(panel).toBeInTheDocument();
    expect(body).toBeInTheDocument();
    expect(
      panel!.compareDocumentPosition(body!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const teamHeader = document.querySelector<HTMLElement>(
      '[data-adapttable-part="header-cell"][data-column-key="team"]'
    );
    expect(teamHeader).toHaveAttribute("draggable", "true");
    expect(teamHeader).toHaveAttribute("aria-sort", "none");

    fireEvent.click(teamHeader!);
    await waitFor(() =>
      expect(teamHeader).toHaveAttribute("aria-sort", "ascending")
    );

    const nameHeader = document.querySelector<HTMLElement>(
      '[data-adapttable-part="header-cell"][data-column-key="name"]'
    );
    const values = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      get types() {
        return [...values.keys()];
      },
      setData(type: string, value: string) {
        values.set(type, value);
      },
      getData(type: string) {
        return values.get(type) ?? "";
      },
    };
    fireEvent.dragStart(nameHeader!, { dataTransfer });
    const zones = document.querySelectorAll(
      '[data-adapttable-part="grouping-drop-zone"]'
    );
    fireEvent.dragOver(zones[zones.length - 1]!, { dataTransfer });
    fireEvent.drop(zones[zones.length - 1]!, { dataTransfer });
    await waitFor(() =>
      expect(
        document.querySelectorAll('[data-adapttable-part="grouping-chip"]')
      ).toHaveLength(2)
    );
  });

  it("renders aggregation choices without closing the column menu", async () => {
    renderTable();

    const columnsTrigger = screen.getByRole("button", { name: "Columns" });
    fireEvent.click(columnsTrigger);
    await screen.findByText("Reset columns");

    fireEvent.click(
      screen.getByRole("button", { name: "Column actions: Name" })
    );
    expect(
      screen.getByRole("button", { name: "Group by Name" })
    ).toBeInTheDocument();

    const submenu = document.querySelector(
      '[data-adapttable-part="column-menu-submenu"]'
    );
    expect(submenu).not.toBeNull();
    const aggregation = within(submenu as HTMLElement).getByRole("combobox", {
      name: "Group aggregation",
    });
    fireEvent.mouseDown(aggregation);
    fireEvent.click(await screen.findByRole("option", { name: "Sum" }));

    expect(columnsTrigger).toHaveAttribute("aria-expanded", "true");
    expect(
      document.querySelector('[data-adapttable-part="column-menu-choice"]')
    ).toBeInTheDocument();
    expect(within(submenu as HTMLElement).getByText("Sum")).toBeInTheDocument();
  });
});
