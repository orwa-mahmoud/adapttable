/**
 * Whose change was it?
 *
 * A turn may judge its actions against the view it was answered for and
 * against whatever its own actions have since produced. Anything else that
 * moved the table belongs to somebody else, and an action planned before it
 * is stale — however convenient it would be to carry on.
 */
import { describe, expect, it, vi } from "vitest";

import { createTurnExecution, phaseContext } from "./httpExecution";
import { createAgentSession } from "./session";
import type { AgentObservation, AgentSession } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

/** A table whose revision the test moves by hand, as the world would. */
function movableTable() {
  const state = { revision: 1, page: 1, search: "" };
  const session = createAgentSession({
    observe: (): AgentObservation => ({
      tableId: "orders",
      viewRevision: state.revision,
      featureIds: ["filters"],
      columns: [
        {
          id: "name",
          label: "Name",
          type: "string",
          readable: true,
          writable: true,
          sortable: true,
        },
      ],
      source: PAGE_ONLY,
      writePolicy: "allow",
      approval: "never",
      commit: "immediate",
      hasPagination: true,
      hasSearch: true,
      hasSort: true,
      hasFilters: false,
      hasExport: false,
      hasEdit: false,
      hasReorder: false,
      page: state.page,
      limit: 10,
      search: state.search,
      pageMax: 50,
      rowAddressScope: "visible",
    }),
    apply: {
      setPage: (page: number) => {
        state.page = page;
        state.revision += 1;
      },
      setSearch: (search: string) => {
        state.search = search;
        state.revision += 1;
      },
    },
  });
  return {
    session,
    state,
    /** Somebody else moves the table — a source push, another surface. */
    elsewhere: () => {
      state.revision += 1;
    },
  };
}

const action = (
  key: string,
  args: unknown,
  idempotencyKey: string,
  expectedRevision?: number
) => ({
  key,
  args,
  idempotencyKey,
  ...(expectedRevision === undefined ? {} : { expectedRevision }),
});

describe("a change from outside the turn", () => {
  it("is not absorbed by a sanitized read replay", async () => {
    const table = movableTable();
    await table.session.execute("columns.describe", {}, 1, "describe");
    const context = phaseContext(table.session, "t-replay", 0);
    const turn = createTurnExecution(table.session, context);
    table.elsewhere();

    const results = await turn.execute({
      context,
      actions: [
        action("columns.describe", {}, "describe"),
        action("view.setPage", { page: 2 }, "page-after-replay"),
      ],
    });

    expect(results[0]).toMatchObject({ ok: true, revision: 1 });
    expect(results[1]?.error?.code).toBe("revision-mismatch");
    expect(table.state.page).toBe(1);
  });

  it("is not absorbed after a successful read in the same batch", async () => {
    const table = movableTable();
    const live = table.session;
    const session: AgentSession = {
      catalog: live.catalog,
      describe: live.describe,
      manifest: live.manifest,
      execute: async (...args) => {
        const result = await live.execute(...args);
        if (args[0] === "view.describe") table.elsewhere();
        return result;
      },
    };
    const context = phaseContext(session, "t-read", 0);
    const turn = createTurnExecution(session, context);

    const results = await turn.execute({
      context,
      actions: [
        action("view.describe", {}, "read"),
        action("view.setPage", { page: 2 }, "page"),
      ],
    });

    expect(results[0]?.ok).toBe(true);
    expect(results[1]?.error?.code).toBe("revision-mismatch");
    expect(table.state.page).toBe(1);
  });

  it("chains only the mutation's own revision when a foreign edit follows it in the same batch", async () => {
    const table = movableTable();
    const live = table.session;
    const session: AgentSession = {
      catalog: live.catalog,
      describe: live.describe,
      manifest: live.manifest,
      execute: async (...args) => {
        const result = await live.execute(...args);
        if (args[0] === "view.setSearch") table.elsewhere();
        return result;
      },
    };
    const context = phaseContext(session, "t-write", 0);
    const turn = createTurnExecution(session, context);

    const results = await turn.execute({
      context,
      actions: [
        action("view.setSearch", { query: "ada" }, "search"),
        action("view.setPage", { page: 2 }, "page"),
      ],
    });

    expect(results[0]).toMatchObject({ ok: true, revision: 2 });
    expect(results[1]?.error?.code).toBe("revision-mismatch");
    expect(table.state.page).toBe(1);
  });

  it("is not absorbed by the context of a later phase", async () => {
    const table = movableTable();
    const turn = createTurnExecution(
      table.session,
      phaseContext(table.session, "t-1", 0)
    );

    // Phase one moves the table itself: 1 → 2, and that is the turn's own.
    const first = await turn.execute({
      context: phaseContext(table.session, "t-1", 0),
      actions: [action("view.setSearch", { query: "ada" }, "a")],
    });
    expect(first[0]?.ok).toBe(true);
    expect(turn.revision()).toBe(2);

    // Something else moves it: 2 → 3. The client re-reads the view before the
    // next phase, so the phase context now carries a revision the turn did not
    // cause. Adopting it would make the turn's next action look current.
    table.elsewhere();
    const stale = await turn.execute({
      // The client re-read the view before this phase, as it does, and the
      // revision it carries now includes a change the turn did not make.
      context: { ...phaseContext(table.session, "t-1", 1), viewRevision: 2 },
      actions: [action("view.setPage", { page: 2 }, "b")],
    });

    expect(stale[0]?.ok).toBe(false);
    expect(stale[0]?.error?.code).toBe("revision-mismatch");
    expect(table.state.page).toBe(1);
  });

  it("is not absorbed between two actions of one phase", async () => {
    const table = movableTable();
    const turn = createTurnExecution(
      table.session,
      phaseContext(table.session, "t-1", 0)
    );
    const context = phaseContext(table.session, "t-1", 0);

    const results = await turn.execute({
      context,
      actions: [
        action("view.setSearch", { query: "ada" }, "a"),
        action("view.setPage", { page: 2 }, "b"),
      ],
    });
    // Two of the turn's own actions in a row: the second is judged against
    // what the first produced, and both run.
    expect(results.every((r) => r.ok)).toBe(true);
    expect(table.state.page).toBe(2);

    // Now one from outside lands before a third action planned on the same
    // context. The turn's own progress does not cover it.
    table.elsewhere();
    const third = await turn.execute({
      context,
      actions: [action("view.setPage", { page: 3 }, "c")],
    });
    expect(third[0]?.ok).toBe(false);
    expect(third[0]?.error?.code).toBe("revision-mismatch");
    expect(table.state.page).toBe(2);
  });
});

