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
  applyTableFeatures,
  type FeatureProviderProps,
  FeatureProviders,
  type TableFeature,
  type TableRuntimeView,
  usePublishTableRuntime,
  useTableRuntime,
} from "@adapttable/react/adapter";
import { DataTable } from "@adapttable/unstyled";
import { act, render, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { tableAgent } from "./react";

type TurnResult = Awaited<ReturnType<typeof runAgentHttpTurn>>;
type Query = NonNullable<TableRuntimeView["query"]>;

interface Row {
  id: string;
  name: string;
  salary: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", salary: 120 },
  { id: "2", name: "Grace", salary: 140 },
];

/** Reads the table's runtime, for the reader's side of a test. */
interface LiveQuery {
  current?: () => Query | undefined;
}

function queryProbe(live: LiveQuery): TableFeature<Row> {
  function Provider({ children }: FeatureProviderProps) {
    const runtime = useTableRuntime();
    useEffect(() => {
      live.current = () => runtime.view()?.query;
    }, [runtime]);
    return children;
  }
  return { id: "query-probe", provider: { Provider } };
}

/** The query the table last published; throws when it has published none. */
function readerQuery(live: LiveQuery): Query {
  const query = live.current?.();
  if (!query) throw new Error("The table published no query");
  return query;
}

/** A real unstyled table whose features include the agent under test. */
async function mounted(
  tableId: string,
  limit?: number
): Promise<{ session: AgentSession; live: LiveQuery }> {
  const live: LiveQuery = {};
  let session: AgentSession | undefined;
  const features = [
    tableAgent({
      tableId,
      writePolicy: "allow",
      approval: "never",
      columns: {
        name: { type: "string", sortable: true },
        salary: { type: "number", sortable: true },
      },
      bridge: {
        attach: (next) => {
          session = next;
        },
      },
    }),
    queryProbe(live),
  ];
  render(
    <DataTable<Row>
      data={ROWS}
      columns={[
        { key: "name", header: "Name", sortable: true },
        { key: "salary", header: "Salary", sortable: true },
      ]}
      rowKey={(row) => row.id}
      features={features}
      urlSync={false}
      defaults={limit === undefined ? undefined : { limit }}
    />
  );
  await waitFor(() => {
    expect(session).toBeDefined();
    expect(live.current).toBeDefined();
  });
  if (!session) throw new Error("the table never attached a session");
  return { session, live };
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
  usePublishTableRuntime({
    rows: () => ROWS,
    labels: () => undefined,
    view: () => ({
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
    }),
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
    const { session, live } = await mounted("http-binding", 1);
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
    expect(readerQuery(live)).toMatchObject({
      search: "ada",
      sortBy: "salary",
      sortDir: "desc",
    });
  });

  it("keeps useFrontendData search then sort in one reply", async () => {
    const { session, live } = await mounted("http-frontend-binding");

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
    expect(readerQuery(live)).toMatchObject({
      search: "ada",
      sortBy: "salary",
    });
  });

  it("flushes a pending reader change before admitting useFrontendData work", async () => {
    const { session, live } = await mounted("http-frontend-binding");

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Sort by salary", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // React has accepted the reader's update but has not committed the
          // frontend engine yet. Admission flushes it before checking the
          // revision; the agent may not claim it as part of its own sort.
          readerQuery(live).setSearch("grace");
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
    expect(readerQuery(live).search).toBe("grace");
    expect(readerQuery(live).sortBy).toBeUndefined();
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
    const { session, live } = await mounted("http-binding", 1);

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Sort by salary", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // A person searches the table while the backend is still thinking.
          readerQuery(live).setSearch("grace");
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
    expect(readerQuery(live).search).toBe("grace");
    expect(readerQuery(live).sortBy).toBeUndefined();
  });

  it("leaves a rerender that changed nothing out of the way", async () => {
    const { session, live } = await mounted("http-binding", 1);

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Page 2", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // Re-sending the search the table already has produces no change,
          // so the engine publishes no revision and the action runs.
          readerQuery(live).setSearch("");
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
    expect(readerQuery(live).page).toBe(2);
  });
});
