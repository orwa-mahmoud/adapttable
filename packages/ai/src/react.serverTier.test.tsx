/**
 * The agent binding against a table whose rows live on a server.
 *
 * A frontend table publishes a neutral engine and the binding reads
 * everything through it. A server-tier table has no engine — `tableEngine` is
 * the frontend tier's — so every capability falls back to the runtime view
 * the chrome publishes. That fallback is the whole binding for anyone on
 * `useQuerySource`, and it is a separate code path from the engine one.
 */
import {
  applyTableFeatures,
  FeatureProviders,
  type TableRuntimeView,
  useFeatureState,
  usePublishTableRuntime,
} from "@adapttable/react/adapter";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { TABLE_AGENT_STATE, tableAgent } from "./react";
import type { AgentSession, ExecuteResult, RowWindow } from "./types";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "Core" },
  { id: "2", name: "Zoe", team: "Docs" },
  { id: "3", name: "Ravi", team: "Docs" },
];

/** Publishes a runtime view with NO `neutralTable` — the server-tier shape. */
function Publisher({ view }: { view: TableRuntimeView<Row> }) {
  usePublishTableRuntime(view.visibleRows ?? view.rows, undefined, view);
  return null;
}

function Reader({ onSession }: { onSession: (s: AgentSession) => void }) {
  const session = useFeatureState(TABLE_AGENT_STATE);
  useEffect(() => {
    if (session) onSession(session);
  }, [session, onSession]);
  return null;
}

const QUERY: NonNullable<TableRuntimeView<Row>["query"]> = {
  page: 1,
  limit: 10,
  search: "",
  setPage: () => undefined,
  setLimit: () => undefined,
  setSearch: () => undefined,
  setSort: () => undefined,
};

interface ViewOverrides {
  readonly visibleRows?: readonly Row[];
  readonly editing?: NonNullable<TableRuntimeView<Row>["editing"]>;
  readonly selection?: NonNullable<TableRuntimeView<Row>["selection"]>;
  readonly groupingState?: NonNullable<TableRuntimeView<Row>["groupingState"]>;
  readonly query?: NonNullable<TableRuntimeView<Row>["query"]>;
}

function serverView(overrides: ViewOverrides = {}): TableRuntimeView<Row> {
  return {
    rows: ROWS,
    getRowId: (row) => row.id,
    rowLabel: (row) => row.name,
    ...overrides,
  };
}

type AgentOptions = Parameters<typeof tableAgent>[0];

async function mount(
  view: TableRuntimeView<Row>,
  options: Partial<AgentOptions> = {},
  extraFeatureIds: readonly string[] = []
): Promise<AgentSession> {
  let settle: ((s: AgentSession) => void) | undefined;
  const ready = new Promise<AgentSession>((resolve) => {
    settle = resolve;
  });
  const props = applyTableFeatures({
    features: [
      tableAgent({
        approval: "never",
        columns: {
          name: { type: "string", writable: true },
          team: { type: "string" },
        },
        ...options,
        tableId: options.tableId ?? "server",
      }),
      ...extraFeatureIds.map((id) => ({ id })),
    ],
  });
  render(
    <FeatureProviders props={props}>
      <Publisher view={view} />
      <Reader
        onSession={(s) => {
          settle?.(s);
        }}
      />
    </FeatureProviders>
  );
  const session = await ready;
  await waitFor(() => {
    expect(session.catalog().length).toBeGreaterThan(0);
  });
  return session;
}

const run = (
  session: AgentSession,
  key: string,
  args: unknown,
  idempotencyKey: string
): Promise<ExecuteResult> =>
  session.execute(key, args, session.manifest().viewRevision, idempotencyKey);

