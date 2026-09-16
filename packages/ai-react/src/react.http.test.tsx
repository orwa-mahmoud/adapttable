/**
 * An HTTP turn driven against the real React binding.
 *
 * The revisions here are the table engine's own, arriving through the
 * provider, rather than a counter a test increments. That is the only way to
 * check the thing the executor exists to do: tell a filter that really moved
 * the table apart from an edit that arrived from somewhere else, when both
 * show up as the same number going up.
 */
import type { AgentSession } from "@adapttable/ai";
import { AGENT_SCHEMA_VERSION, runAgentHttpTurn } from "@adapttable/ai/http";
import {
  createNeutralTable,
  createTableEngine,
  type NeutralTable,
} from "@adapttable/core";
import { useFrontendData } from "@adapttable/react";
import {
  applyTableFeatures,
  FeatureProviders,
  usePublishTableRuntime,
} from "@adapttable/react/adapter";
import { act, render, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";

import { tableAgent } from "./react";

type TurnResult = Awaited<ReturnType<typeof runAgentHttpTurn>>;

interface Row {
  id: string;
  name: string;
  salary: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", salary: 120 },
  { id: "2", name: "Grace", salary: 140 },
];

const WIRED = {
  setPage: true,
  setLimit: true,
  setSearch: true,
  setSort: true,
  setFilters: true,
};

function makeTable() {
  const engine = createTableEngine<Row>({
    data: ROWS,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "salary", header: "Salary", sortable: true },
    ],
    rowKey: (row) => row.id,
  });
  const neutral = createNeutralTable(engine, "http-binding", {
    operations: () => WIRED,
  }) as NeutralTable<unknown>;
  return { engine, neutral };
}

type LiveTable = ReturnType<typeof makeTable>;

function Publisher({ engine, neutral }: LiveTable) {
  const rows = neutral.rows("visible");
  usePublishTableRuntime(rows, undefined, {
    rows,
    visibleRows: rows,
    neutralTable: neutral,
    getRowId: (row: unknown) => (row as Row).id,
    rowLabel: (row: unknown) => (row as Row).name,
    query: {
      page: 1,
      // One row a page, so the two rows above really are two pages and the
      // move to page 2 below is a move the table can make.
      limit: 1,
      search: "",
      setPage: (page: number) => engine.dispatch({ type: "setPage", page }),
      setLimit: (limit: number) => engine.dispatch({ type: "setLimit", limit }),
      setSearch: (search: string) =>
        engine.dispatch({ type: "setSearch", search }),
      setSort: (key?: string, dir?: "asc" | "desc") =>
        engine.dispatch({ type: "setSort", key, dir }),
      setExtras: (extra) =>
        engine.dispatch({ type: "setFilters", filters: extra }),
      clearExtras: () => engine.dispatch({ type: "setFilters", filters: {} }),
    },
  });
  return null;
}

function Harness({
  engine,
  neutral,
  onAttach,
}: LiveTable & { onAttach: (session: AgentSession) => void }) {
  const props = applyTableFeatures({
    features: [
      tableAgent({
        tableId: "http-binding",
        writePolicy: "allow",
        approval: "never",
        bridge: { attach: onAttach },
      }),
    ],
  });
  return (
    <FeatureProviders props={props}>
      <Publisher engine={engine} neutral={neutral} />
    </FeatureProviders>
  );
}

async function mounted() {
  const { engine, neutral } = makeTable();
  let session: AgentSession | undefined;
  render(
    <Harness
      engine={engine}
      neutral={neutral}
      onAttach={(live) => {
        session = live;
      }}
    />
  );
  await waitFor(() => {
    expect(session).toBeDefined();
  });
  if (!session) throw new Error("the binding never attached a session");
  return { engine, session };
}

