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
import { StrictMode, useEffect } from "react";
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
  readonly operation?: { readonly capability: string; readonly title?: string };
  readonly decisions: readonly string[];
  readonly approve: () => void;
  readonly reject: () => void;
  readonly decideAt?: (index: number, approved: boolean) => void;
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

  it("propagates a host callback's async failure instead of swallowing it", async () => {
    // The simplification removed the wrappers that used to stand between the
    // session and a host callback. A rejected promise has to travel the same
    // distance a thrown error does — reported as the operation failing, with
    // the host's own message intact, never reported as success.
    const runExport = vi
      .fn()
      .mockRejectedValue(new Error("the export endpoint refused"));
    mount(
      { tableId: "async-failure", approval: "never", apply: { runExport } },
      VIEW
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = await session().execute(
      "export.run",
      { format: "csv" },
      session().manifest().viewRevision,
      "p-export-fails"
    );

    expect(runExport).toHaveBeenCalledExactlyOnceWith("csv");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("apply-failed");
    expect(result.error?.message).toBe("the export endpoint refused");
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

/**
 * What the host is told while a write waits, and when it stops being told.
 *
 * `execute` does not resolve while an approval is open, so a panel outside
 * the table has nothing to go on: without this channel it shows "working" at
 * a turn that is waiting on a person, and keeps showing it after the table
 * has gone. Everything here drives the real feature — the bridge callback the
 * provider calls, not a state value handed to a widget.
 */
describe("telling the host a write is waiting", () => {
  it("announces the open and the close, once each", async () => {
    const approvals = vi.fn<(pending: boolean) => void>();
    mount({ tableId: "announce", approval: "writes", bridge: { approvals } });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    approvals.mockClear();

    const result = edit("announce-1");
    await waitFor(() => {
      expect(approvals).toHaveBeenCalledWith(true);
    });
    expect(approvals).toHaveBeenCalledTimes(1);

    act(() => {
      handles.current.pending?.approve();
    });
    await result;
    await waitFor(() => {
      expect(approvals).toHaveBeenLastCalledWith(false);
    });
    expect(approvals).toHaveBeenCalledTimes(2);
  });

  it("retracts when the write is rejected", async () => {
    const onCellEdit = vi.fn();
    const approvals = vi.fn<(pending: boolean) => void>();
    mount(
      { tableId: "reject", approval: "writes", bridge: { approvals } },
      { ...VIEW, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = edit("reject-1");
    await waitFor(() => {
      expect(approvals).toHaveBeenCalledWith(true);
    });

    act(() => {
      handles.current.pending?.reject();
    });
    const settled = await result;

    await waitFor(() => {
      expect(approvals).toHaveBeenLastCalledWith(false);
    });
    // Refused means refused: nothing reached the host's editor.
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(settled.ok).toBe(true);
  });

  it("retracts when the turn is stopped, and writes nothing", async () => {
    const onCellEdit = vi.fn();
    const approvals = vi.fn<(pending: boolean) => void>();
    mount(
      { tableId: "stop", approval: "writes", bridge: { approvals } },
      { ...VIEW, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    // Stop is an abort on the turn's own signal — the same one the assistant
    // controller passes when the reader presses it.
    const controller = new AbortController();
    const result = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "Ada L." }] },
      session().manifest().viewRevision,
      "stop-1",
      controller.signal
    );
    await waitFor(() => {
      expect(approvals).toHaveBeenCalledWith(true);
    });

    act(() => {
      controller.abort();
    });
    await result;

    await waitFor(() => {
      expect(approvals).toHaveBeenLastCalledWith(false);
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(handles.current.pending).toBeNull();
  });

  it("clears the host's pending state when the table goes away", async () => {
    const approvals = vi.fn<(pending: boolean) => void>();
    const view = { ...VIEW };
    const props = applyTableFeatures({
      features: [
        tableAgent({
          tableId: "unmount",
          approval: "writes",
          commit: "immediate",
          columns: { name: { type: "string", writable: true } },
          bridge: { approvals },
        }),
        { id: "editing" },
      ],
    });
    const view_ = render(
      <FeatureProviders props={props}>
        <Publisher view={view} />
        <Reader onReady={() => undefined} />
      </FeatureProviders>
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    void edit("unmount-1");
    await waitFor(() => {
      expect(approvals).toHaveBeenCalledWith(true);
    });

    // Nothing runs an effect after an unmount, so the retraction has to come
    // from the cleanup — otherwise the host is left waiting on a table that
    // no longer exists.
    view_.unmount();
    expect(approvals).toHaveBeenLastCalledWith(false);
  });

  it("hands a replacement subscriber the current state", async () => {
    const first = vi.fn<(pending: boolean) => void>();
    const second = vi.fn<(pending: boolean) => void>();
    const { rerender } = mount({
      tableId: "swap",
      approval: "writes",
      bridge: { approvals: first },
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    void edit("swap-1");
    await waitFor(() => {
      expect(first).toHaveBeenCalledWith(true);
    });

    rerender({
      tableId: "swap",
      approval: "writes",
      bridge: { approvals: second },
    });

    await waitFor(() => {
      // The one leaving must not be left believing an approval is still open,
      // and the one arriving has never been told anything.
      expect(first).toHaveBeenLastCalledWith(false);
      expect(second).toHaveBeenLastCalledWith(true);
    });
  });

  it("says nothing extra when only the bridge object is new", async () => {
    const approvals = vi.fn<(pending: boolean) => void>();
    const { rerender } = mount({
      tableId: "inline",
      approval: "writes",
      bridge: { approvals },
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    void edit("inline-1");
    await waitFor(() => {
      expect(approvals).toHaveBeenCalledWith(true);
    });
    const announced = approvals.mock.calls.length;

    // A host rebuilding `bridge={{ ... }}` inline every render is the normal
    // case; the same function inside it is the same subscriber.
    rerender({
      tableId: "inline",
      approval: "writes",
      bridge: { approvals },
    });
    rerender({
      tableId: "inline",
      approval: "writes",
      bridge: { approvals },
    });

    expect(approvals.mock.calls).toHaveLength(announced);
  });
});

/**
 * Strict Mode runs every effect setup, cleanup, setup. A retraction that
 * fires in that cleanup and never comes back would leave the host showing
 * nothing while a write is still parked.
 */
describe("under Strict Mode's double effects", () => {
  it("still reports an approval that is genuinely open", async () => {
    const approvals = vi.fn<(pending: boolean) => void>();
    const props = applyTableFeatures({
      features: [
        tableAgent({
          tableId: "strict",
          approval: "writes",
          commit: "immediate",
          columns: { name: { type: "string", writable: true } },
          bridge: { approvals },
        }),
        { id: "editing" },
      ],
    });
    render(
      <StrictMode>
        <FeatureProviders props={props}>
          <Publisher view={VIEW} />
          <Reader onReady={() => undefined} />
        </FeatureProviders>
      </StrictMode>
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    void edit("strict-1");
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    // Whatever the double invocation did on the way, the last thing the host
    // heard has to match the write that is actually waiting.
    await waitFor(() => {
      expect(approvals).toHaveBeenLastCalledWith(true);
    });
  });
});

describe("deciding a bulk write row by row", () => {
  const ROWS_3: Row[] = [
    { id: "1", name: "Ada" },
    { id: "2", name: "Grace" },
    { id: "3", name: "Alan" },
  ];
  const VIEW_3 = { ...VIEW, rows: ROWS_3 };

  const editThree = (key: string): Promise<ExecuteResult> =>
    session().execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "1", column: "name", value: "A." },
          { rowKey: "2", column: "name", value: "G." },
          { rowKey: "3", column: "name", value: "Al." },
        ],
      },
      session().manifest().viewRevision,
      key
    );

  async function openThree(key: string, onCellEdit: ReturnType<typeof vi.fn>) {
    // `handles` is module state the last test left behind. Clearing it is
    // what makes the wait below wait for THIS tree rather than pass on a
    // session that is already unmounted.
    handles.current = { session: undefined, pending: null };
    mount(
      { tableId: key, approval: "writes" },
      { ...VIEW_3, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const result = editThree(key);
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    // Boxed: awaiting this helper must not await the undecided write.
    return { result };
  }

  it("starts with every row undecided", async () => {
    const onCellEdit = vi.fn();
    const { result } = await openThree("per-item-start", onCellEdit);

    expect(handles.current.pending?.decisions).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    expect(handles.current.pending?.decideAt).toBeTypeOf("function");

    act(() => {
      handles.current.pending?.reject();
    });
    await result;
  });

  it("settles the write once the last row is answered, writing only those approved", async () => {
    const onCellEdit = vi.fn();
    const { result } = await openThree("per-item-mixed", onCellEdit);

    act(() => {
      handles.current.pending?.decideAt?.(0, true);
    });
    // Two rows still undecided, so nothing has been written yet.
    expect(handles.current.pending).not.toBeNull();
    expect(onCellEdit).not.toHaveBeenCalled();

    act(() => {
      handles.current.pending?.decideAt?.(1, false);
    });
    act(() => {
      handles.current.pending?.decideAt?.(2, true);
    });

    const settled = await result;
    expect(settled.ok).toBe(true);
    expect((settled.result as { approval: string }).approval).toBe("partial");
    const rows = onCellEdit.mock.calls.map((call) => (call[0] as Row).id);
    expect(rows).toEqual(["1", "3"]);
  });

  it("keeps a refused row refused when the reader then approves the rest", async () => {
    const onCellEdit = vi.fn();
    const { result } = await openThree("per-item-approve-rest", onCellEdit);

    act(() => {
      handles.current.pending?.decideAt?.(1, false);
    });
    act(() => {
      handles.current.pending?.approve();
    });

    const settled = await result;
    expect((settled.result as { approval: string }).approval).toBe("partial");
    const rows = onCellEdit.mock.calls.map((call) => (call[0] as Row).id);
    expect(rows).toEqual(["1", "3"]);
  });

  it("keeps an approved row when the reader then refuses the rest", async () => {
    const onCellEdit = vi.fn();
    const { result } = await openThree("per-item-reject-rest", onCellEdit);

    act(() => {
      handles.current.pending?.decideAt?.(2, true);
    });
    act(() => {
      handles.current.pending?.reject();
    });

    const settled = await result;
    expect((settled.result as { approval: string }).approval).toBe("partial");
    const rows = onCellEdit.mock.calls.map((call) => (call[0] as Row).id);
    expect(rows).toEqual(["3"]);
  });

  it("does not carry a decision onto the next write", async () => {
    const onCellEdit = vi.fn();
    const { result: first } = await openThree("per-item-reset", onCellEdit);
    act(() => {
      handles.current.pending?.decideAt?.(0, false);
    });
    act(() => {
      handles.current.pending?.approve();
    });
    await first;

    const second = editThree("per-item-reset-2");
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    expect(handles.current.pending?.decisions).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    act(() => {
      handles.current.pending?.reject();
    });
    await second;
  });
});

describe("a write that names no rows", () => {
  it("hands the reader the capability instead of an empty list", async () => {
    handles.current = { session: undefined, pending: null };
    mount({
      tableId: "operation",
      approval: "writes",
      capabilities: [
        {
          key: "staff.activateAll",
          summary: "Activate every matching row",
          kind: "write",
          presentation: { title: "Activate everyone" },
          guide: {
            guide: "Activate every row the filter matches.",
            input: { type: "object" },
            output: { type: "object" },
          },
          isEnabled: () => true,
          execute: () => ({ ok: true }),
        },
      ],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = session().execute(
      "staff.activateAll",
      { status: "Active" },
      session().manifest().viewRevision,
      "operation-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    expect(handles.current.pending?.proposals).toHaveLength(0);
    expect(handles.current.pending?.operation).toMatchObject({
      capability: "staff.activateAll",
      title: "Activate everyone",
    });
    // One thing to agree to means no per-row controls to draw.
    expect(handles.current.pending?.decideAt).toBeUndefined();

    act(() => {
      handles.current.pending?.approve();
    });
    expect((await result).ok).toBe(true);
  });
});
