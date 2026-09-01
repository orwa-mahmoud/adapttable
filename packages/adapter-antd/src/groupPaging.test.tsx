import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  team: string;
}
const ROWS: Row[] = Array.from({ length: 9 }, (_, i) => ({
  id: String(i),
  team: `Team ${Math.floor(i / 3)}`,
}));
const COLS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "id", header: "Id", accessor: (r) => r.id },
];

/**
 * Paging groups, and paging inside one.
 *
 * A table grouped by customer can have ten thousand groups; rendering all of
 * them to fill one screen is the mistake virtualization exists to avoid.
 */
describe("group paging (antd)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        groupBy="team"
        {...extra}
      />
    );
  const groups = () =>
    document.querySelectorAll('[data-adapttable-part="group-label"]');
  const rows = () =>
    document.querySelectorAll(
      "tbody tr.ant-table-row:not(:has(td > .ant-space))"
    );

  it("shows every group without a page size", () => {
    table();
    expect(groups()).toHaveLength(3);
  });

  it("shows one page of groups, and offers the rest", () => {
    table({ groupPageSize: 2 });
    expect(groups()).toHaveLength(2);
    expect(screen.getByText("Show 1 more groups")).toBeInTheDocument();
  });

  it("reveals the next page when asked", () => {
    table({ groupPageSize: 2 });
    fireEvent.click(screen.getByText("Show 1 more groups"));
    expect(groups()).toHaveLength(3);
    expect(screen.queryByText(/more groups/)).not.toBeInTheDocument();
  });

  it("pages the rows inside each group", () => {
    table({ groupRowPageSize: 2 });
    // Two of each group's three rows, and one offer per group.
    expect(rows()).toHaveLength(6);
    expect(screen.getAllByText("Show 1 more in this group")).toHaveLength(3);
  });

  it("reveals one group's rows without touching another's", () => {
    table({ groupRowPageSize: 2 });
    fireEvent.click(screen.getAllByText("Show 1 more in this group")[0]!);
    expect(rows()).toHaveLength(7);
    expect(screen.getAllByText("Show 1 more in this group")).toHaveLength(2);
  });

  it("tells a server tier which group needs more rows", () => {
    // The rest of that group is not in the browser yet — this is the hook.
    const onGroupLoadMore = vi.fn();
    table({ groupRowPageSize: 2, onGroupLoadMore });
    fireEvent.click(screen.getAllByText("Show 1 more in this group")[0]!);
    expect(onGroupLoadMore).toHaveBeenCalledExactlyOnceWith(
      "group:team:s:Team 0"
    );
  });
});
