/**
 * Cache keys for a query library. The split matters: the FULL key identifies
 * one page, the BASE key identifies the view every page belongs to — which is
 * what a host invalidates after a write, because invalidating page 3 alone
 * leaves pages 1 and 2 showing the row that was just deleted.
 */
import { describe, expect, it } from "vitest";

import { tableQueryBaseKey, tableQueryKey } from "./queryKey";
import type { TableQuery } from "./tableQuery";

const QUERY: TableQuery = {
  page: 2,
  limit: 25,
  search: "ada",
  sortBy: "name",
  sortDir: "asc",
  sortLevels: [],
  filters: { team: "core" },
};

describe("tableQueryKey", () => {
  it("is stable for the same query and distinct per page", () => {
    expect(tableQueryKey(QUERY)).toEqual(tableQueryKey({ ...QUERY }));
    expect(tableQueryKey(QUERY)).not.toEqual(
      tableQueryKey({ ...QUERY, page: 3 })
    );
  });

  it("keys a cursor page as well as a numbered one", () => {
    const cursor = { ...QUERY, cursor: "abc" };
    expect(tableQueryKey(cursor)).not.toEqual(
      tableQueryKey({ ...cursor, cursor: "def" })
    );
  });

  it("names the table it belongs to, so two tables never share a key", () => {
    expect(tableQueryKey(QUERY)[1]).toBe("table");
    expect(tableQueryKey(QUERY, { scope: "orders" })[1]).toBe("orders");
    expect(tableQueryKey(QUERY)[0]).toBe("adapttable");
  });
});

describe("tableQueryBaseKey", () => {
  it("is the same for every page of one view", () => {
    expect(tableQueryBaseKey(QUERY)).toEqual(
      tableQueryBaseKey({ ...QUERY, page: 9 })
    );
    expect(tableQueryBaseKey(QUERY)).toEqual(
      tableQueryBaseKey({ ...QUERY, cursor: "abc" })
    );
  });

  it("changes when the view itself changes", () => {
    expect(tableQueryBaseKey(QUERY)).not.toEqual(
      tableQueryBaseKey({ ...QUERY, search: "grace" })
    );
    expect(tableQueryBaseKey(QUERY)).not.toEqual(
      tableQueryBaseKey({ ...QUERY, filters: { team: "web" } })
    );
  });

  it("is the prefix of the full key", () => {
    const base = tableQueryBaseKey(QUERY);
    expect(tableQueryKey(QUERY).slice(0, base.length)).toEqual(base);
  });
});
