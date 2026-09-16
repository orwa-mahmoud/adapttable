/**
 * Paging is refused or served on the table's own numbers, never a model's.
 */
import { describe, expect, it, vi } from "vitest";

import { agentPagination } from "./pagination";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentPagination } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function tableSession(pagination: AgentPagination, setPage = vi.fn()) {
  const session = createAgentSession({
    observe: (): AgentObservation => ({
      tableId: "orders",
      viewRevision: 1,
      featureIds: [],
      columns: [],
      source: PAGE_ONLY,
      writePolicy: "allow",
      approval: "never",
      commit: "immediate",
      hasPagination: true,
      hasSearch: false,
      hasSort: false,
      hasFilters: false,
      hasExport: false,
      hasEdit: false,
      hasReorder: false,
      page: pagination.page,
      limit: pagination.pageSize,
      search: "",
      pagination,
      pageMax: pagination.totalPages ?? pagination.page + 1,
      rowAddressScope: "visible",
    }),
    apply: { setPage, setLimit: vi.fn() },
  });
  return { session, setPage };
}

const move = (s: ReturnType<typeof tableSession>["session"], page: number) =>
  s.execute("view.setPage", { page }, 1, `k-${String(page)}`);

describe("a counted source", () => {
  it("serves a page inside the total and refuses one past it", async () => {
    const counted = agentPagination({
      page: 1,
      pageSize: 25,
      totalRows: 130,
      canJump: true,
    });
    const { session, setPage } = tableSession(counted);

    expect((await move(session, 6)).ok).toBe(true);
    expect(setPage).toHaveBeenCalledWith(6);

    const past = await move(session, 7);
    expect(past.ok).toBe(false);
    expect(past.error?.message).toMatch(/past the last page/);
    // Refused before the host was touched: nothing claims a move that the
    // table was never asked to make.
    expect(setPage).toHaveBeenCalledTimes(1);
  });

  it("refuses page 2 of a table that fits on one page", async () => {
    // Eight rows at ten a page. The bound this replaces was the row count,
    // which made page 2 look reachable and the receipt say it had moved.
    const { session, setPage } = tableSession(
      agentPagination({ page: 1, pageSize: 10, totalRows: 8, canJump: true })
    );

    const result = await move(session, 2);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/past the last page/);
    expect(setPage).not.toHaveBeenCalled();
  });

  it("counts the filtered total, so filtering moves the last page", async () => {
    const filtered = tableSession(
      agentPagination({ page: 1, pageSize: 25, totalRows: 30, canJump: true })
    );
    expect((await move(filtered.session, 2)).ok).toBe(true);
    expect((await move(filtered.session, 3)).ok).toBe(false);
  });

  it("keeps one page for an empty result", async () => {
    const { session } = tableSession(
      agentPagination({ page: 1, pageSize: 25, totalRows: 0, canJump: true })
    );
    expect((await move(session, 1)).ok).toBe(true);
    expect((await move(session, 2)).ok).toBe(false);
  });

  it("applies a page size the table is not already on", async () => {
    const setPage = vi.fn();
    const setLimit = vi.fn();
    const session = createAgentSession({
      observe: (): AgentObservation => ({
        tableId: "orders",
        viewRevision: 1,
        featureIds: [],
        columns: [],
        source: PAGE_ONLY,
        writePolicy: "allow",
        approval: "never",
        commit: "immediate",
        hasPagination: true,
        hasSearch: false,
        hasSort: false,
        hasFilters: false,
        hasExport: false,
        hasEdit: false,
        hasReorder: false,
        page: 1,
        limit: 25,
        search: "",
        pagination: agentPagination({
          page: 1,
          pageSize: 25,
          pageSizeOptions: [10, 25, 50, 100],
          totalRows: 8,
          canJump: true,
        }),
        pageMax: 1,
        rowAddressScope: "visible",
      }),
      apply: { setPage, setLimit },
    });
    const result = await session.execute(
      "view.setPage",
      { page: 1, limit: 10 },
      1,
      "to-ten"
    );
    expect(result.ok).toBe(true);
    expect(setLimit).toHaveBeenCalledWith(10);
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("moves the page after a restated size, so setLimit cannot wipe it", async () => {
    // The table's own setLimit resets the page. A caller that names the size
    // already on screen — "page 2 at 5 a page" — used to run setPage and then
    // setLimit, and the table ended on page 1 with a receipt that said page 2.
    const setPage = vi.fn();
    const setLimit = vi.fn();
    const session = createAgentSession({
      observe: (): AgentObservation => ({
        tableId: "orders",
        viewRevision: 1,
        featureIds: [],
        columns: [],
        source: PAGE_ONLY,
        writePolicy: "allow",
        approval: "never",
        commit: "immediate",
        hasPagination: true,
        hasSearch: false,
        hasSort: false,
        hasFilters: false,
        hasExport: false,
        hasEdit: false,
        hasReorder: false,
        page: 1,
        limit: 5,
        search: "",
        pagination: agentPagination({
          page: 1,
          pageSize: 5,
          pageSizeOptions: [5, 10, 25],
          totalRows: 30,
          canJump: true,
        }),
        pageMax: 6,
        rowAddressScope: "visible",
      }),
      apply: { setPage, setLimit },
    });
    const result = await session.execute(
      "view.setPage",
      { page: 2, limit: 5 },
      1,
      "next"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({ page: 2, limit: 5 });
    expect(setLimit).not.toHaveBeenCalled();
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("resizes before it pages, because setLimit resets the page", async () => {
    const setPage = vi.fn();
    const setLimit = vi.fn();
    const session = createAgentSession({
      observe: (): AgentObservation => ({
        tableId: "orders",
        viewRevision: 1,
        featureIds: [],
        columns: [],
        source: PAGE_ONLY,
        writePolicy: "allow",
        approval: "never",
        commit: "immediate",
        hasPagination: true,
        hasSearch: false,
        hasSort: false,
        hasFilters: false,
        hasExport: false,
        hasEdit: false,
        hasReorder: false,
        page: 1,
        limit: 10,
        search: "",
        pagination: agentPagination({
          page: 1,
          pageSize: 10,
          pageSizeOptions: [10, 25, 50],
          totalRows: 130,
          canJump: true,
        }),
        pageMax: 13,
        rowAddressScope: "visible",
      }),
      apply: { setPage, setLimit },
    });
    const ok = await session.execute(
      "view.setPage",
      { page: 2, limit: 50 },
      1,
      "both"
    );
    expect(ok.ok).toBe(true);
    expect(setLimit.mock.invocationCallOrder[0]).toBeLessThan(
      setPage.mock.invocationCallOrder[0]!
    );
  });

  it("re-bounds when the page size changes in the same call", async () => {
    const { session } = tableSession(
      agentPagination({
        page: 1,
        pageSize: 10,
        pageSizeOptions: [10, 25, 50],
        totalRows: 130,
        canJump: true,
      })
    );
    const ok = await session.execute(
      "view.setPage",
      { page: 2, limit: 50 },
      1,
      "resize"
    );
    expect(ok.ok).toBe(true);

    const refused = await session.execute(
      "view.setPage",
      { page: 2, limit: 37 },
      1,
      "odd-size"
    );
    expect(refused.ok).toBe(false);
    expect(refused.error?.message).toMatch(/offers 10, 25, 50/);
  });
});

describe("a source of unknown length", () => {
  it("lets a host that takes page numbers jump without a fabricated total", async () => {
    const { session, setPage } = tableSession(
      agentPagination({ page: 3, pageSize: 25, canJump: true })
    );
    expect((await move(session, 40)).ok).toBe(true);
    expect(setPage).toHaveBeenCalledWith(40);
  });

  it("moves one page at a time where the source only does that", async () => {
    const { session } = tableSession(
      agentPagination({ page: 3, pageSize: 25, canJump: false })
    );
    expect((await move(session, 4)).ok).toBe(true);
    const jump = await move(session, 9);
    expect(jump.ok).toBe(false);
    expect(jump.error?.message).toMatch(/one page at a time/);
  });

  it("does not offer a next page once the source says it is finished", async () => {
    const { session, setPage } = tableSession(
      agentPagination({ page: 4, pageSize: 25, atEnd: true, canJump: true })
    );
    const past = await move(session, 5);
    expect(past.ok).toBe(false);
    expect(past.error?.message).toMatch(/no page after 4/);
    expect(setPage).not.toHaveBeenCalled();
  });
});

describe("what reaches the host", () => {
  it("rejects a page that is not a whole number, before any call", async () => {
    const { session, setPage } = tableSession(
      agentPagination({ page: 1, pageSize: 25, totalRows: 130, canJump: true })
    );
    for (const bad of [0, -3, 2.5]) {
      const result = await session.execute(
        "view.setPage",
        { page: bad },
        1,
        `bad-${String(bad)}`
      );
      expect(result.ok).toBe(false);
    }
    expect(setPage).not.toHaveBeenCalled();
  });
});

describe("sorting a column the contract did not offer", () => {
  function sortSession(columns: { id: string; sortable: boolean }[]) {
    const setSort = vi.fn();
    const session = createAgentSession({
      observe: (): AgentObservation => ({
        tableId: "orders",
        viewRevision: 1,
        featureIds: [],
        columns: columns.map((c) => ({
          id: c.id,
          label: c.id,
          type: "string",
          readable: true,
          writable: false,
          sortable: c.sortable,
        })),
        source: PAGE_ONLY,
        writePolicy: "allow",
        approval: "never",
        commit: "immediate",
        hasPagination: false,
        hasSearch: false,
        hasSort: true,
        hasFilters: false,
        hasExport: false,
        hasEdit: false,
        hasReorder: false,
        page: 1,
        limit: 10,
        search: "",
        pageMax: 1,
        rowAddressScope: "visible",
      }),
      apply: { setSort },
    });
    return { session, setSort };
  }

  it("refuses a column the table declares unsortable, and names the ones it sorts", async () => {
    // The reader's own sort control is disabled for such a column. An agent
    // that sorted by it anyway would be doing something the person in front
    // of the table cannot.
    const { session, setSort } = sortSession([
      { id: "name", sortable: true },
      { id: "notes", sortable: false },
    ]);

    const refused = await session.execute(
      "view.setSort",
      { key: "notes", dir: "asc" },
      1,
      "s1"
    );
    expect(refused.ok).toBe(false);
    expect(refused.error?.message).toMatch(
      /not sortable; this table sorts by name/
    );
    expect(setSort).not.toHaveBeenCalled();
  });

  it("sorts when the table published no columns to narrow it", async () => {
    // Nothing was said about sorting, and an absence is not a restriction —
    // the host wiring setSort is the permission. Refusing here would invent a
    // rule out of silence and name an empty list of alternatives.
    const { session, setSort } = sortSession([]);

    const result = await session.execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      1,
      "s-open"
    );
    expect(result.ok).toBe(true);
    expect(setSort).toHaveBeenCalledWith("name", "asc");
  });

  it("says so plainly when no column on the table sorts", async () => {
    const { session } = sortSession([{ id: "notes", sortable: false }]);
    const refused = await session.execute(
      "view.setSort",
      { key: "notes" },
      1,
      "s2"
    );
    expect(refused.error?.message).toMatch(/no column on this table is/);
  });

  it("refuses a column nobody published", async () => {
    const { session } = sortSession([{ id: "name", sortable: true }]);
    const refused = await session.execute(
      "view.setSort",
      { key: "salary" },
      1,
      "s3"
    );
    expect(refused.ok).toBe(false);
    expect(refused.error?.message).toMatch(/unknown column "salary"/);
  });

  it("sorts a column the contract offers, and always allows clearing", async () => {
    const { session, setSort } = sortSession([{ id: "name", sortable: true }]);

    expect(
      (await session.execute("view.setSort", { key: "name" }, 1, "s4")).ok
    ).toBe(true);
    // Clearing is not a claim about any column.
    expect(
      (await session.execute("view.setSort", { key: null }, 1, "s5")).ok
    ).toBe(true);
    expect(setSort).toHaveBeenCalledTimes(2);
  });
});
