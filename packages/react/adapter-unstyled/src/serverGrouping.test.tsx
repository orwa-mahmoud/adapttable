import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef, TableSource } from "./index";

interface Row {
  id: string;
  name: string;
}
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/** A server tier that answered `query.groupBy` itself. */
const serverSource = (): TableSource<Row> => ({
  rows: [{ id: "1", name: "Ada" }],
  groups: [
    {
      value: "Core",
      count: 4000,
      aggregates: { name: "1.2M" },
      rows: [{ id: "1", name: "Ada" }],
    },
    { value: "Web", count: 12 },
  ],
  total: 4012,
  page: 1,
  limit: 25,
  defaultLimit: 25,
  search: "",
  sortBy: undefined,
  sortDir: undefined,
  sortLevels: [],
  toggleSortLevel: () => undefined,
  groupBy: "team",
  extra: {},
  isLoading: false,
  isFetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  error: null,
  paginationMode: "paged",
  setPage: () => undefined,
  setLimit: () => undefined,
  setSort: () => undefined,
  setSearch: () => undefined,
  setGroupBy: () => undefined,
  setExtra: () => undefined,
  setExtras: () => undefined,
  clearExtras: () => undefined,
  clearAll: () => undefined,
  fetchNextPage: () => undefined,
  refetch: () => undefined,
});

/**
 * Grouping the server computed.
 *
 * The table renders the server's answer through the same entries local
 * grouping produces — so what matters here is that the SERVER's numbers are
 * the ones on screen.
 */
describe("server-side grouping (unstyled)", () => {
  it("shows the server's groups, with the server's counts", () => {
    render(
      <DataTable
        source={serverSource()}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="team"
      />
    );
    const labels = [
      ...document.querySelectorAll('[data-adapttable-part="group-label"]'),
    ].map((el) => el.textContent);
    expect(labels).toEqual(["Core", "Web"]);
    // 4,000 — not the one row the page carried.
    expect(screen.getByText("(4000)")).toBeInTheDocument();
    expect(screen.getByText("(12)")).toBeInTheDocument();
  });

  it("renders the rows the server sent under their own group", () => {
    render(
      <DataTable
        source={serverSource()}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="team"
      />
    );
    expect(
      document.querySelectorAll('[data-adapttable-part="row"]')
    ).toHaveLength(1);
  });

  it("shows the server's aggregates", () => {
    render(
      <DataTable
        source={serverSource()}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy="team"
      />
    );
    expect(screen.getByText("1.2M")).toBeInTheDocument();
  });
});
