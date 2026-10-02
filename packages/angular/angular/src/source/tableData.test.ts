/**
 * The Angular table data controller: which tier serves the rows, the
 * filters every tier shares, and what the host is told.
 */
import {
  createMemoryAdapter,
  FILTER_ENGINE_IMPL,
  type FilterDef,
  type TableQuery,
  type TableSource,
} from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectFrontendData } from "./frontendData";
import { injectTableData } from "./tableData";

interface Row {
  id: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", team: "Core" },
  { id: "2", team: "Web" },
  { id: "3", team: "Core" },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "id", accessor: (row) => row.id },
  { key: "team", accessor: (row) => row.team },
];

let config: {
  mode?: "frontend" | "server";
  onQueryChange?: (query: TableQuery, info: { signal: AbortSignal }) => void;
  prebuilt?: boolean;
  filters?: FilterDef<Row>[];
  engine?: boolean;
} = {};

@Component({ template: "" })
class Host {
  readonly prebuilt = injectFrontendData<Row>({
    data: [{ id: "9", team: "Data" }],
    getRowId: (row) => row.id,
    urlSync: false,
  });
  readonly rows = signal<readonly Row[]>(ROWS);
  readonly total = signal(3);
  readonly loading = signal(false);
  readonly error = signal<Error | null>(null);
  readonly data = injectTableData<Row>({
    data: this.rows,
    total: this.total,
    loading: this.loading,
    error: this.error,
    columns: COLUMNS,
    getRowId: (row) => row.id,
    mode: config.mode,
    onQueryChange: config.onQueryChange,
    source: config.prebuilt ? this.prebuilt : undefined,
    filters: config.filters,
    engine: config.engine ? FILTER_ENGINE_IMPL : undefined,
    defaults: { limit: 2 },
  });
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const host = fixture.componentInstance;
  return {
    fixture,
    host,
    source: () => host.data.source(),
    settle: () => fixture.whenStable(),
  };
}

const ids = (source: TableSource<Row>) => source.rows.map((row) => row.id);

beforeEach(() => {
  config = {};
  TestBed.configureTestingModule({
    providers: [
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
    ],
  });
});

describe("injectTableData", () => {
  it("serves rows alone from the frontend tier, searched and paged here", async () => {
    const { source, settle } = await mount();
    expect(ids(source())).toEqual(["1", "2"]);
    expect(source().total).toBe(3);
    source().setPage(2);
    await settle();
    expect(ids(source())).toEqual(["3"]);
  });

  it("serves rows with onQueryChange from the server tier, which asks the host", async () => {
    const onQueryChange = vi.fn();
    config = { onQueryChange };
    const { host, source, settle } = await mount();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange.mock.calls[0]![0]).toMatchObject({
      page: 1,
      limit: 2,
    });
    // The server tier shows the page it is handed, as it is.
    expect(ids(source())).toEqual(["1", "2", "3"]);
    host.total.set(40);
    source().setPage(2);
    await settle();
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange.mock.calls[1]![0]).toMatchObject({ page: 2 });
  });

  it("tells a frontend table's onQueryChange about a change, not about the mount", async () => {
    const onQueryChange = vi.fn();
    config = { mode: "frontend", onQueryChange };
    const { source, settle } = await mount();
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(ids(source())).toEqual(["1", "2"]);
    source().setSearch("Web");
    await settle();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange.mock.calls[0]![0]).toMatchObject({ search: "Web" });
    expect(ids(source())).toEqual(["2"]);
  });

  it("reads a prebuilt source whole", async () => {
    config = { prebuilt: true };
    const { source } = await mount();
    expect(ids(source())).toEqual(["9"]);
  });

  it("filters every tier through the declared filters and counts the checklist", async () => {
    config = {
      engine: true,
      filters: [
        {
          key: "team",
          type: "checklist",
          options: [
            { value: "Core", label: "Core" },
            { value: "Web", label: "Web" },
          ],
          getValue: (row) => row.team,
        },
      ],
    };
    const { host, source, settle } = await mount();
    expect(host.data.runtime().defs.map((def) => def.key)).toEqual(["team"]);
    expect(source().facets?.team).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "Core", count: 2 }),
        expect.objectContaining({ value: "Web", count: 1 }),
      ])
    );
    source().setExtra("team", ["Web"]);
    await settle();
    expect(ids(source())).toEqual(["2"]);
  });

  it("loads a filter's own option list once and hands it to the runtime", async () => {
    const load = vi.fn(() =>
      Promise.resolve([{ value: "Core", label: "Core team" }])
    );
    config = {
      engine: true,
      filters: [
        {
          key: "team",
          type: "multiSelect",
          options: load,
          getValue: (row) => row.team,
        },
      ],
    };
    const { host, settle } = await mount();
    await vi.waitFor(() => {
      expect(host.data.runtime().defs[0]!.options).toEqual([
        { value: "Core", label: "Core team" },
      ]);
    });
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("aborts a frontend notification in flight when the table goes away", async () => {
    const signals: AbortSignal[] = [];
    config = {
      mode: "frontend",
      onQueryChange: (_query, info) => {
        signals.push(info.signal);
      },
    };
    const { fixture, source, settle } = await mount();
    source().setSearch("Core");
    await settle();
    fixture.destroy();
    expect(signals[0]!.aborted).toBe(true);
  });

  it("shows a frontend table's loading flag and failure, which the host owns", async () => {
    config = { mode: "frontend" };
    const { host, source, settle } = await mount();
    expect(source().isLoading).toBe(false);
    host.loading.set(true);
    host.error.set(new Error("could not load"));
    await settle();
    expect(source().isLoading).toBe(true);
    expect(source().error?.message).toBe("could not load");
  });

  it("keeps a table without an explicit frontend mode out of loading", async () => {
    const { host, source, settle } = await mount();
    host.loading.set(true);
    await settle();
    expect(source().isLoading).toBe(false);
  });
});
