/** HTTP execution over committed Angular frontend and server-tier sources. */
import type { AgentSession } from "@adapttable/ai";
import { AGENT_SCHEMA_VERSION, runAgentHttpTurn } from "@adapttable/ai/http";
import { injectFrontendData, type TableRuntimeView } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { createNeutralTable, createTableEngine } from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { tableAgent as mountedTableAgent } from "./tableAgent";
import {
  act,
  mountRuntime,
  testAgent as tableAgent,
  waitFor,
} from "./tableAgent.fixture";

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
const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "salary", header: "Salary", sortable: true },
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
    columns: COLUMNS,
    rowKey: (row) => row.id,
  });
  const neutral = createNeutralTable(engine, "http-binding", {
    operations: () => WIRED,
  });
  return { engine, neutral };
}
async function mounted() {
  const { engine, neutral } = makeTable();
  let session: AgentSession | undefined;
  mountRuntime({
    features: [
      tableAgent({
        tableId: "http-binding",
        writePolicy: "allow",
        approval: "never",
        bridge: {
          attach: (live) => {
            session = live;
          },
        },
      }),
    ],
    view: {
      rows: ROWS,
      visibleRows: ROWS,
      neutralTable: neutral,
      getRowId: (row: Row) => row.id,
      rowLabel: (row: Row) => row.name,
      query: {
        page: 1,
        limit: 1,
        search: "",
        setPage: (page) => engine.dispatch({ type: "setPage", page }),
        setLimit: (limit) => engine.dispatch({ type: "setLimit", limit }),
        setSearch: (search) => engine.dispatch({ type: "setSearch", search }),
        setSort: (key, dir) => engine.dispatch({ type: "setSort", key, dir }),
        setExtras: (filters) =>
          engine.dispatch({ type: "setFilters", filters }),
        clearExtras: () => engine.dispatch({ type: "setFilters", filters: {} }),
      },
    },
  });
  await waitFor(() => expect(session).toBeDefined());
  if (!session) throw new Error("No Angular session attached");
  return { engine, session };
}
interface HostState {
  search: string;
  sortBy?: string;
  setSearch?: (search: string) => void;
}
async function mountedFrontend() {
  const state: HostState = { search: "" };
  let session: AgentSession | undefined;
  mountRuntime<Row>({
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
    createView: () => {
      const source = injectFrontendData({
        data: ROWS,
        columns: COLUMNS,
        getRowId: (row) => row.id,
        urlSync: false,
      });
      const engine = source().tableEngine;
      if (!engine)
        throw new Error("Angular frontend did not publish its engine");
      const neutral = createNeutralTable(engine, "http-frontend-binding", {
        operations: () => WIRED,
      });
      return computed(() => {
        const value = source();
        state.search = value.search;
        state.sortBy = value.sortBy;
        state.setSearch = value.setSearch;
        return {
          rows: value.rows,
          visibleRows: value.rows,
          neutralTable: neutral,
          getRowId: (row: Row) => row.id,
          rowLabel: (row: Row) => row.name,
          query: {
            page: value.page,
            limit: value.limit,
            search: value.search,
            sortBy: value.sortBy,
            sortDir: value.sortDir,
            setPage: value.setPage,
            setLimit: value.setLimit,
            setSearch: value.setSearch,
            setSort: value.setSort,
            setExtras: value.setExtras,
            clearExtras: value.clearExtras,
          },
        } satisfies TableRuntimeView<Row>;
      });
    },
  });
  await waitFor(() => expect(session).toBeDefined());
  if (!session) throw new Error("No Angular frontend session attached");
  return { session, state };
}
async function mountedServer() {
  const state: HostState = { search: "" };
  let session: AgentSession | undefined;
  mountRuntime<Row>({
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
    createView: () => {
      const search = signal("");
      const sortBy = signal<string | undefined>(undefined);
      return computed(() => {
        state.search = search();
        state.sortBy = sortBy();
        state.setSearch = search.set;
        return {
          rows: ROWS,
          visibleRows: ROWS,
          getRowId: (row: Row) => row.id,
          rowLabel: (row: Row) => row.name,
          query: {
            page: 1,
            limit: 10,
            search: search(),
            sortBy: sortBy(),
            sortDir: sortBy() ? "desc" : undefined,
            setPage: () => undefined,
            setLimit: () => undefined,
            setSearch: search.set,
            setSort: (key) => sortBy.set(key),
          },
        } satisfies TableRuntimeView<Row>;
      });
    },
  });
  await waitFor(() => expect(session).toBeDefined());
  if (!session) throw new Error("No Angular server session attached");
  return { session, state };
}

describe("an HTTP turn over the live Angular binding", () => {
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

  it("keeps injectFrontendData search then sort in one reply", async () => {
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

  it("flushes a pending reader change before admitting injectFrontendData work", async () => {
    const { session, state } = await mountedFrontend();

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Sort by salary", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // Angular has accepted the reader's update but has not committed the
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

@Component({
  standalone: true,
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows()"
    [columns]="columns"
    [rowKey]="rowKey"
    [urlSync]="false"
    [features]="features"
  />`,
})
class PendingHost {
  readonly rows = signal(ROWS);
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  session: AgentSession | undefined;
  readonly features = [
    mountedTableAgent({
      tableId: "pending-parent",
      approval: "never",
      bridge: {
        attach: (session) => {
          this.session = session;
        },
      },
    }),
  ];
}

describe("admission through a mounted Angular kit", () => {
  it("commits a pending parent data input before allowing a stale reply", async () => {
    const fixture = TestBed.createComponent(PendingHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const session = host.session;
    if (!session) throw new Error("Mounted kit did not attach an agent");
    const result = await runAgentHttpTurn(session, "Sort salary", {
      endpoint: "https://agent.example/turn",
      request: () => {
        host.rows.set([{ id: "3", name: "Reader change", salary: 500 }]);
        return Promise.resolve({
          schemaVersion: AGENT_SCHEMA_VERSION,
          toolCalls: [
            {
              id: "stale-parent",
              name: "view.setSort",
              args: { key: "salary", dir: "desc" },
            },
          ],
        });
      },
    });
    await fixture.whenStable();
    expect(result.results[0]?.error?.code).toBe("revision-mismatch");
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain("Reader change");
    expect(element.textContent).not.toContain("Grace");
    fixture.destroy();
  });
});