function FrontendPublisher({
  state,
}: {
  state: {
    search: string;
    sortBy?: string;
    setSearch?: (search: string) => void;
  };
}) {
  const source = useFrontendData({
    data: ROWS,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "salary", header: "Salary", sortable: true },
    ],
    getRowId: (row) => row.id,
    urlSync: false,
  });
  const engine = source.tableEngine;
  if (!engine) throw new Error("useFrontendData did not publish its engine");
  const neutral = useMemo(
    () =>
      createNeutralTable(engine, "http-frontend-binding", {
        operations: () => WIRED,
      }) as NeutralTable<unknown>,
    [engine]
  );
  state.search = source.search;
  state.sortBy = source.sortBy;
  state.setSearch = source.setSearch;
  usePublishTableRuntime(source.rows, undefined, {
    rows: source.rows,
    visibleRows: source.rows,
    neutralTable: neutral,
    getRowId: (row: unknown) => (row as Row).id,
    rowLabel: (row: unknown) => (row as Row).name,
    query: {
      page: source.page,
      limit: source.limit,
      search: source.search,
      sortBy: source.sortBy,
      sortDir: source.sortDir,
      setPage: source.setPage,
      setLimit: source.setLimit,
      setSearch: source.setSearch,
      setSort: source.setSort,
      setExtras: source.setExtras,
      clearExtras: source.clearExtras,
    },
  });
  return null;
}

async function mountedFrontend() {
  const state: {
    search: string;
    sortBy?: string;
    setSearch?: (search: string) => void;
  } = { search: "" };
  let session: AgentSession | undefined;
  const props = applyTableFeatures({
    features: [
      tableAgent({
        tableId: "http-frontend-binding",
        writePolicy: "allow",
        approval: "never",
        columns: {
          name: { type: "string", sortable: true },
          salary: { type: "number", sortable: true },
        },
        bridge: {
          attach: (live) => {
            session = live;
          },
        },
      }),
    ],
  });
  render(
    <FeatureProviders props={props}>
      <FrontendPublisher state={state} />
    </FeatureProviders>
  );
  await waitFor(() => {
    expect(session).toBeDefined();
  });
  if (!session)
    throw new Error("the frontend binding never attached a session");
  return { session, state };
}