describe("agent binding without an engine — reading", () => {
  it("reads a window of rows out of the published view", async () => {
    const session = await mount(serverView());
    const result = await run(
      session,
      "rows.read",
      { offset: 1, limit: 2 },
      "r1"
    );

    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({
      rows: [
        { rowKey: "2", cells: { name: "Zoe", team: "Docs" } },
        { rowKey: "3", cells: { name: "Ravi", team: "Docs" } },
      ],
      offset: 1,
      limit: 2,
    });
  });

  it("reads the rendered rows for the visible scope and the whole page for page", async () => {
    const session = await mount(
      serverView({ visibleRows: [ROWS[1]!, ROWS[2]!] })
    );

    const visible = await run(
      session,
      "rows.read",
      { offset: 0, limit: 10, scope: "visible" },
      "r-visible"
    );
    const all = await run(
      session,
      "rows.read",
      { offset: 0, limit: 10, scope: "page" },
      "r-all"
    );

    expect((visible.result as RowWindow).rows.map((r) => r.rowKey)).toEqual([
      "2",
      "3",
    ]);
    expect((all.result as RowWindow).rows.map((r) => r.rowKey)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("never returns more rows than readMax, whatever was asked for", async () => {
    const session = await mount(serverView(), { readMax: 2 });
    const result = await run(
      session,
      "rows.read",
      { offset: 0, limit: 50 },
      "r-max"
    );

    expect((result.result as RowWindow).rows).toHaveLength(2);
    expect(result.result).toMatchObject({ limit: 2 });
  });

  it("names a column the agent may not read as redacted rather than sending it", async () => {
    const session = await mount(serverView(), {
      columns: {
        name: { type: "string" },
        team: { type: "string", readable: false },
      },
    });
    const result = await run(
      session,
      "rows.read",
      { offset: 0, limit: 1 },
      "r-red"
    );

    const window = result.result as RowWindow;
    expect(window.rows[0]?.cells).toEqual({ name: "Ada" });
    expect(window.redacted).toContain("team");
  });

  it("answers a replayed read from the record rather than reading again", async () => {
    const session = await mount(serverView());
    const first = await run(
      session,
      "rows.read",
      { offset: 0, limit: 1 },
      "replay"
    );
    const again = await run(
      session,
      "rows.read",
      { offset: 0, limit: 1 },
      "replay"
    );

    expect(again.idempotencyKey).toBe("replay");
    expect(again.result).toEqual(first.result);
  });

  it("resolves a 1-based position to the row key at it", async () => {
    const session = await mount(serverView());
    const result = await run(
      session,
      "rows.resolve",
      {
        position: 2,
        scope: "visible",
        expectedRevision: session.manifest().viewRevision,
      },
      "resolve-1"
    );

    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({ rowKey: "2", position: 2 });
  });

  it("refuses a position past the end rather than inventing a row", async () => {
    const session = await mount(serverView());
    const result = await run(
      session,
      "rows.resolve",
      {
        position: 99,
        scope: "visible",
        expectedRevision: session.manifest().viewRevision,
      },
      "resolve-past"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/no row at 1-based position 99/);
  });

  it("passes a row key straight back without looking it up", async () => {
    const session = await mount(serverView());
    const result = await run(
      session,
      "rows.resolve",
      { rowKey: "3" },
      "resolve-key"
    );

    expect(result.result).toMatchObject({ rowKey: "3" });
  });
});

describe("agent binding without an engine — writing", () => {
  it("edits a cell through the host's own callback", async () => {
    const onCellEdit = vi.fn();
    const session = await mount(
      serverView({ editing: { onCellEdit } }),
      { commit: "immediate" },
      ["editing"]
    );
    const result = await run(
      session,
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "Ada L." }] },
      "edit-1"
    );

    expect(result.ok).toBe(true);
    expect(onCellEdit).toHaveBeenCalledWith(ROWS[0], "name", "Ada L.");
  });

  it("refuses an edit to a row the current view does not hold", async () => {
    const onCellEdit = vi.fn();
    const session = await mount(
      serverView({ editing: { onCellEdit } }),
      { commit: "immediate" },
      ["editing"]
    );
    const result = await run(
      session,
      "edit.cells",
      { edits: [{ rowKey: "missing", column: "name", value: "x" }] },
      "edit-missing"
    );

    // The envelope still succeeds — the row-level report is where a partial
    // write says what it could not do.
    expect(result.result).toMatchObject({
      applied: false,
      results: [
        {
          rowKey: "missing",
          column: "name",
          ok: false,
          error: { message: 'row "missing" is not in the current view' },
        },
      ],
    });
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("stages a cell as text when the commit policy stages", async () => {
    const stageCell = vi.fn();
    const session = await mount(serverView({ editing: { stageCell } }), {}, [
      "editing",
    ]);
    const result = await run(
      session,
      "edit.cells",
      { edits: [{ rowKey: "2", column: "name", value: 7 }] },
      "stage-1"
    );

    expect(result.ok).toBe(true);
    expect(stageCell).toHaveBeenCalledWith(ROWS[1], "2", "name", "7");
  });

  it("refuses a direct write when only the batch channel is wired", async () => {
    const stageCell = vi.fn();
    const session = await mount(
      serverView({ editing: { stageCell } }),
      { commit: "immediate" },
      ["editing"]
    );
    const result = await run(
      session,
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "x" }] },
      "edit-batch-only"
    );

    expect(result.result).toMatchObject({
      applied: false,
      results: [{ ok: false, error: { message: "editCells is not wired" } }],
    });
    expect(stageCell).not.toHaveBeenCalled();
  });

  it("refuses to stage when batch editing is not composed", async () => {
    const onCellEdit = vi.fn();
    const session = await mount(serverView({ editing: { onCellEdit } }), {}, [
      "editing",
    ]);
    const result = await run(
      session,
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "x" }] },
      "stage-unwired"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/stageCells is not wired/);
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("refuses to stage a row the current view does not hold", async () => {
    const stageCell = vi.fn();
    const session = await mount(serverView({ editing: { stageCell } }), {}, [
      "editing",
    ]);
    const result = await run(
      session,
      "edit.cells",
      { edits: [{ rowKey: "missing", column: "name", value: "x" }] },
      "stage-missing"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/is not in the current view/);
    expect(stageCell).not.toHaveBeenCalled();
  });

  it("refuses an edit that names no column", async () => {
    const onCellEdit = vi.fn();
    const session = await mount(
      serverView({ editing: { onCellEdit } }),
      { commit: "immediate" },
      ["editing"]
    );
    const result = await run(
      session,
      "edit.cells",
      { edits: [{ rowKey: "1", value: "x" }] },
      "edit-no-column"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/column is required/);
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("replaces the selection through the view's own selection", async () => {
    const replace = vi.fn();
    const session = await mount(
      serverView({ selection: { selectedIds: new Set<string>(), replace } })
    );
    const result = await run(
      session,
      "view.setSelection",
      { ids: ["1", "3"] },
      "select-1"
    );

    expect(result.ok).toBe(true);
    expect(replace).toHaveBeenCalledWith(["1", "3"]);
  });

  it("groups by a column through the view's grouping state", async () => {
    const setGroupBy = vi.fn();
    const session = await mount(
      {
        ...serverView({
          groupingState: {
            groupBy: undefined,
            aggregateOverrides: {},
            columnLabel: (key) => key,
            setGroupBy,
          },
        }),
        sourceCapabilities: {
          fullDataset: true,
          grouping: "client",
          selectAcrossPages: true,
          exportScope: "all",
          totalCount: "exact",
        },
      },
      {},
      ["grouping"]
    );
    const result = await run(
      session,
      "view.setGroupBy",
      { key: "team" },
      "group-1"
    );

    expect(result.ok).toBe(true);
    expect(setGroupBy).toHaveBeenCalledWith("team");
  });
});

