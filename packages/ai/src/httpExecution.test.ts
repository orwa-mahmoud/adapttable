import { describe, expect, it, vi } from "vitest";

import { createTurnExecution, phaseContext } from "./httpExecution";
import { createAgentSession } from "./session";
import type { AgentObservation } from "./types";

const PAGE_ONLY = {
  fullDataset: false,
  grouping: false as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: ["filters", "editing"],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: true,
        sortable: true,
      },
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
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: true,
    hasExport: false,
    hasEdit: true,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

/**
 * A table whose revision the test moves, standing in for the live host.
 * `state.revision` is the only way anything here advances, so an "external"
 * change and an apply's own effect are told apart by which one wrote it.
 */
function liveTable(apply: Record<string, unknown> = {}) {
  const state = { revision: 1 };
  const session = createAgentSession({
    observe: () => observation({ viewRevision: state.revision }),
    apply: {
      setPage: vi.fn(),
      setFilters: vi.fn(),
      setSort: vi.fn(),
      ...apply,
    },
  });
  return { session, state };
}

const PAGE_TWO = {
  key: "view.setPage",
  args: { page: 2 },
  idempotencyKey: "page-2",
};

const FILTER_ACTIVE = {
  key: "view.setFilters",
  args: { filters: { status: ["Active"] } },
  idempotencyKey: "filter-active",
};

const SORT_SALARY = {
  key: "view.setSort",
  args: { key: "salary", dir: "desc" as const },
  idempotencyKey: "sort-salary",
};

