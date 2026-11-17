/** HTTP execution over committed Angular frontend and server-tier sources. */
import type { AgentSession } from "@adapttable/ai";
import { AGENT_SCHEMA_VERSION, runAgentHttpTurn } from "@adapttable/ai/http";
import {
  type AdaptTableFeature,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
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
const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "salary", header: "Salary", sortable: true },
];
interface HostState {
  search: string;
  sortBy?: string;
  setSearch?: (search: string) => void;
}

/** The mounted table's runtime, for the reader's side of a test. */
interface LiveTable {
  runtime?: TableRuntime;
}

function runtimeProbe(live: LiveTable): AdaptTableFeature {
  return {
    id: "runtime-probe",
    mount: (context) => {
      live.runtime = context.runtime;
    },
  };
}

/** The query the table last published; throws when it has published none. */
function readerQuery(live: LiveTable): Query {
  const query = live.runtime?.view()?.query;
  if (!query) throw new Error("The table published no query");
  return query;
}

@Component({
  standalone: true,
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [urlSync]="false"
    [defaults]="defaults()"
    [features]="features()"
  />`,
})
class AgentHost {
  readonly rows = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly defaults = signal<{ limit: number } | undefined>(undefined);
  readonly features = signal<readonly AdaptTableFeature[]>([]);
}

/** A mounted unstyled table whose features include the agent under test. */
async function mounted(
  tableId: string,
  limit?: number
): Promise<{ session: AgentSession; live: LiveTable }> {
  const live: LiveTable = {};
  let session: AgentSession | undefined;
  const fixture = TestBed.createComponent(AgentHost);
  const host = fixture.componentInstance;
  host.defaults.set(limit === undefined ? undefined : { limit });
  host.features.set([
    mountedTableAgent({
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
    runtimeProbe(live),
  ]);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  await waitFor(() => {
    expect(session).toBeDefined();
    expect(live.runtime?.view()?.query).toBeDefined();
  });
  if (!session) throw new Error("The mounted table attached no agent");
  return { session, live };
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

  it("keeps injectFrontendData search then sort in one reply", async () => {
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

  it("flushes a pending reader change before admitting injectFrontendData work", async () => {
    const { session, live } = await mounted("http-frontend-binding");

    let result!: TurnResult;
    await act(async () => {
      result = await runAgentHttpTurn(session, "Sort by salary", {
        endpoint: "https://agent.example/turn",
        request: () => {
          // Angular has accepted the reader's update but has not committed the
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