function ServerPublisher({
  state,
}: {
  state: {
    search: string;
    sortBy?: string;
    setSearch?: (value: string) => void;
  };
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>();
  state.search = search;
  state.sortBy = sortBy;
  state.setSearch = setSearch;
  usePublishTableRuntime(ROWS, undefined, {
    rows: ROWS,
    visibleRows: ROWS,
    getRowId: (row: unknown) => (row as Row).id,
    rowLabel: (row: unknown) => (row as Row).name,
    query: {
      page: 1,
      limit: 10,
      search,
      sortBy,
      sortDir: sortBy ? "desc" : undefined,
      setPage: () => undefined,
      setLimit: () => undefined,
      setSearch,
      setSort: (key) => setSortBy(key),
    },
  });
  return null;
}

async function mountedServer() {
  const state: {
    search: string;
    sortBy?: string;
    setSearch?: (value: string) => void;
  } = { search: "" };
  let session: AgentSession | undefined;
  const props = applyTableFeatures({
    features: [
      tableAgent({
        tableId: "http-server-binding",
        approval: "never",
        columns: {
          name: { type: "string", sortable: true },
          salary: { type: "number", sortable: true },
        },
        bridge: {
          attach: (live) => {
            session = live;
          },
        },
      }),
    ],
  });
  render(
    <FeatureProviders props={props}>
      <ServerPublisher state={state} />
    </FeatureProviders>
  );
  await waitFor(() => {
    expect(session).toBeDefined();
  });
  if (!session) throw new Error("the server binding never attached a session");
  return { session, state };
}

describe("an HTTP turn over the live React binding", () => {
  it("runs filter then sort in one reply, following the table it moved", async () => {
    const { engine, session } = await mounted();
    const opening = session.manifest().viewRevision;

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Active, salary first", {
        endpoint: "https://agent.example/turn",
        request: () =>
          Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Done.",
            toolCalls: [
              {
                id: "search-ada",
                name: "view.setSearch",
                args: { search: "ada" },
              },
              {
                id: "sort-salary",
                name: "view.setSort",
                args: { key: "salary", dir: "desc" },
              },
            ],
          }),
      });
    });

    // The search moved the engine's own view revision, and the sort was
    // judged against where the search left it rather than being refused. The
    // provider render may publish later, but the binding can attribute the
    // neutral engine's synchronous revision before another call starts.
    expect(result.results.map((entry) => entry.ok)).toEqual([true, true]);
    expect(result.results.map((entry) => entry.revision)).toEqual([
      opening + 1,
      opening + 2,
    ]);
    expect(engine.snapshot().search).toBe("ada");
    expect(engine.snapshot().sortBy).toBe("salary");
    expect(engine.snapshot().sortDir).toBe("desc");
  });

  it("keeps useFrontendData search then sort in one reply", async () => {
    const { session, state } = await mountedFrontend();

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Ada, salary first", {
        endpoint: "https://agent.example/turn",
        request: () =>
          Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Done.",
            toolCalls: [
              {
                id: "server-search-ada",
                name: "view.setSearch",
                args: { search: "ada" },
              },
              {
                id: "server-sort-salary",
                name: "view.setSort",
                args: { key: "salary", dir: "desc" },
              },
            ],
          }),
      });
    });

    expect(result.results.map((entry) => entry.ok)).toEqual([true, true]);
    expect(state).toMatchObject({ search: "ada", sortBy: "salary" });
  });

  it("flushes a pending reader change before admitting useFrontendData work", async () => {
    const { session, state } = await mountedFrontend();

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Sort by salary", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // React has accepted the reader's update but has not committed the
          // frontend engine yet. Admission flushes it before checking the
          // revision; the agent may not claim it as part of its own sort.
          state.setSearch?.("grace");
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "sort-after-reader",
                name: "view.setSort",
                args: { key: "salary", dir: "desc" },
              },
            ],
          });
        },
      });
    });

    expect(result.results[0]?.error?.code).toBe("revision-mismatch");
    expect(state.search).toBe("grace");
    expect(state.sortBy).toBeUndefined();
  });

  it("bumps and checks a server query revision with no neutral engine", async () => {
    const { session, state } = await mountedServer();
    const opening = session.manifest().viewRevision;

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Sort by salary", {
        endpoint: "https://agent.example/turn",
        request: () => {
          state.setSearch?.("grace");
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            toolCalls: [
              {
                id: "server-sort-after-reader",
                name: "view.setSort",
                args: { key: "salary", dir: "desc" },
              },
            ],
          });
        },
      });
    });

    expect(result.results[0]?.error?.code).toBe("revision-mismatch");
    expect(session.manifest().viewRevision).toBeGreaterThan(opening);
    expect(state.search).toBe("grace");
    expect(state.sortBy).toBeUndefined();
  });

  it("refuses the reply when the table was edited during the model call", async () => {
    const { engine, session } = await mounted();

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Sort by salary", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // A person searches the table while the backend is still thinking.
          engine.dispatch({ type: "setSearch", search: "grace" });
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Sorted.",
            toolCalls: [
              {
                id: "sort-stale",
                name: "view.setSort",
                args: { key: "salary", dir: "desc" },
              },
            ],
          });
        },
      });
    });

    expect(result.results[0]?.ok).toBe(false);
    expect(result.results[0]?.error?.code).toBe("revision-mismatch");
    // The person's search stands, and nothing was written over it.
    expect(engine.snapshot().search).toBe("grace");
    expect(engine.snapshot().sortBy).toBeUndefined();
  });

  it("leaves a rerender that changed nothing out of the way", async () => {
    const { engine, session } = await mounted();

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Page 2", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // Re-dispatching the search the table already has produces no
          // change, so the engine publishes no revision and the action runs.
          engine.dispatch({ type: "setSearch", search: "" });
          return Promise.resolve({
            schemaVersion: AGENT_SCHEMA_VERSION,
            text: "Paged.",
            toolCalls: [
              { id: "page-2", name: "view.setPage", args: { page: 2 } },
            ],
          });
        },
      });
    });

    expect(result.results[0]?.ok).toBe(true);
    expect(engine.snapshot().requestedPage).toBe(2);
  });
});
