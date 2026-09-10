import { createNeutralTable, createTableEngine } from "@adapttable/core";
import {
  applyTableFeatures,
  FeatureProviders,
  type TableRuntimeView,
  useFeatureState,
  usePublishTableRuntime,
} from "@adapttable/react/adapter";
import { render, waitFor } from "@testing-library/react";
import { useLayoutEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { TABLE_AGENT_STATE, tableAgent } from "./react";
import type {
  AgentAggregationsPatch,
  AgentCapabilityDefinition,
  AgentManifest,
  AgentSession,
} from "./types";

function Harness({
  features,
  view,
}: {
  features: ReturnType<typeof tableAgent>[];
  view?: TableRuntimeView;
}) {
  const props = applyTableFeatures({ features });
  return (
    <FeatureProviders props={props}>
      <Publisher view={view} />
      <Reader />
    </FeatureProviders>
  );
}

/** Whether a row object carries a `name` field worth declaring a column for. */
function hasNameField(row: unknown): boolean {
  return typeof row === "object" && row !== null && "name" in row;
}

function Publisher({ view }: { view?: TableRuntimeView }) {
  const engineRef = useRef<ReturnType<typeof createTableEngine> | null>(null);
  const neutralRef = useRef<ReturnType<typeof createNeutralTable> | null>(null);
  const bindingRef = useRef<{
    visibleRows?: () => readonly unknown[];
    operations?: () => Readonly<Record<string, boolean>>;
  }>({});
  const viewRef = useRef(view);
  viewRef.current = view;
  bindingRef.current.visibleRows = () =>
    viewRef.current?.visibleRows ?? viewRef.current?.rows ?? [];
  bindingRef.current.operations = () => ({
    setPage: Boolean(viewRef.current?.query?.setPage),
    setSearch: Boolean(viewRef.current?.query?.setSearch),
    setSort: Boolean(viewRef.current?.query?.setSort),
    setLimit: Boolean(viewRef.current?.query?.setLimit),
    setFilters: Boolean(
      viewRef.current?.query?.setExtras ?? viewRef.current?.query?.clearExtras
    ),
    setGroupBy: Boolean(viewRef.current?.groupingState?.setGroupBy),
    setSelection: Boolean(viewRef.current?.selection),
  });
  const rowsRef = useRef(view?.rows);
  if (view?.rows?.length && !view.neutralTable) {
    if (!engineRef.current) {
      const engine = createTableEngine({
        data: view.rows as { id: string; name?: string }[],
        columns: hasNameField(view.rows[0])
          ? [{ key: "name", header: "Name", sortable: true }]
          : [],
        rowKey: (row) => (row as { id: string }).id,
      });
      engineRef.current = engine as ReturnType<typeof createTableEngine>;
      neutralRef.current = createNeutralTable(
        engineRef.current,
        "test",
        bindingRef.current
      );
    }
  }
  useLayoutEffect(() => {
    if (!engineRef.current || !view?.rows || view.neutralTable) return;
    if (rowsRef.current === view.rows) return;
    rowsRef.current = view.rows;
    engineRef.current.invalidate(
      ["data"],
      { data: view.rows },
      { silent: true }
    );
  });
  usePublishTableRuntime(view?.visibleRows ?? view?.rows ?? [], undefined, {
    ...view,
    rows: view?.rows ?? [],
    visibleRows: view?.visibleRows ?? view?.rows,
    neutralTable: view?.neutralTable ?? neutralRef.current ?? undefined,
    getRowId: view?.getRowId ?? ((row) => (row as { id: string }).id),
    rowLabel:
      view?.rowLabel ??
      ((row) =>
        String(
          (row as { id: string; name?: string }).name ??
            (row as { id: string }).id
        )),
  });
  return null;
}

function Reader() {
  const session = useFeatureState(TABLE_AGENT_STATE);
  return (
    <pre data-testid="keys">
      {session
        ?.catalog()
        .map((e) => e.key)
        .join(",")}
    </pre>
  );
}

describe("tableAgent", () => {
  it("publishes a live manifest and updates when features change", async () => {
    const manifests: AgentManifest[] = [];
    const attached: AgentSession[] = [];
    const setPage = vi.fn();
    const { rerender, getByTestId } = render(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            bridge: {
              publish: (m) => manifests.push(m),
              attach: (s) => attached.push(s),
            },
          }),
        ]}
        view={{
          rows: [],
          getRowId: () => "1",
          rowLabel: () => "1",
          query: {
            page: 1,
            limit: 10,
            search: "",
            setPage,
            setLimit: vi.fn(),
            setSearch: vi.fn(),
            setSort: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() => expect(attached.length).toBeGreaterThan(0));
    expect(getByTestId("keys").textContent).toContain("view.setPage");
    expect(manifests.at(-1)?.tableId).toBe("one");
    expect(manifests.at(-1)?.capabilities).toContain("view.setPage");

    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            columns: { name: { type: "string" } },
            apply: { setFilters: vi.fn() },
            bridge: {
              publish: (m) => manifests.push(m),
              attach: (s) => attached.push(s),
            },
          }),
          { id: "filters" },
        ]}
        view={{
          rows: [],
          getRowId: () => "1",
          rowLabel: () => "1",
          query: {
            page: 1,
            limit: 10,
            search: "",
            setPage,
            setLimit: vi.fn(),
            setSearch: vi.fn(),
            setSort: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() =>
      expect(getByTestId("keys").textContent).toContain("view.setFilters")
    );
  });

  it("omits view.setFilters until an apply path exists", async () => {
    let session: AgentSession | undefined;
    const { rerender, getByTestId } = render(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            bridge: { attach: (s) => (session = s) },
          }),
          { id: "filters" },
        ]}
        view={{
          rows: [],
          getRowId: () => "1",
          rowLabel: () => "1",
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    expect(getByTestId("keys").textContent).not.toContain("view.setFilters");

    session = undefined;
    const setExtras = vi.fn();
    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            bridge: { attach: (s) => (session = s) },
          }),
          { id: "filters" },
        ]}
        view={{
          rows: [],
          getRowId: () => "1",
          rowLabel: () => "1",
          query: {
            page: 1,
            limit: 10,
            search: "",
            setPage: vi.fn(),
            setLimit: vi.fn(),
            setSearch: vi.fn(),
            setSort: vi.fn(),
            extra: {},
            setExtras,
            clearExtras: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() =>
      expect(getByTestId("keys").textContent).toContain("view.setFilters")
    );
    await session!.execute(
      "view.setFilters",
      { filters: { team: ["Core"] } },
      session!.manifest().viewRevision,
      "live-filter"
    );
    expect(setExtras).toHaveBeenCalledWith({ team: ["Core"] });
  });

  it("publishes the live filter catalog and rejects an unknown option", async () => {
    let session: AgentSession | undefined;
    const setExtras = vi.fn();
    render(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            columns: { salary: { readable: false } },
            bridge: { attach: (s) => (session = s) },
          }),
          { id: "filters" },
        ]}
        view={{
          rows: [],
          getRowId: () => "1",
          rowLabel: () => "1",
          filterDefs: [
            {
              key: "team",
              type: "multiSelect",
              label: "Team",
              options: [
                { value: "Core", label: "Core" },
                { value: "Data", label: "Data" },
              ],
            },
            { key: "salary", type: "numberRange", label: "Salary" },
            { key: "internal", type: "text", ai: false },
          ],
          query: {
            page: 1,
            limit: 10,
            search: "",
            setPage: vi.fn(),
            setLimit: vi.fn(),
            setSearch: vi.fn(),
            setSort: vi.fn(),
            extra: { team: ["Core"] },
            setExtras,
            clearExtras: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const guide = session!.describe("view.setFilters");
    expect(guide.guide).toContain("team [");
    expect(guide.guide).toContain("options: Core, Data");
    expect(guide.guide).not.toContain("salary [");
    expect(guide.guide).not.toContain("internal [");
    const refused = await session!.execute(
      "view.setFilters",
      { filters: { team: ["Ghost"] } },
      session!.manifest().viewRevision,
      "bad-option"
    );
    expect(refused.ok).toBe(false);
    expect(setExtras).not.toHaveBeenCalled();
    await session!.execute(
      "view.setFilters",
      { filters: { team: ["Data"] } },
      session!.manifest().viewRevision,
      "good-option"
    );
    expect(setExtras).toHaveBeenCalledWith({ team: ["Data"] });
  });

  it("keeps one session and bumps revision when the live view changes", async () => {
    const attached: AgentSession[] = [];
    const feature = tableAgent({
      tableId: "one",
      bridge: { attach: (s) => attached.push(s) },
    });
    const { rerender } = render(
      <Harness
        features={[feature]}
        view={{
          rows: [{ id: "a" }],
          getRowId: (row) => (row as { id: string }).id,
          rowLabel: () => "a",
          query: {
            page: 1,
            limit: 10,
            search: "",
            setPage: vi.fn(),
            setLimit: vi.fn(),
            setSearch: vi.fn(),
            setSort: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() => expect(attached).toHaveLength(1));
    expect(attached[0]!.manifest().viewRevision).toBe(1);

    rerender(
      <Harness
        features={[feature]}
        view={{
          rows: [{ id: "b" }],
          getRowId: (row) => (row as { id: string }).id,
          rowLabel: () => "b",
          query: {
            page: 1,
            limit: 10,
            search: "",
            setPage: vi.fn(),
            setLimit: vi.fn(),
            setSearch: vi.fn(),
            setSort: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() =>
      expect(attached[0]!.manifest().viewRevision).toBeGreaterThan(1)
    );
    expect(attached.at(-1)).toBe(attached[0]);
  });

  it("uses a host observe/apply pair and keeps two tables isolated", async () => {
    let page = 1;
    const aKeys: string[] = [];
    const bKeys: string[] = [];
    function Dual() {
      const props = applyTableFeatures({
        features: [
          tableAgent({
            tableId: "left",
            observe: () => ({
              tableId: "left",
              viewRevision: 1,
              featureIds: [],
              columns: [],
              source: {
                fullDataset: false,
                grouping: false,
                selectAcrossPages: false,
                exportScope: "page",
                totalCount: "loaded",
              },
              writePolicy: "allow",
              hasPagination: true,
              hasSearch: false,
              hasSort: false,
              hasFilters: false,
              hasExport: false,
              hasEdit: false,
              hasReorder: false,
              page,
              limit: 10,
              search: "",
              pageMax: 10,
              rowAddressScope: "visible",
            }),
            apply: { setPage: (n) => (page = n) },
            bridge: {
              attach: (s) => aKeys.push(...s.catalog().map((e) => e.key)),
            },
          }),
        ],
      });
      const other = applyTableFeatures({
        features: [
          tableAgent({
            tableId: "right",
            observe: () => ({
              tableId: "right",
              viewRevision: 2,
              featureIds: ["editing"],
              columns: [],
              source: {
                fullDataset: false,
                grouping: false,
                selectAcrossPages: false,
                exportScope: "page",
                totalCount: "loaded",
              },
              writePolicy: "deny",
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
              pageMax: 10,
              rowAddressScope: "page",
            }),
            apply: {},
            bridge: {
              attach: (s) => bKeys.push(...s.catalog().map((e) => e.key)),
            },
          }),
        ],
      });
      return (
        <>
          <FeatureProviders props={props}>
            <span />
          </FeatureProviders>
          <FeatureProviders props={other}>
            <span />
          </FeatureProviders>
        </>
      );
    }
    render(<Dual />);
    await waitFor(() => expect(aKeys).toContain("view.setPage"));
    expect(bKeys).not.toContain("view.setPage");
    expect(bKeys).not.toContain("edit.cells");
    expect(bKeys).toContain("columns.describe");
  });

  it("executes view.setPage through the live runtime apply path", async () => {
    const setPage = vi.fn();
    const setLimit = vi.fn();
    const setSearch = vi.fn();
    const setSort = vi.fn();
    const setGroupBy = vi.fn();
    let session: AgentSession | undefined;
    render(
      <Harness
        features={[
          tableAgent({
            tableId: "live",
            columns: {
              name: {
                label: "Name",
                type: "string",
                sortable: true,
                writable: true,
              },
            },
            bridge: { attach: (s) => (session = s) },
          }),
        ]}
        view={{
          rows: [{ id: "1", name: "Ada" }],
          getRowId: () => "1",
          rowLabel: () => "1",
          groupingState: {
            groupBy: undefined,
            aggregateOverrides: {},
            columnLabel: (key) => key,
            setGroupBy,
          },
          query: {
            page: 1,
            limit: 10,
            search: "",
            setPage,
            setLimit,
            setSearch,
            setSort,
          },
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const search = await session!.execute(
      "view.setSearch",
      { query: "ada" },
      session!.manifest().viewRevision,
      "s"
    );
    const sort = await session!.execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      session!.manifest().viewRevision,
      "o"
    );
    const page = await session!.execute(
      "view.setPage",
      { page: 1, limit: 25 },
      session!.manifest().viewRevision,
      "p"
    );
    expect(search.ok && sort.ok && page.ok).toBe(true);
    expect(setSearch).toHaveBeenCalledWith("ada");
    expect(setSort).toHaveBeenCalledWith("name", "asc");
    expect(setPage).toHaveBeenCalledWith(1);
    expect(setLimit).toHaveBeenCalledWith(25);
    expect(setGroupBy).not.toHaveBeenCalled();
  });

  it("omits add and delete unless the host wired those callbacks", async () => {
    let session: AgentSession | undefined;
    const { rerender } = render(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            bridge: { attach: (s) => (session = s) },
          }),
        ]}
        view={{
          rows: [],
          getRowId: () => "1",
          rowLabel: () => "1",
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    expect(session!.catalog().map((entry) => entry.key)).not.toEqual(
      expect.arrayContaining(["rows.add", "rows.delete"])
    );

    session = undefined;
    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            apply: { addRows: vi.fn(), deleteRows: vi.fn() },
            bridge: { attach: (s) => (session = s) },
          }),
        ]}
        view={{
          rows: [],
          getRowId: () => "1",
          rowLabel: () => "1",
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const keys = session!.catalog().map((entry) => entry.key);
    expect(keys).toContain("rows.add");
    expect(keys).toContain("rows.delete");
  });

  it("keeps one session across new options objects and bumps revision on row values", async () => {
    let session: AgentSession | undefined;
    const setPage = vi.fn();
    const view = (name: string): TableRuntimeView => ({
      rows: [{ id: "r1", name }],
      getRowId: (row) => (row as { id: string }).id,
      rowLabel: () => name,
      query: {
        page: 1,
        limit: 10,
        search: "",
        setPage,
        setLimit: vi.fn(),
        setSearch: vi.fn(),
        setSort: vi.fn(),
      },
    });
    const { rerender } = render(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            apply: { setPage },
            bridge: { attach: (next) => (session = next) },
          }),
        ]}
        view={view("Ada")}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const first = session!;
    await first.execute(
      "view.setPage",
      { page: 1 },
      first.manifest().viewRevision,
      "page-once"
    );
    expect(setPage).toHaveBeenCalledTimes(1);

    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            apply: { setPage },
            bridge: { attach: (next) => (session = next) },
          }),
        ]}
        view={view("Ada")}
      />
    );
    await waitFor(() => expect(session).toBe(first));
    const replayed = await first.execute(
      "view.setPage",
      { page: 1 },
      first.manifest().viewRevision,
      "page-once"
    );
    expect(replayed.ok).toBe(true);
    expect(setPage).toHaveBeenCalledTimes(1);
    const afterReplay = first.manifest().viewRevision;

    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            apply: { setPage },
            bridge: { attach: (next) => (session = next) },
          }),
        ]}
        view={view("Ada Lovelace")}
      />
    );
    await waitFor(() =>
      expect(first.manifest().viewRevision).toBeGreaterThan(afterReplay)
    );
  });

  it("rejects a second chrome approval while one is pending", async () => {
    let session: AgentSession | undefined;
    const editCells = vi.fn();
    const { unmount } = render(
      <Harness
        features={[
          tableAgent({
            tableId: "one",
            approval: "writes",
            commit: "immediate",
            columns: { name: { type: "string", writable: true } },
            apply: {
              editCells,
              resolveRow: () => ({ rowKey: "r1", scope: "visible" }),
            },
            bridge: { attach: (next) => (session = next) },
          }),
          { id: "editing" },
        ]}
        view={{
          rows: [{ id: "r1", name: "Ada" }],
          getRowId: (row) => (row as { id: string }).id,
          rowLabel: () => "Ada",
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const first = session!.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Ada Lovelace" }] },
      session!.manifest().viewRevision,
      "edit-1"
    );
    const second = await session!.execute(
      "edit.cells",
      { edits: [{ rowKey: "r1", column: "name", value: "Other" }] },
      session!.manifest().viewRevision,
      "edit-2"
    );
    expect(second.ok).toBe(false);
    expect(second.error?.message).toMatch(/already pending/);
    expect(editCells).not.toHaveBeenCalled();
    unmount();
    await first;
  });

  it("registers a custom capability through tableAgent", async () => {
    let session: AgentSession | undefined;
    render(
      <Harness
        features={[
          tableAgent({
            tableId: "custom",
            capabilities: [
              {
                key: "demo.echo",
                summary: "Echo a label.",
                kind: "read",
                guide: {
                  guide: "Return the label unchanged.",
                  input: {
                    type: "object",
                    additionalProperties: false,
                    properties: { label: { type: "string" } },
                    required: ["label"],
                  },
                  output: {
                    type: "object",
                    additionalProperties: false,
                    properties: { echo: { type: "string" } },
                    required: ["echo"],
                  },
                },
                isEnabled: () => true,
                execute: (_context, args) => ({
                  echo: (args as { label: string }).label,
                }),
              },
            ],
            bridge: { attach: (next) => (session = next) },
          }),
        ]}
        view={{
          rows: [{ id: "1" }],
          getRowId: (row) => (row as { id: string }).id,
          rowLabel: () => "1",
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    expect(session!.catalog().map((entry) => entry.key)).toContain("demo.echo");
    const result = await session!.execute(
      "demo.echo",
      { label: "live" },
      session!.manifest().viewRevision,
      "echo-live"
    );
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ echo: "live" });
  });

  it("executes view.setAggregations through the live grouping state", async () => {
    const setAggregateOverrides = vi.fn();
    let session: AgentSession | undefined;
    const columns = [
      {
        key: "salary",
        aggregatable: { default: "sum", operations: ["sum", "avg"] as const },
      },
    ];
    const groupingState = {
      groupBy: "team",
      aggregateOverrides: { salary: "sum" },
      columnLabel: (key: string) => key,
      columns,
      queryAggregates: [{ key: "salary", fn: "sum" as const }],
      setGroupBy: vi.fn(),
      setAggregateOverrides,
    };
    render(
      <Harness
        features={[
          tableAgent({
            tableId: "agg",
            columns: { salary: { label: "Salary", type: "number" } },
            bridge: { attach: (s) => (session = s) },
          }),
          { id: "grouping" },
        ]}
        view={{
          rows: [{ id: "1", salary: 10 }],
          getRowId: () => "1",
          rowLabel: () => "1",
          sourceCapabilities: {
            fullDataset: true,
            grouping: "client",
            selectAcrossPages: false,
            exportScope: "page",
            totalCount: "loaded",
          },
          groupingState,
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    expect(session!.catalog().map((entry) => entry.key)).toContain(
      "view.setAggregations"
    );
    const described = session!.describe("view.setAggregations");
    expect(described.guide).toContain("salary");
    expect(described.guide).toContain("avg");

    const set = await session!.execute(
      "view.setAggregations",
      { set: { salary: "avg" } },
      session!.manifest().viewRevision,
      "set-avg"
    );
    expect(set.ok).toBe(true);
    expect(set.result).toMatchObject({ applied: true, pending: false });
    expect(setAggregateOverrides).toHaveBeenCalledWith({ salary: "avg" });

    const removed = await session!.execute(
      "view.setAggregations",
      { remove: ["salary"] },
      session!.manifest().viewRevision,
      "remove-salary"
    );
    expect(removed.ok).toBe(true);
    expect(setAggregateOverrides).toHaveBeenCalledWith({ salary: "none" });

    const restored = await session!.execute(
      "view.setAggregations",
      { restoreDefaults: true },
      session!.manifest().viewRevision,
      "restore"
    );
    expect(restored.ok).toBe(true);
    expect(setAggregateOverrides).toHaveBeenCalledWith({});
  });

  it("does not advertise aggregations the source will not honour", async () => {
    let session: AgentSession | undefined;
    render(
      <Harness
        features={[
          tableAgent({
            tableId: "server",
            bridge: { attach: (s) => (session = s) },
          }),
          { id: "grouping" },
        ]}
        view={{
          rows: [{ id: "1" }],
          getRowId: () => "1",
          rowLabel: () => "1",
          sourceCapabilities: {
            fullDataset: false,
            grouping: "server",
            selectAcrossPages: false,
            exportScope: "page",
            totalCount: "loaded",
          },
          groupingState: {
            groupBy: "team",
            aggregateOverrides: {},
            columnLabel: (key) => key,
            columns: [{ key: "salary", aggregatable: { operations: ["sum"] } }],
            honorsAggregates: false,
            setGroupBy: vi.fn(),
            setAggregateOverrides: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    expect(session!.catalog().map((entry) => entry.key)).not.toContain(
      "view.setAggregations"
    );
  });

  it("applies aggregations only when the live grouping state can honour them", async () => {
    const setAggregateOverrides = vi.fn();
    let session: AgentSession | undefined;
    const drive: AgentCapabilityDefinition = {
      key: "demo.aggregations",
      summary: "Drive live aggregations.",
      kind: "view",
      guide: {
        guide: "Apply a raw aggregation patch.",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: (context, args) => {
        context.apply.setAggregations?.(args as AgentAggregationsPatch);
        return { ok: true };
      },
    };
    const { rerender } = render(
      <Harness
        features={[
          tableAgent({
            tableId: "agg",
            capabilities: [drive],
            bridge: { attach: (s) => (session = s) },
          }),
          { id: "grouping" },
        ]}
        view={{
          rows: [{ id: "1", salary: 10 }],
          getRowId: () => "1",
          rowLabel: () => "1",
          sourceCapabilities: {
            fullDataset: true,
            grouping: "client",
            selectAcrossPages: false,
            exportScope: "page",
            totalCount: "loaded",
          },
          groupingState: {
            groupBy: "team",
            aggregateOverrides: {},
            columnLabel: (key) => key,
            columns: [
              {
                key: "salary",
                aggregatable: { operations: ["sum", "avg"] as const },
              },
              { key: "note" },
            ],
            setGroupBy: vi.fn(),
            setAggregateOverrides,
          },
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const badOp = await session!.execute(
      "demo.aggregations",
      { set: { salary: "median" } },
      session!.manifest().viewRevision,
      "bad-op"
    );
    expect(badOp.ok).toBe(false);
    expect(badOp.error?.message).toMatch(/cannot use operation "median"/);
    const badRemove = await session!.execute(
      "demo.aggregations",
      { remove: ["note"] },
      session!.manifest().viewRevision,
      "bad-remove"
    );
    expect(badRemove.ok).toBe(false);
    expect(badRemove.error?.message).toMatch(/cannot be removed/);
    const added = await session!.execute(
      "demo.aggregations",
      { set: { salary: "avg" } },
      session!.manifest().viewRevision,
      "add-reader"
    );
    expect(added.ok).toBe(true);
    expect(setAggregateOverrides).toHaveBeenCalledWith({ salary: "avg" });
    const dropped = await session!.execute(
      "demo.aggregations",
      { remove: ["salary"] },
      session!.manifest().viewRevision,
      "drop-reader"
    );
    expect(dropped.ok).toBe(true);
    expect(setAggregateOverrides).toHaveBeenLastCalledWith({});

    session = undefined;
    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "agg",
            capabilities: [drive],
            bridge: { attach: (s) => (session = s) },
          }),
        ]}
        view={{
          rows: [{ id: "1" }],
          getRowId: () => "1",
          rowLabel: () => "1",
          sourceCapabilities: {
            fullDataset: true,
            grouping: false,
            selectAcrossPages: false,
            exportScope: "page",
            totalCount: "loaded",
          },
          groupingState: {
            groupBy: undefined,
            aggregateOverrides: {},
            columnLabel: (key) => key,
            columns: [{ key: "salary", aggregatable: true }],
            setGroupBy: vi.fn(),
          },
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    expect(session!.catalog().map((entry) => entry.key)).not.toContain(
      "view.setAggregations"
    );
    const unwired = await session!.execute(
      "demo.aggregations",
      { restoreDefaults: true },
      session!.manifest().viewRevision,
      "unwired"
    );
    expect(unwired.ok).toBe(false);
    expect(unwired.error?.message).toMatch(/setAggregations is not wired/);
  });

  it("executes a server-only custom aggregator the catalog advertised", async () => {
    const setAggregateOverrides = vi.fn();
    let session: AgentSession | undefined;
    render(
      <Harness
        features={[
          tableAgent({
            tableId: "server-median",
            columns: { salary: { label: "Salary", type: "number" } },
            bridge: { attach: (next) => (session = next) },
          }),
          { id: "grouping" },
        ]}
        view={{
          rows: [{ id: "1", salary: 10 }],
          getRowId: () => "1",
          rowLabel: () => "1",
          sourceCapabilities: {
            fullDataset: false,
            grouping: "server",
            selectAcrossPages: false,
            exportScope: "page",
            totalCount: "loaded",
          },
          groupingState: {
            groupBy: "team",
            aggregateOverrides: {},
            columnLabel: (key) => key,
            columns: [
              {
                key: "salary",
                aggregatable: {
                  operations: [{ id: "median", label: "Median" }],
                },
              },
            ],
            aggregateOperations: ["median"],
            honorsAggregates: true,
            setGroupBy: vi.fn(),
            setAggregateOverrides,
          },
        }}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const described = session!.describe("view.setAggregations");
    expect(described.guide).toContain("median");
    const set = await session!.execute(
      "view.setAggregations",
      { set: { salary: "median" } },
      session!.manifest().viewRevision,
      "set-median"
    );
    expect(set.ok).toBe(true);
    expect(setAggregateOverrides).toHaveBeenCalledWith({ salary: "median" });
  });

  it("does not advertise or accept aggregations on an unreadable column", async () => {
    const setAggregateOverrides = vi.fn();
    let session: AgentSession | undefined;
    const groupingState = {
      groupBy: "team",
      aggregateOverrides: {},
      columnLabel: (key: string) => key,
      columns: [
        {
          key: "salary",
          aggregatable: { operations: ["sum", "avg"] as const },
        },
        {
          key: "headcount",
          aggregatable: { operations: ["count"] as const },
        },
      ],
      setGroupBy: vi.fn(),
      setAggregateOverrides,
    };
    const capabilities = {
      fullDataset: true,
      grouping: "client" as const,
      selectAcrossPages: false,
      exportScope: "page" as const,
      totalCount: "loaded" as const,
    };
    const view = {
      rows: [{ id: "1", salary: 10, headcount: 1 }],
      getRowId: () => "1",
      rowLabel: () => "1",
      sourceCapabilities: capabilities,
      groupingState,
    };
    const { rerender } = render(
      <Harness
        features={[
          tableAgent({
            tableId: "hidden-agg",
            columns: {
              salary: { label: "Salary", type: "number", readable: false },
              headcount: { label: "Headcount", type: "number" },
            },
            bridge: { attach: (next) => (session = next) },
          }),
          { id: "grouping" },
        ]}
        view={view}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const described = session!.describe("view.setAggregations");
    expect(described.guide).toContain("headcount");
    expect(described.guide).not.toContain("salary");
    const hidden = await session!.execute(
      "view.setAggregations",
      { set: { salary: "sum" } },
      session!.manifest().viewRevision,
      "hidden-sum"
    );
    expect(hidden.ok).toBe(false);
    expect(hidden.error?.message).toMatch(/cannot use operation "sum"/);
    expect(setAggregateOverrides).not.toHaveBeenCalled();

    session = undefined;
    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "hidden-agg",
            columns: {
              salary: { label: "Salary", type: "number" },
              headcount: { label: "Headcount", type: "number" },
            },
            bridge: { attach: (next) => (session = next) },
          }),
          { id: "grouping" },
        ]}
        view={view}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    expect(session!.describe("view.setAggregations").guide).toContain("salary");

    session = undefined;
    rerender(
      <Harness
        features={[
          tableAgent({
            tableId: "hidden-agg",
            columns: {
              salary: { label: "Salary", type: "number", readable: false },
              headcount: { label: "Headcount", type: "number" },
            },
            bridge: { attach: (next) => (session = next) },
          }),
          { id: "grouping" },
        ]}
        view={view}
      />
    );
    await waitFor(() => expect(session).toBeDefined());
    const revoked = await session!.execute(
      "view.setAggregations",
      { set: { salary: "avg" } },
      session!.manifest().viewRevision,
      "revoked-avg"
    );
    expect(revoked.ok).toBe(false);
    expect(revoked.error?.message).toMatch(/cannot use operation "avg"/);
    expect(setAggregateOverrides).not.toHaveBeenCalled();
  });
});
