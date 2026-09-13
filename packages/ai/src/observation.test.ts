/**
 * One rule for what a table can do, whoever is asking.
 */
import { describe, expect, it, vi } from "vitest";

import { agentObservation, type ObservationInputs } from "./observation";
import { agentPagination } from "./pagination";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function inputs(patch: Partial<ObservationInputs> = {}): ObservationInputs {
  return {
    tableId: "orders",
    viewRevision: 3,
    featureIds: [],
    columns: [],
    source: PAGE_ONLY,
    operations: {},
    apply: {},
    policy: { approval: "never" },
    view: {},
    pagination: agentPagination({ page: 1, pageSize: 25, canJump: true }),
    rowAddressScope: "visible",
    ...patch,
  };
}

describe("whether a capability is wired", () => {
  it("takes a host callback", () => {
    const observed = agentObservation(
      inputs({ apply: { setPage: vi.fn(), setSort: vi.fn() } })
    );
    expect(observed.hasPagination).toBe(true);
    expect(observed.hasSort).toBe(true);
    expect(observed.hasSearch).toBe(false);
  });

  it("takes a runtime that already does it", () => {
    const observed = agentObservation(
      inputs({ operations: { setPage: true, setSearch: true } })
    );
    expect(observed.hasPagination).toBe(true);
    expect(observed.hasSearch).toBe(true);
    expect(observed.hasSort).toBe(false);
  });

  it("treats the two as the same answer, not a precedence", () => {
    // A host callback and a runtime that offers the operation are two ways of
    // saying the table can do it. Neither is the "real" one.
    const fromHost = agentObservation(inputs({ apply: { setSort: vi.fn() } }));
    const fromRuntime = agentObservation(
      inputs({ operations: { setSort: true } })
    );
    expect(fromHost.hasSort).toBe(fromRuntime.hasSort);
  });

  it("counts either way of changing a cell as editable", () => {
    expect(
      agentObservation(inputs({ apply: { editCells: vi.fn() } })).hasEdit
    ).toBe(true);
    expect(
      agentObservation(inputs({ apply: { stageCells: vi.fn() } })).hasEdit
    ).toBe(true);
    expect(
      agentObservation(inputs({ operations: { editCells: true } })).hasEdit
    ).toBe(true);
  });

  it("needs the saved-views feature as well as its handler", () => {
    // The handler alone has nowhere to put what it applies.
    expect(
      agentObservation(inputs({ apply: { applyView: vi.fn() } })).hasSavedViews
    ).toBe(false);
    expect(
      agentObservation(
        inputs({ featureIds: ["saved-views"], apply: { applyView: vi.fn() } })
      ).hasSavedViews
    ).toBe(true);
  });
});

describe("what it publishes about the view", () => {
  it("takes page and size from the pagination, not from a second source", () => {
    const observed = agentObservation(
      inputs({
        pagination: agentPagination({
          page: 3,
          pageSize: 50,
          totalRows: 130,
          canJump: true,
        }),
      })
    );
    expect(observed.page).toBe(3);
    expect(observed.limit).toBe(50);
    expect(observed.pagination?.totalPages).toBe(3);
    // The bound a session enforces is derived from the same pagination a
    // context publishes, so the two can never disagree.
    expect(observed.pageMax).toBe(3);
  });

  it("leaves an unknown total's bound one step ahead of the reader", () => {
    const observed = agentObservation(
      inputs({
        pagination: agentPagination({ page: 4, pageSize: 25, canJump: true }),
      })
    );
    expect(observed.pagination?.totalPages).toBeUndefined();
    expect(observed.pageMax).toBe(5);
  });

  it("omits what the binding did not state rather than inventing it", () => {
    const observed = agentObservation(inputs());
    expect(observed.sortBy).toBeUndefined();
    expect(observed.groupBy).toBeUndefined();
    expect(observed.pinnedColumns).toBeUndefined();
    expect(observed.search).toBe("");
  });

  it("defaults the policy the way a table without one behaves", () => {
    const observed = agentObservation(inputs());
    expect(observed.writePolicy).toBe("allow");
    expect(observed.commit).toBe("stage");
  });
});
