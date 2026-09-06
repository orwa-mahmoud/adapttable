/**
 * The two ways a write reaches a human, and the host callbacks that replace
 * the live table's own.
 *
 * Approval is chrome the table renders: the binding parks the write, publishes
 * the proposals, and waits. Nothing about that is visible from the session
 * alone, so it is driven here the way the approval strip drives it.
 */
import {
  AGENT_APPROVAL_STATE,
  applyTableFeatures,
  FeatureProviders,
  type TableRuntimeView,
  useFeatureState,
  usePublishTableRuntime,
} from "@adapttable/react/adapter";
import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { TABLE_AGENT_STATE, tableAgent } from "./react";
import type { AgentApply, AgentSession, ExecuteResult } from "./types";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];

type Pending = {
  readonly proposals: readonly unknown[];
  readonly approve: () => void;
  readonly reject: () => void;
} | null;

const VIEW: TableRuntimeView<Row> = {
  rows: ROWS,
  getRowId: (row) => row.id,
  rowLabel: (row) => row.name,
  editing: { onCellEdit: () => undefined },
};

function Publisher({ view }: { view: TableRuntimeView<Row> }) {
  usePublishTableRuntime(view.rows, undefined, view);
  return null;
}

interface Handles {
  readonly session: AgentSession | undefined;
  readonly pending: Pending;
}

const handles: { current: Handles } = {
  current: { session: undefined, pending: null },
};

function Reader({ onReady }: { onReady: () => void }) {
  const session = useFeatureState(TABLE_AGENT_STATE);
  const pending = useFeatureState(AGENT_APPROVAL_STATE);
  handles.current = { session, pending: pending ?? null };
  useEffect(() => {
    if (session) onReady();
  }, [session, onReady]);
  return null;
}

type AgentOptions = Parameters<typeof tableAgent>[0];

function mount(
  options: AgentOptions,
  view: TableRuntimeView<Row> = VIEW
): { rerender: (next: AgentOptions) => void } {
  const tree = (next: AgentOptions) => {
    const props = applyTableFeatures({
      features: [
        tableAgent({
          columns: { name: { type: "string", writable: true } },
          commit: "immediate",
          ...next,
        }),
        { id: "editing" },
        { id: "filters" },
        { id: "grouping" },
        { id: "export-csv" },
      ],
    });
    return (
      <FeatureProviders props={props}>
        <Publisher view={view} />
        <Reader onReady={() => undefined} />
      </FeatureProviders>
    );
  };
  const result = render(tree(options));
  return { rerender: (next) => result.rerender(tree(next)) };
}

const session = (): AgentSession => {
  const found = handles.current.session;
  if (!found) throw new Error("no session published");
  return found;
};

const edit = (idempotencyKey: string): Promise<ExecuteResult> =>
  session().execute(
    "edit.cells",
    { edits: [{ rowKey: "1", column: "name", value: "Ada L." }] },
    session().manifest().viewRevision,
    idempotencyKey
  );