describe("a revision the backend named for itself", () => {
  it("is honoured even when it equals the phase's own revision", async () => {
    const table = movableTable();
    const turn = createTurnExecution(
      table.session,
      phaseContext(table.session, "t-1", 0)
    );
    const context = phaseContext(table.session, "t-1", 0);

    // The turn's own first action moves the table to 2.
    await turn.execute({
      context,
      actions: [action("view.setSearch", { query: "ada" }, "a")],
    });

    // The backend says, deliberately, "I am acting on revision 1" — the same
    // revision its phase was answered for. That is a claim about what it saw,
    // and substituting the turn's later progress would run a write against a
    // view the backend never looked at.
    const named = await turn.execute({
      context,
      actions: [action("view.setPage", { page: 2 }, "b", 1)],
    });

    expect(named[0]?.ok).toBe(false);
    expect(named[0]?.error?.code).toBe("revision-mismatch");
    expect(table.state.page).toBe(1);
  });

  it("is honoured when it names the view the turn has actually reached", async () => {
    const table = movableTable();
    const turn = createTurnExecution(
      table.session,
      phaseContext(table.session, "t-1", 0)
    );
    const context = phaseContext(table.session, "t-1", 0);

    await turn.execute({
      context,
      actions: [action("view.setSearch", { query: "ada" }, "a")],
    });
    const named = await turn.execute({
      context,
      actions: [action("view.setPage", { page: 2 }, "b", 2)],
    });

    expect(named[0]?.ok).toBe(true);
    expect(table.state.page).toBe(2);
  });
});

describe("ordinary ordered work still runs", () => {
  it("filters then sorts in one phase, each against what the last produced", async () => {
    const table = movableTable();
    const turn = createTurnExecution(
      table.session,
      phaseContext(table.session, "t-1", 0)
    );

    const results = await turn.execute({
      context: phaseContext(table.session, "t-1", 0),
      actions: [
        action("view.setSearch", { query: "core" }, "a"),
        action("view.setPage", { page: 2 }, "b"),
      ],
    });

    expect(results.map((r) => r.ok)).toEqual([true, true]);
    expect(table.state.search).toBe("core");
    expect(table.state.page).toBe(2);
    expect(turn.revision()).toBe(3);
  });

  it("stops at a stop, and starts nothing after it", async () => {
    const table = movableTable();
    const turn = createTurnExecution(
      table.session,
      phaseContext(table.session, "t-1", 0)
    );
    const controller = new AbortController();
    controller.abort();

    const results = await turn.execute(
      {
        context: phaseContext(table.session, "t-1", 0),
        actions: [action("view.setPage", { page: 2 }, "a")],
      },
      controller.signal
    );

    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.error?.code).toBe("cancelled");
    expect(table.state.page).toBe(1);
  });
});

describe("a write waiting on a human", () => {
  it("is refused when the table moves while the approval is open", async () => {
    const state = { revision: 1 };
    const edits = vi.fn();
    let release: (() => void) | undefined;
    const session: AgentSession = createAgentSession({
      observe: (): AgentObservation => ({
        tableId: "orders",
        viewRevision: state.revision,
        featureIds: ["editing"],
        columns: [
          {
            id: "salary",
            label: "Salary",
            type: "number",
            readable: true,
            writable: true,
            sortable: true,
          },
        ],
        source: PAGE_ONLY,
        writePolicy: "allow",
        approval: "writes",
        commit: "immediate",
        hasPagination: false,
        hasSearch: false,
        hasSort: false,
        hasFilters: false,
        hasExport: false,
        hasEdit: true,
        hasReorder: false,
        page: 1,
        limit: 10,
        search: "",
        pageMax: 1,
        rowAddressScope: "visible",
      }),
      apply: {
        editCells: edits,
        resolveRow: (ref) =>
          "rowKey" in ref
            ? { rowKey: ref.rowKey, scope: "visible" as const }
            : { rowKey: "r1", scope: "visible" as const },
      },
      // The reader takes their time, and the table moves underneath them.
      onApprove: () =>
        new Promise((resolve) => {
          release = () => {
            resolve(true);
          };
        }),
    });

    const running = session.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "salary", value: 200 }] },
      1,
      "edit-1"
    );
    await vi.waitFor(() => {
      expect(release).toBeDefined();
    });
    state.revision += 1;
    release?.();

    const result = await running;
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("revision-mismatch");
    expect(edits).not.toHaveBeenCalled();
  });
});
