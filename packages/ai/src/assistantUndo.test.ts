import { describe, expect, it, vi } from "vitest";

import {
  type AssistantUndo,
  isUndoBlock,
  planUndo,
  runUndo,
  undoBlocked,
} from "./assistantUndo";
import { buildView } from "./contextSnapshot";
import { createAgentSession } from "./session";
import type { AgentApply, AgentObservation, AgentSession } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

const TEAM_FILTER = {
  key: "team",
  label: "Team",
  type: "select",
  operators: ["eq"],
  defaultOperator: "eq",
  valueKeys: ["team"],
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: ["filters", "grouping"],
    columns: [
      {
        id: "total",
        label: "Total",
        type: "number",
        readable: true,
        writable: false,
        sortable: true,
      },
    ],
    source: { ...PAGE_ONLY, grouping: "client" as const },
    writePolicy: "deny",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    availableFilters: [TEAM_FILTER],
    page: 1,
    limit: 25,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function session(
  apply: AgentApply = {},
  patch: Partial<AgentObservation> = {}
): AgentSession {
  return createAgentSession({
    observe: () => observation(patch),
    apply: {
      setPage: () => undefined,
      setSearch: () => undefined,
      setSort: () => undefined,
      setGroupBy: () => undefined,
      setFilters: () => undefined,
      ...apply,
    },
  });
}

function view(
  state: Partial<Parameters<typeof buildView>[0]> = {}
): ReturnType<typeof buildView> {
  return buildView({ revision: 1, page: 1, limit: 25, search: "", ...state }, [
    TEAM_FILTER,
  ]);
}

describe("working out how to put a turn back", () => {
  it("says there is nothing to undo when the view did not move", () => {
    const planned = planUndo(view(), view(), session(), 1);

    expect(isUndoBlock(planned)).toBe(true);
    expect(planned).toEqual({ code: "nothing-to-undo" });
  });

  it("names the size only when the size moved", () => {
    // A table that wires no `setLimit` refuses a `view.setPage` that carries
    // one, so an ordinary page undo must not name it.
    const planned = planUndo(
      view({ page: 1 }),
      view({ page: 4 }),
      session(),
      5
    );

    expect((planned as AssistantUndo).calls).toEqual([
      { key: "view.setPage", args: { page: 1 } },
    ]);
  });

  it("restores a page with one call, not two", () => {
    const planned = planUndo(
      view({ page: 1, limit: 25 }),
      view({ page: 4, limit: 50 }),
      session(),
      7
    );

    expect(isUndoBlock(planned)).toBe(false);
    expect((planned as AssistantUndo).calls).toEqual([
      { key: "view.setPage", args: { page: 1, limit: 25 } },
    ]);
    // Both moved here, so both travel.
    expect((planned as AssistantUndo).settledAt).toBe(7);
  });

  it("clears a sort the turn introduced rather than leaving it", () => {
    const planned = planUndo(
      view(),
      view({ sortBy: "total", sortDir: "desc" }),
      session(),
      2
    );

    // A null key is how the guide says "no sort"; omitting it would leave the
    // table sorted by something the reader never asked for.
    expect((planned as AssistantUndo).calls).toEqual([
      { key: "view.setSort", args: { key: null } },
    ]);
  });

  it("puts the search and the filters back together", () => {
    const planned = planUndo(
      view({ search: "ada", filters: { team: "core" } }),
      view({ search: "", filters: { team: "ops" } }),
      session(),
      3
    );

    expect((planned as AssistantUndo).calls).toEqual([
      { key: "view.setSearch", args: { query: "ada" } },
      { key: "view.setFilters", args: { filters: { team: "core" } } },
    ]);
  });

  it("restores an empty filter set as empty, never as untouched", () => {
    const planned = planUndo(
      view(),
      view({ filters: { team: "core" } }),
      session(),
      3
    );

    expect((planned as AssistantUndo).calls).toEqual([
      { key: "view.setFilters", args: { filters: {} } },
    ]);
  });

  it("refuses rather than half-restoring what it cannot put back", () => {
    const planned = planUndo(
      view(),
      view({ pinnedColumns: { total: "start" } }),
      session(),
      3
    );

    expect(planned).toEqual({
      code: "cannot-restore",
      fields: ["pinnedColumns"],
    });
  });

  it("refuses when the capability that would restore it is not permitted", () => {
    const noSearch = session({}, { hasSearch: false });
    const planned = planUndo(view({ search: "ada" }), view(), noSearch, 3);

    expect(planned).toEqual({ code: "cannot-restore", fields: ["search"] });
  });
});

describe("whether the offer still stands", () => {
  it("stands while the table is where the turn left it", () => {
    const undo: AssistantUndo = {
      before: view(),
      settledAt: 1,
      calls: [{ key: "view.setPage", args: { page: 1, limit: 25 } }],
    };

    expect(undoBlocked(session(), undo)).toBeUndefined();
  });

  it("ends the moment anything else moves the table", () => {
    const undo: AssistantUndo = {
      before: view(),
      settledAt: 1,
      calls: [{ key: "view.setPage", args: { page: 1, limit: 25 } }],
    };

    // Who moved it does not matter — the reader, another agent, a refresh,
    // or a later turn. The plan describes a table that is no longer there.
    expect(undoBlocked(session({}, { viewRevision: 5 }), undo)).toEqual({
      code: "table-moved",
      settledAt: 1,
      now: 5,
    });
  });
});

describe("putting it back", () => {
  it("runs every call through the session's own executor", async () => {
    const setPage = vi.fn();
    const setSearch = vi.fn();
    const live = session({ setPage, setSearch });
    const undo: AssistantUndo = {
      before: view(),
      settledAt: 1,
      calls: [
        // The size is not part of this one: the table wires no `setLimit`,
        // and a plan that named the size would be refused rather than run.
        { key: "view.setPage", args: { page: 1 } },
        { key: "view.setSearch", args: { query: "ada" } },
      ],
    };

    const results = await runUndo(live, undo, "undo:m1");

    expect(setPage).toHaveBeenCalledWith(1);
    expect(setSearch).toHaveBeenCalledWith("ada");
    expect(results.every((result) => result.ok)).toBe(true);
    expect(results).toHaveLength(2);
  });

  it("gives each call its own replay identity", async () => {
    const keys: string[] = [];
    const live = session();
    const spied: AgentSession = {
      ...live,
      execute: (key, args, revision, idempotencyKey, signal) => {
        keys.push(idempotencyKey);
        return live.execute(key, args, revision, idempotencyKey, signal);
      },
    };

    await runUndo(
      spied,
      {
        before: view(),
        settledAt: 1,
        calls: [
          { key: "view.setPage", args: { page: 1 } },
          { key: "view.setSearch", args: { query: "" } },
        ],
      },
      "undo:m1"
    );

    expect(keys).toEqual(["undo:m1:0", "undo:m1:1"]);
  });

  it("stops at the first failure rather than half-restoring", async () => {
    const setSearch = vi.fn();
    const live = session({ setSearch });

    const results = await runUndo(
      live,
      {
        before: view(),
        settledAt: 1,
        calls: [
          { key: "view.setPage", args: { page: 0 } },
          { key: "view.setSearch", args: { query: "ada" } },
        ],
      },
      "undo:m1"
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.ok).toBe(false);
    expect(setSearch).not.toHaveBeenCalled();
  });

  it("refuses outright once the table has moved", async () => {
    const setPage = vi.fn();
    const live = session({ setPage }, { viewRevision: 9 });

    await expect(
      runUndo(
        live,
        {
          before: view(),
          settledAt: 1,
          calls: [{ key: "view.setPage", args: { page: 1 } }],
        },
        "undo:m1"
      )
    ).rejects.toThrow(/moved to revision 9/);
    expect(setPage).not.toHaveBeenCalled();
  });
});