describe("phase-bound action execution", () => {
  it("rejects an omitted revision when the table moved during the model call", async () => {
    const setPage = vi.fn();
    const { session, state } = liveTable({ setPage });
    const context = phaseContext(session, "turn-1", 0);

    // The edit a person made while the backend was still thinking.
    state.revision = 2;

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({ context, actions: [PAGE_TWO] });

    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.error?.code).toBe("revision-mismatch");
    expect(setPage).not.toHaveBeenCalled();
  });

  it("treats a named origin revision exactly like an omitted one", async () => {
    const setPage = vi.fn();
    const { session, state } = liveTable({ setPage });
    const context = phaseContext(session, "turn-1", 0);
    state.revision = 2;

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({
      context,
      actions: [{ ...PAGE_TWO, expectedRevision: context.viewRevision }],
    });

    expect(results[0]?.error?.code).toBe("revision-mismatch");
    expect(setPage).not.toHaveBeenCalled();
  });

  it("passes a revision the backend named for itself straight to the session", async () => {
    const setPage = vi.fn();
    const { session, state } = liveTable({ setPage });
    const context = phaseContext(session, "turn-1", 0);
    // The backend saw revision 2 and said so; the table is there too.
    state.revision = 2;

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({
      context,
      actions: [{ ...PAGE_TWO, expectedRevision: 2 }],
    });

    expect(results[0]?.ok).toBe(true);
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("cancels every remaining action when the request is aborted", async () => {
    const setPage = vi.fn();
    const { session } = liveTable({ setPage });
    const context = phaseContext(session, "turn-1", 0);
    const execution = createTurnExecution(session, context);
    const results = await execution.execute(
      { context, actions: [PAGE_TWO, FILTER_ACTIVE] },
      AbortSignal.abort()
    );
    expect(results.map((result) => result.error?.code)).toEqual([
      "cancelled",
      "cancelled",
    ]);
    expect(setPage).not.toHaveBeenCalled();
  });

  it("treats a missing args bag as an empty one", async () => {
    const { session } = liveTable();
    const context = phaseContext(session, "turn-1", 0);
    const execution = createTurnExecution(session, context);
    const results = await execution.execute({
      context,
      actions: [{ key: "view.setPage", idempotencyKey: "no-args" }],
    });
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.error?.code).toBe("invalid-arguments");
  });

  it("runs an omitted revision when the render in between changed nothing", async () => {
    const setPage = vi.fn();
    const { session, state } = liveTable({ setPage });
    const context = phaseContext(session, "turn-1", 0);

    // A re-render that produced the same view leaves the revision alone, so
    // there is nothing here for write safety to trip over.
    state.revision = 1;

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({ context, actions: [PAGE_TWO] });

    expect(results[0]?.ok).toBe(true);
    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("chains filter then sort on the revision the filter's own apply produced", async () => {
    const state = { revision: 1 };
    const setFilters = vi.fn(() => {
      state.revision += 1;
    });
    const setSort = vi.fn(() => {
      state.revision += 1;
    });
    const session = createAgentSession({
      observe: () => observation({ viewRevision: state.revision }),
      apply: { setFilters, setSort },
    });
    const context = phaseContext(session, "turn-1", 0);

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({
      context,
      actions: [FILTER_ACTIVE, SORT_SALARY],
    });

    expect(results.map((entry) => entry.ok)).toEqual([true, true]);
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setSort).toHaveBeenCalledWith("salary", "desc");
    expect(execution.revision()).toBe(3);
  });

  it("does not guess that an unattributed delayed callback moved the table", async () => {
    // This plain host returns before it publishes any evidence of its own
    // change. By the time the next action starts there is a newer revision,
    // but no way to distinguish that revision from another writer's. The safe
    // answer is to refuse; the React binding's attributable engine path is
    // covered in react.http.test.tsx.
    const state = { revision: 1 };
    const setFilters = vi.fn(() => {
      void Promise.resolve().then(() => {
        state.revision += 1;
      });
    });
    const setSort = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ viewRevision: state.revision }),
      apply: { setFilters, setSort },
    });
    const context = phaseContext(session, "turn-1", 0);

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({
      context,
      actions: [FILTER_ACTIVE, SORT_SALARY],
    });

    expect(results[0]?.ok).toBe(true);
    expect(results[1]?.error?.code).toBe("revision-mismatch");
    expect(setSort).not.toHaveBeenCalled();
  });

  it("refuses a whole plan whose opening view the table has left", async () => {
    // A plan written for a view the reader has since moved past applies none
    // of itself.
    const setFilters = vi.fn();
    const setSort = vi.fn();
    const { session, state } = liveTable({ setFilters, setSort });
    const context = phaseContext(session, "turn-1", 0);

    // The edit a person made while the backend was writing this plan.
    state.revision = 2;

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({
      context,
      actions: [FILTER_ACTIVE, SORT_SALARY],
    });

    expect(results.map((entry) => entry.error?.code)).toEqual([
      "revision-mismatch",
      "revision-mismatch",
    ]);
    expect(setFilters).not.toHaveBeenCalled();
    expect(setSort).not.toHaveBeenCalled();
  });

  it("refuses the next action when an outside change lands between two of them", async () => {
    const state = { revision: 1 };
    const setFilters = vi.fn(() => {
      state.revision += 1;
    });
    const setSort = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ viewRevision: state.revision }),
      apply: { setFilters, setSort },
    });
    const context = phaseContext(session, "turn-1", 0);
    const execution = createTurnExecution(session, context);

    const applied = await execution.execute({
      context,
      actions: [FILTER_ACTIVE],
    });
    // Someone else edited the table between the two actions of this turn.
    state.revision += 1;
    const after = await execution.execute({ context, actions: [SORT_SALARY] });

    expect(applied[0]?.ok).toBe(true);
    expect(after[0]?.error?.code).toBe("revision-mismatch");
    expect(setSort).not.toHaveBeenCalled();
  });

  it("carries proven progress into a later phase answered on the older view", async () => {
    const state = { revision: 1 };
    const setFilters = vi.fn(() => {
      state.revision += 1;
    });
    const setSort = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ viewRevision: state.revision }),
      apply: { setFilters, setSort },
    });
    // Both phases were prepared before anything applied, so both name 1.
    const first = phaseContext(session, "turn-1", 0);
    const second = phaseContext(session, "turn-1", 1);

    const execution = createTurnExecution(session, first);
    const applied = await execution.execute({
      context: first,
      actions: [FILTER_ACTIVE],
    });
    const dependent = await execution.execute({
      context: second,
      actions: [SORT_SALARY],
    });

    expect(applied[0]?.ok).toBe(true);
    // The sort's phase named revision 1, but this turn's own filter moved the
    // table to 2, and that movement is accounted for — so the sort still runs.
    expect(dependent[0]?.ok).toBe(true);
    expect(setSort).toHaveBeenCalledWith("salary", "desc");
  });

  it("rebases onto a phase answered against a newer view", async () => {
    const setPage = vi.fn();
    const { session, state } = liveTable({ setPage });
    const first = phaseContext(session, "turn-1", 0);
    // An edit landed, and the phase after it described the table as it then
    // was — that is the view its reply answers.
    state.revision = 5;
    const second = phaseContext(session, "turn-1", 1);

    const execution = createTurnExecution(session, first);
    const results = await execution.execute({
      context: second,
      actions: [PAGE_TWO],
    });

    expect(results[0]?.ok).toBe(true);
    expect(execution.revision()).toBe(5);
  });

  it("addresses a row by position against the revision that position belongs to", async () => {
    const state = { revision: 1 };
    const resolveRow = vi.fn(() => ({
      rowKey: "r1",
      scope: "visible" as const,
    }));
    const session = createAgentSession({
      observe: () => observation({ viewRevision: state.revision }),
      apply: { resolveRow },
    });
    const context = phaseContext(session, "turn-1", 0);
    state.revision = 2;

    const execution = createTurnExecution(session, context);
    const results = await execution.execute({
      context,
      actions: [
        {
          key: "rows.resolve",
          args: { row: { index: 0, expectedRevision: context.viewRevision } },
          idempotencyKey: "resolve-0",
        },
      ],
    });

    // A position means nothing once the view it counted has moved on.
    expect(results[0]?.ok).toBe(false);
    expect(resolveRow).not.toHaveBeenCalled();
  });

  it("reports every action cancelled once the signal aborts, running none", async () => {
    const setPage = vi.fn();
    const { session } = liveTable({ setPage });
    const context = phaseContext(session, "turn-1", 0);
    const controller = new AbortController();
    controller.abort();

    const execution = createTurnExecution(session, context);
    const results = await execution.execute(
      {
        context,
        actions: [PAGE_TWO, { ...PAGE_TWO, idempotencyKey: "page-3" }],
      },
      controller.signal
    );

    expect(results.map((entry) => entry.error?.code)).toEqual([
      "cancelled",
      "cancelled",
    ]);
    expect(setPage).not.toHaveBeenCalled();
  });

  it("leaves the baseline alone while a write waits on a human", async () => {
    const editCells = vi.fn();
    const session = createAgentSession({
      observe: () => observation({ approval: "writes" }),
      apply: {
        editCells,
        resolveRow: () => ({ rowKey: "r1", scope: "visible" as const }),
      },
      // Never settles: the human has not answered yet.
      onApprove: () => new Promise<never>(() => undefined),
    });
    const context = phaseContext(session, "turn-1", 0);
    const execution = createTurnExecution(session, context);

    void execution.execute({
      context,
      actions: [
        {
          key: "edit.cells",
          args: { edits: [{ rowKey: "r1", column: "name", value: "Grace" }] },
          idempotencyKey: "edit-1",
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(editCells).not.toHaveBeenCalled();
    expect(execution.revision()).toBe(context.viewRevision);
  });
});