describe("approval through the table's own chrome", () => {
  it("parks the write, publishes the proposals, and applies it on approve", async () => {
    const onCellEdit = vi.fn();
    mount(
      { tableId: "approve", approval: "writes" },
      { ...VIEW, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = edit("approve-1");
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    expect(handles.current.pending?.proposals).toHaveLength(1);
    expect(onCellEdit).not.toHaveBeenCalled();

    act(() => {
      handles.current.pending?.approve();
    });
    expect((await result).ok).toBe(true);
    expect(onCellEdit).toHaveBeenCalledTimes(1);
    expect(handles.current.pending).toBeNull();
  });

  it("leaves the row untouched on reject", async () => {
    const onCellEdit = vi.fn();
    mount(
      { tableId: "reject", approval: "writes" },
      { ...VIEW, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = edit("reject-1");
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    act(() => {
      handles.current.pending?.reject();
    });

    const settled = await result;
    expect(settled.result).toMatchObject({ applied: false });
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("refuses a second write while one is still waiting for a decision", async () => {
    mount({ tableId: "queue", approval: "writes" });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const first = edit("queue-1");
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    const second = await edit("queue-2");

    expect(second.ok).toBe(false);
    expect(second.error?.message).toMatch(/already pending/);
    act(() => {
      handles.current.pending?.reject();
    });
    await first;
  });

  it("abandons the pending write when the caller aborts", async () => {
    mount({ tableId: "abort", approval: "writes" });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const controller = new AbortController();
    const result = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "x" }] },
      session().manifest().viewRevision,
      "abort-1",
      controller.signal
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    act(() => {
      controller.abort();
    });

    expect((await result).ok).toBe(false);
    await waitFor(() => {
      expect(handles.current.pending).toBeNull();
    });
  });

  it("never parks a write whose caller has already given up", async () => {
    const onCellEdit = vi.fn();
    mount(
      { tableId: "pre-abort", approval: "writes" },
      { ...VIEW, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const controller = new AbortController();
    controller.abort();
    const result = await session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "x" }] },
      session().manifest().viewRevision,
      "pre-abort-1",
      controller.signal
    );

    expect(result.ok).toBe(false);
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(handles.current.pending).toBeNull();
  });

  it("publishes no chrome state when the host owns approval", async () => {
    const onApprove = vi.fn().mockResolvedValue(true);
    mount({ tableId: "host", approval: "writes", onApprove });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    expect((await edit("host-1")).ok).toBe(true);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(handles.current.pending).toBeNull();
  });
});

describe("host callbacks in place of the live table's", () => {
  const apply: AgentApply = {
    setGroupBy: vi.fn(),
    setFilters: vi.fn(),
    applyView: vi.fn(),
    runExport: vi.fn(),
    reorderRows: vi.fn(),
  };

  it("routes every overridden operation to the host, not the view", async () => {
    mount(
      { tableId: "extra", approval: "never", apply },
      {
        ...VIEW,
        sourceCapabilities: {
          fullDataset: true,
          grouping: "client",
          selectAcrossPages: true,
          exportScope: "all",
          totalCount: "exact",
        },
      }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const revision = session().manifest().viewRevision;
    await session().execute(
      "view.setFilters",
      { filters: { team: "Core" } },
      revision,
      "x-filters"
    );

    expect(apply.setFilters).toHaveBeenCalledWith({ team: "Core" });

    await session().execute(
      "view.setGroupBy",
      { key: "team" },
      session().manifest().viewRevision,
      "x-group"
    );

    expect(apply.setGroupBy).toHaveBeenCalledWith("team");
  });

  it("runs the host's view callbacks exactly once, and not the table's", async () => {
    const hostPage = vi.fn();
    const hostLimit = vi.fn();
    const hostSearch = vi.fn();
    const hostSort = vi.fn();
    const livePage = vi.fn();
    const liveLimit = vi.fn();
    const liveSearch = vi.fn();
    const liveSort = vi.fn();
    mount(
      {
        tableId: "override-once",
        approval: "never",
        apply: {
          setPage: hostPage,
          setLimit: hostLimit,
          setSearch: hostSearch,
          setSort: hostSort,
        },
      },
      {
        ...VIEW,
        query: {
          page: 1,
          limit: 10,
          search: "",
          setPage: livePage,
          setLimit: liveLimit,
          setSearch: liveSearch,
          setSort: liveSort,
        },
      }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const revision = session().manifest().viewRevision;
    await session().execute(
      "view.setPage",
      { page: 1, limit: 25 },
      revision,
      "o-page"
    );
    await session().execute(
      "view.setSearch",
      { query: "ada" },
      revision,
      "o-q"
    );
    await session().execute(
      "view.setSort",
      { key: "name", dir: "asc" },
      revision,
      "o-sort"
    );

    expect(hostPage).toHaveBeenCalledExactlyOnceWith(1);
    expect(hostLimit).toHaveBeenCalledExactlyOnceWith(25);
    expect(hostSearch).toHaveBeenCalledExactlyOnceWith("ada");
    expect(hostSort).toHaveBeenCalledExactlyOnceWith("name", "asc");
    // The host is the single authority: the live table's own callbacks are
    // not reached as well.
    expect(livePage).not.toHaveBeenCalled();
    expect(liveLimit).not.toHaveBeenCalled();
    expect(liveSearch).not.toHaveBeenCalled();
    expect(liveSort).not.toHaveBeenCalled();
  });

  it("runs the table's own view callbacks when the host overrides none", async () => {
    const livePage = vi.fn();
    const liveLimit = vi.fn();
    const liveSearch = vi.fn();
    const liveSort = vi.fn();
    mount(
      { tableId: "runtime-default", approval: "never" },
      {
        ...VIEW,
        query: {
          page: 1,
          limit: 10,
          search: "",
          setPage: livePage,
          setLimit: liveLimit,
          setSearch: liveSearch,
          setSort: liveSort,
        },
      }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const revision = session().manifest().viewRevision;
    await session().execute(
      "view.setPage",
      { page: 1, limit: 25 },
      revision,
      "d-page"
    );
    await session().execute(
      "view.setSearch",
      { query: "ada" },
      revision,
      "d-q"
    );
    await session().execute(
      "view.setSort",
      { key: "name", dir: "desc" },
      revision,
      "d-sort"
    );

    expect(livePage).toHaveBeenCalledExactlyOnceWith(1);
    expect(liveLimit).toHaveBeenCalledExactlyOnceWith(25);
    expect(liveSearch).toHaveBeenCalledExactlyOnceWith("ada");
    expect(liveSort).toHaveBeenCalledExactlyOnceWith("name", "desc");
  });

  it("hands a saved view and an export straight to the host", async () => {
    const applyView = vi.fn();
    const runExport = vi.fn().mockReturnValue({ rows: 5 });
    mount(
      {
        tableId: "passthrough",
        approval: "never",
        apply: { applyView, runExport },
      },
      VIEW
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const revision = session().manifest().viewRevision;
    const result = await session().execute(
      "export.run",
      { format: "csv" },
      revision,
      "p-export"
    );

    // The host's own return value survives — the wrapper that used to sit in
    // front of it did not swallow it, and neither does its absence.
    expect(runExport).toHaveBeenCalledExactlyOnceWith("csv");
    expect(result.result).toEqual({ rows: 5 });
    expect(applyView).not.toHaveBeenCalled();
  });

  it("describes a capability the manifest lists", async () => {
    mount({ tableId: "describe", approval: "never" });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const key = session().catalog()[0]?.key ?? "";
    expect(session().describe(key)).toMatchObject({ key });
  });

  it("starts a new session when the table identity changes", async () => {
    const { rerender } = mount({ tableId: "first", approval: "never" });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const before = session();

    rerender({ tableId: "second", approval: "never" });
    await waitFor(() => {
      expect(session().manifest().tableId).toBe("second");
    });

    expect(session()).not.toBe(before);
  });
});