describe("agent binding without an engine — filters", () => {
  const filterSession = (setExtras: () => void, clearExtras: () => void) =>
    mount(serverView({ query: { ...QUERY, setExtras, clearExtras } }), {}, [
      "filters",
    ]);

  it("sets the extras a filter object names", async () => {
    const setExtras = vi.fn();
    const clearExtras = vi.fn();
    const session = await filterSession(setExtras, clearExtras);
    const result = await run(
      session,
      "view.setFilters",
      { filters: { team: "Docs" } },
      "filter-1"
    );

    expect(result.ok).toBe(true);
    expect(setExtras).toHaveBeenCalledWith({ team: "Docs" });
    expect(clearExtras).not.toHaveBeenCalled();
  });

  it("clears the extras for an empty object", async () => {
    const setExtras = vi.fn();
    const clearExtras = vi.fn();
    const session = await filterSession(setExtras, clearExtras);
    const result = await run(
      session,
      "view.setFilters",
      { filters: {} },
      "filter-empty"
    );

    expect(result.ok).toBe(true);
    expect(clearExtras).toHaveBeenCalledTimes(1);
    expect(setExtras).not.toHaveBeenCalled();
  });

  it("clears the extras when the filter argument is null", async () => {
    const setExtras = vi.fn();
    const clearExtras = vi.fn();
    const session = await filterSession(setExtras, clearExtras);
    const result = await run(
      session,
      "view.setFilters",
      { filters: null },
      "filter-null"
    );

    expect(result.ok).toBe(true);
    expect(clearExtras).toHaveBeenCalledTimes(1);
    expect(setExtras).not.toHaveBeenCalled();
  });

  it("refuses a filter argument that is not an object", async () => {
    const session = await filterSession(vi.fn(), vi.fn());
    const result = await run(
      session,
      "view.setFilters",
      { filters: ["team"] },
      "filter-array"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/requires a filter object/);
  });
});

describe("agent binding without an engine — what it will not fake", () => {
  it("offers the view operations the published query actually wires", async () => {
    const session = await mount(serverView({ query: QUERY }));

    expect(session.catalog().map((entry) => entry.key)).toContain(
      "view.setPage"
    );
  });

  it("does not offer paging when the view publishes no query at all", async () => {
    const session = await mount(serverView());

    expect(session.catalog().map((entry) => entry.key)).not.toContain(
      "view.setPage"
    );
  });
});
