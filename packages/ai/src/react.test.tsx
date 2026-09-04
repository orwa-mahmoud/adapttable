import {
  applyTableFeatures,
  FeatureProviders,
  type TableRuntimeView,
  useFeatureState,
  usePublishTableRuntime,
} from "@adapttable/core/adapter";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TABLE_AGENT_STATE, tableAgent } from "./react";
import type { AgentManifest, AgentSession } from "./types";

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

function Publisher({ view }: { view?: TableRuntimeView }) {
  usePublishTableRuntime([], undefined, view);
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
          rows: [],
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
      1,
      "s"
    );
    const sort = await session!.execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      1,
      "o"
    );
    const page = await session!.execute(
      "view.setPage",
      { page: 2, limit: 25 },
      1,
      "p"
    );
    expect(search.ok && sort.ok && page.ok).toBe(true);
    expect(setSearch).toHaveBeenCalledWith("ada");
    expect(setSort).toHaveBeenCalledWith("name", "asc");
    expect(setPage).toHaveBeenCalledWith(2);
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
          rows: [{ id: "r1" }],
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
});
