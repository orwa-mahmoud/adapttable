/**
 * The two ways a write reaches a human, and the host callbacks that replace
 * the live table's own.
 *
 * Approval is chrome the table renders: the binding parks the write, publishes
 * the proposals, and waits. Nothing about that is visible from the session
 * alone, so it is driven here the way the approval strip drives it.
 */
import type { AgentApply, AgentSession, ExecuteResult } from "@adapttable/ai";
import type { ActionAiOptions } from "@adapttable/core";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalPending,
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

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];

type Pending = {
  readonly presentation?: string;
  readonly proposals: readonly {
    readonly rowKey?: string;
    readonly beforeText?: string;
    readonly afterText?: string;
  }[];
  readonly operation?: { readonly capability: string; readonly title?: string };
  readonly decisions: readonly string[];
  readonly approve: () => void;
  readonly reject: () => void;
  readonly alwaysAllow?: () => void;
  readonly decideAt?: (index: number, approved: boolean) => void;
} | null;

const VIEW: TableRuntimeView<Row> = {
  rows: ROWS,
  getRowId: (row) => row.id,
  rowLabel: (row) => row.name,
  editing: { onCellEdit: () => undefined },
};

/** A custom write the table can park, remember, or run unmarked. */
function sensitive(ai?: ActionAiOptions) {
  const ran: unknown[] = [];
  return {
    ran,
    capability: {
      key: "staff.archive",
      summary: "Archive a person",
      kind: "write" as const,
      ...(ai ? { ai } : {}),
      guide: {
        guide: "Archive.",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: (_context: unknown, args: unknown) => {
        ran.push(args);
        return { proposals: [], applied: true, approval: "not-required" };
      },
    },
  };
}

function Publisher({ view }: { view: TableRuntimeView<Row> }) {
  usePublishTableRuntime(view.rows, undefined, view);
  return null;
}

interface Handles {
  readonly session: AgentSession | undefined;
  readonly pending: Pending;
  readonly alwaysAllow?: AgentAlwaysAllowState | null;
}

const handles: { current: Handles } = {
  current: { session: undefined, pending: null },
};

function Reader({ onReady }: { onReady: () => void }) {
  const session = useFeatureState(TABLE_AGENT_STATE);
  const pending = useFeatureState(AGENT_APPROVAL_STATE);
  const alwaysAllow = useFeatureState(AGENT_ALWAYS_ALLOW_STATE);
  handles.current = {
    session,
    pending: pending ?? null,
    alwaysAllow: alwaysAllow ?? null,
  };
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
        // The panel, not the static feature: grouping is offered to an agent
        // only where the setter can actually move it.
        { id: "grouping-panel" },
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

  it("settles when a kit's own button hands it the click event", async () => {
    // Every kit wires its reject control `onClick={onReject}`, and the slot
    // contract says that handler takes nothing — so what actually arrives is
    // a MouseEvent. Reading it as a stated reason left the write pending and
    // the approval strip on screen with nothing able to close it.
    const onCellEdit = vi.fn();
    mount(
      { tableId: "clicked", approval: "writes" },
      { ...VIEW, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = edit("clicked-1");
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    act(() => {
      (handles.current.pending?.reject as (value: unknown) => void)(
        new MouseEvent("click")
      );
    });

    const settled = await result;
    expect(settled.result).toMatchObject({ applied: false });
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("keeps a reason the reader actually stated", async () => {
    mount({ tableId: "stated", approval: "writes" });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = edit("stated-1");
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    act(() => {
      (handles.current.pending?.reject as (value: unknown) => void)(
        "  not during the close  "
      );
    });

    const settled = await result;
    expect(JSON.stringify(settled.result)).toContain("not during the close");
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
        // The reader's own sort control is what the agent is held to, so a
        // table meant to be sortable says so.
        columns: { name: { sortable: true } },
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
      {
        tableId: "runtime-default",
        approval: "never",
        columns: { name: { sortable: true } },
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
    const approvals = vi.fn<(pending: AgentApprovalPending | null) => void>();
    mount({ tableId: "announce", approval: "writes", bridge: { approvals } });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    approvals.mockClear();

    const result = edit("announce-1");
    await waitFor(() => {
      expect(approvals).toHaveBeenCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
    });
    expect(approvals).toHaveBeenCalledTimes(1);

    act(() => {
      handles.current.pending?.approve();
    });
    await result;
    await waitFor(() => {
      expect(approvals).toHaveBeenLastCalledWith(null);
    });
    expect(approvals).toHaveBeenCalledTimes(2);
  });

  it("retracts when the write is rejected", async () => {
    const onCellEdit = vi.fn();
    const approvals = vi.fn<(pending: AgentApprovalPending | null) => void>();
    mount(
      { tableId: "reject", approval: "writes", bridge: { approvals } },
      { ...VIEW, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = edit("reject-1");
    await waitFor(() => {
      expect(approvals).toHaveBeenCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
    });

    act(() => {
      handles.current.pending?.reject();
    });
    const settled = await result;

    await waitFor(() => {
      expect(approvals).toHaveBeenLastCalledWith(null);
    });
    // Refused means refused: nothing reached the host's editor.
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(settled.ok).toBe(true);
  });

  it("retracts when the turn is stopped, and writes nothing", async () => {
    const onCellEdit = vi.fn();
    const approvals = vi.fn<(pending: AgentApprovalPending | null) => void>();
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
      expect(approvals).toHaveBeenCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
    });

    act(() => {
      controller.abort();
    });
    await result;

    await waitFor(() => {
      expect(approvals).toHaveBeenLastCalledWith(null);
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(handles.current.pending).toBeNull();
  });

  it("clears the host's pending state when the table goes away", async () => {
    const approvals = vi.fn<(pending: AgentApprovalPending | null) => void>();
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
      expect(approvals).toHaveBeenCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
    });

    // Nothing runs an effect after an unmount, so the retraction has to come
    // from the cleanup — otherwise the host is left waiting on a table that
    // no longer exists.
    view_.unmount();
    expect(approvals).toHaveBeenLastCalledWith(null);
  });

  it("hands a replacement subscriber the current state", async () => {
    const first = vi.fn<(pending: AgentApprovalPending | null) => void>();
    const second = vi.fn<(pending: AgentApprovalPending | null) => void>();
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
      expect(first).toHaveBeenCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
    });

    rerender({
      tableId: "swap",
      approval: "writes",
      bridge: { approvals: second },
    });

    await waitFor(() => {
      // The one leaving must not be left believing an approval is still open,
      // and the one arriving has never been told anything.
      expect(first).toHaveBeenLastCalledWith(null);
      expect(second).toHaveBeenLastCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
    });
  });

  it("says nothing extra when only the bridge object is new", async () => {
    const approvals = vi.fn<(pending: AgentApprovalPending | null) => void>();
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
      expect(approvals).toHaveBeenCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
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
    const approvals = vi.fn<(pending: AgentApprovalPending | null) => void>();
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
      expect(approvals).toHaveBeenLastCalledWith(
        expect.objectContaining({ proposals: expect.anything() })
      );
    });
  });

  it("does not execute a decision because a render was replayed", async () => {
    const onCellEdit = vi.fn();
    handles.current = { session: undefined, pending: null };
    const props = applyTableFeatures({
      features: [
        tableAgent({
          tableId: "strict-decide",
          approval: "writes",
          commit: "immediate",
          columns: { name: { type: "string", writable: true } },
        }),
        { id: "editing" },
      ],
    });
    render(
      <StrictMode>
        <FeatureProviders props={props}>
          <Publisher
            view={{
              ...VIEW,
              rows: [
                { id: "1", name: "Ada" },
                { id: "2", name: "Grace" },
              ],
              editing: { onCellEdit },
            }}
          />
          <Reader onReady={() => undefined} />
        </FeatureProviders>
      </StrictMode>
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = session().execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "1", column: "name", value: "A." },
          { rowKey: "2", column: "name", value: "G." },
        ],
      },
      session().manifest().viewRevision,
      "strict-decide-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    // Strict Mode invokes a state updater twice. A decision recorded in one
    // must not be a write performed twice, which is why answering the last
    // row settles in an effect rather than inside the updater.
    act(() => {
      handles.current.pending?.decideAt?.(0, true);
    });
    act(() => {
      handles.current.pending?.decideAt?.(1, true);
    });

    const settled = await result;
    expect(settled.ok).toBe(true);
    expect(onCellEdit).toHaveBeenCalledTimes(2);
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

  async function openThree(
    key: string,
    onCellEdit: (row: Row, column: string, next: unknown) => unknown
  ) {
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
  /** Open one opaque bulk operation and hand back what it recorded. */
  async function openOperation(key: string) {
    handles.current = { session: undefined, pending: null };
    const ran: unknown[] = [];
    mount({
      tableId: key,
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
          // A real bulk capability returns a write result, which is what
          // carries the approval outcome back to the caller.
          execute: (_context, args) => {
            ran.push(args);
            return { proposals: [], applied: true, approval: "not-required" };
          },
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
      key
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    return { ran, result };
  }

  it("hands the reader the capability instead of an empty list", async () => {
    const { ran, result } = await openOperation("operation-1");

    expect(handles.current.pending?.proposals).toHaveLength(0);
    expect(handles.current.pending?.operation).toMatchObject({
      capability: "staff.activateAll",
      title: "Activate everyone",
    });
    // One thing to agree to means no per-row controls to draw.
    expect(handles.current.pending?.decideAt).toBeUndefined();
    // And it waits. An empty decision list is not "everything is decided".
    expect(ran).toHaveLength(0);

    act(() => {
      handles.current.pending?.approve();
    });
    const settled = await result;

    expect(settled.ok).toBe(true);
    expect((settled.result as { approval: string }).approval).toBe("approved");
    expect((settled.result as { applied: boolean }).applied).toBe(true);
    // Ran exactly once, with the arguments the model sent.
    expect(ran).toEqual([{ status: "Active" }]);
  });

  it("does not run the operation when the reader refuses it", async () => {
    const { ran, result } = await openOperation("operation-reject");
    act(() => {
      handles.current.pending?.reject();
    });
    const settled = await result;

    expect((settled.result as { approval: string }).approval).toBe("rejected");
    expect(ran).toHaveLength(0);
  });

  it("runs it once however many times Approve is clicked", async () => {
    const { ran, result } = await openOperation("operation-double-click");
    act(() => {
      handles.current.pending?.approve();
      handles.current.pending?.approve();
      handles.current.pending?.approve();
    });
    await result;

    expect(ran).toHaveLength(1);
  });
});

describe("one transaction at a time", () => {
  const ROWS_2: Row[] = [
    { id: "1", name: "Ada" },
    { id: "2", name: "Grace" },
  ];

  async function openTwo(key: string, onCellEdit: (row: Row) => unknown) {
    handles.current = { session: undefined, pending: null };
    mount(
      { tableId: key, approval: "writes" },
      { ...VIEW, rows: ROWS_2, editing: { onCellEdit } }
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const result = session().execute(
      "edit.cells",
      {
        edits: [
          { rowKey: "1", column: "name", value: "A." },
          { rowKey: "2", column: "name", value: "G." },
        ],
      },
      session().manifest().viewRevision,
      key
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    return { result };
  }

  it("shows a new write's rows with its own decisions, never the last one's", async () => {
    const onCellEdit = vi.fn();
    const first = await openTwo("txn-fresh", onCellEdit);
    act(() => {
      handles.current.pending?.decideAt?.(0, false);
    });
    expect(handles.current.pending?.decisions).toEqual(["rejected", "pending"]);
    act(() => {
      handles.current.pending?.approve();
    });
    await first.result;

    // The next write opens with its rows and its own blank slate, in the
    // same commit — never one frame of new rows beside old answers.
    const second = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "Ada L." }] },
      session().manifest().viewRevision,
      "txn-fresh-2"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    expect(handles.current.pending?.proposals).toHaveLength(1);
    expect(handles.current.pending?.decisions).toEqual(["pending"]);

    act(() => {
      handles.current.pending?.reject();
    });
    await second;
  });

  it("ignores a control left over from an approval that already settled", async () => {
    const onCellEdit = vi.fn();
    const first = await openTwo("txn-stale", onCellEdit);
    // A control captured while the first approval was open.
    const staleDecide = handles.current.pending?.decideAt;
    act(() => {
      handles.current.pending?.reject();
    });
    await first.result;

    const second = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "Ada L." }] },
      session().manifest().viewRevision,
      "txn-stale-2"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    // Clicking it now must not answer the write that is open.
    act(() => {
      staleDecide?.(0, true);
    });
    expect(handles.current.pending?.decisions).toEqual(["pending"]);

    act(() => {
      handles.current.pending?.reject();
    });
    await second;
  });

  it("ignores a position that is not a row of the open plan", async () => {
    const onCellEdit = vi.fn();
    const { result } = await openTwo("txn-range", onCellEdit);

    act(() => {
      handles.current.pending?.decideAt?.(9, true);
      handles.current.pending?.decideAt?.(-1, true);
      handles.current.pending?.decideAt?.(1.5, true);
    });
    expect(handles.current.pending?.decisions).toEqual(["pending", "pending"]);

    act(() => {
      handles.current.pending?.reject();
    });
    await result;
  });

  it("settles once when the same decision is clicked repeatedly", async () => {
    const onCellEdit = vi.fn();
    const { result } = await openTwo("txn-repeat", onCellEdit);

    act(() => {
      handles.current.pending?.decideAt?.(0, true);
      handles.current.pending?.decideAt?.(1, true);
      // Two more clicks after the write has already settled.
      handles.current.pending?.decideAt?.(1, true);
      handles.current.pending?.decideAt?.(0, true);
    });

    const settled = await result;
    expect(settled.ok).toBe(true);
    expect(onCellEdit).toHaveBeenCalledTimes(2);
  });

  it("settles once when Approve and Reject land in the same tick", async () => {
    const onCellEdit = vi.fn();
    const { result } = await openTwo("txn-race", onCellEdit);

    act(() => {
      handles.current.pending?.approve();
      handles.current.pending?.reject();
    });

    const settled = await result;
    // The first answer wins; the second is not a second answer.
    expect((settled.result as { approval: string }).approval).toBe("approved");
    expect(onCellEdit).toHaveBeenCalledTimes(2);
  });

  it("refuses the write when the provider goes away undecided", async () => {
    const onCellEdit = vi.fn();
    handles.current = { session: undefined, pending: null };
    const tree = render(
      <FeatureProviders
        props={applyTableFeatures({
          features: [
            tableAgent({
              tableId: "txn-unmount",
              approval: "writes",
              columns: { name: { type: "string", writable: true } },
              commit: "immediate",
            }),
            { id: "editing" },
          ],
        })}
      >
        <Publisher view={{ ...VIEW, rows: ROWS_2, editing: { onCellEdit } }} />
        <Reader onReady={() => undefined} />
      </FeatureProviders>
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const result = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "A." }] },
      session().manifest().viewRevision,
      "txn-unmount"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    tree.unmount();

    const settled = await result;
    expect((settled.result as { applied: boolean }).applied).toBe(false);
    expect(onCellEdit).not.toHaveBeenCalled();
  });
});

/**
 * The reader approving a write and the model that proposed it are not owed
 * the same data. These tests use one recognizable value — SECRET — and check
 * both directions at once: what the approval view may show, and what the
 * session hands back for a backend to receive.
 */
describe("what the reader sees is not what the model is told", () => {
  const SECRET = "SECRET-do-not-disclose";

  interface Staff {
    id: string;
    name: string;
    ssn: string;
  }

  const STAFF: Staff[] = [
    { id: "1", name: "Ada", ssn: SECRET },
    { id: "2", name: "Grace", ssn: SECRET },
  ];

  const STAFF_VIEW = {
    rows: STAFF,
    getRowId: (row: Staff) => row.id,
    rowLabel: (row: Staff) => row.name,
    editing: { onCellEdit: () => undefined },
  };

  function mountStaff(key: string, visible: Staff[] = STAFF) {
    handles.current = { session: undefined, pending: null };
    const props = applyTableFeatures({
      features: [
        tableAgent({
          tableId: key,
          approval: "writes",
          commit: "immediate",
          columns: {
            name: { type: "string", readable: true, writable: true },
            // Writable, deliberately not readable: the agent may set it and
            // may never be told what it holds.
            ssn: { type: "string", readable: false, writable: true },
          },
        }),
        { id: "editing" },
      ],
    });
    return render(
      <FeatureProviders props={props}>
        <Publisher view={{ ...STAFF_VIEW, rows: visible } as never} />
        <Reader onReady={() => undefined} />
      </FeatureProviders>
    );
  }

  it("names the row for the reader instead of showing its key", async () => {
    mountStaff("secret-label");
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const result = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "name", value: "Ada L." }] },
      session().manifest().viewRevision,
      "secret-label-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    const proposal = handles.current.pending?.proposals[0] as {
      rowLabel?: string;
      before?: unknown;
    };
    expect(proposal.rowLabel).toBe("Ada");
    expect(proposal.before).toBe("Ada");

    act(() => {
      handles.current.pending?.reject();
    });
    await result;
  });

  it("never puts an unreadable value in front of the reader either", async () => {
    mountStaff("secret-column");
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const result = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "ssn", value: "redacted" }] },
      session().manifest().viewRevision,
      "secret-column-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    // Viewing the table is not entitlement to every cell in it.
    const proposal = handles.current.pending?.proposals[0] as {
      before?: unknown;
      beforeUnavailable?: boolean;
    };
    expect(proposal.before).toBeUndefined();
    expect(proposal.beforeUnavailable).toBe(true);
    expect(JSON.stringify(handles.current.pending?.proposals)).not.toContain(
      SECRET
    );

    act(() => {
      handles.current.pending?.approve();
    });
    const settled = await result;
    // And the value never reached the model's result either.
    expect(JSON.stringify(settled)).not.toContain(SECRET);
  });

  it("says unavailable, not blank, for a row the table has not loaded", async () => {
    // A server-tier table holding only page one. Row 2 was addressed by key.
    mountStaff("secret-unloaded", [STAFF[0]!]);
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const result = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "2", column: "name", value: "G." }] },
      session().manifest().viewRevision,
      "secret-unloaded-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    const proposal = handles.current.pending?.proposals[0] as {
      before?: unknown;
      beforeUnavailable?: boolean;
      rowLabel?: string;
    };
    expect(proposal.beforeUnavailable).toBe(true);
    expect(proposal.rowLabel).toBeUndefined();

    act(() => {
      handles.current.pending?.reject();
    });
    await result;
  });

  it("keeps a rejected write's details out of the result as well", async () => {
    mountStaff("secret-rejected");
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });
    const result = session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "ssn", value: "redacted" }] },
      session().manifest().viewRevision,
      "secret-rejected-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    act(() => {
      handles.current.pending?.reject();
    });

    expect(JSON.stringify(await result)).not.toContain(SECRET);
  });
});

/**
 * Three ways an approval could be answered by the wrong party, or in the
 * wrong shape. Each of these failed before the fix beside it.
 */
describe("who decides, and how", () => {
  it("asks for an action marked required, on a table that asks for nothing", async () => {
    // The binding used to answer "approved" from the SHARED policy alone,
    // which quietly overrode the action's own override.
    handles.current = { session: undefined, pending: null };
    const { ran, capability } = sensitive({
      approval: { policy: "required" },
    });
    mount({
      tableId: "required-override",
      approval: { policy: "never" },
      capabilities: [capability],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = session().execute(
      "staff.archive",
      {},
      session().manifest().viewRevision,
      "required-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    // Parked, not run.
    expect(ran).toHaveLength(0);

    act(() => {
      handles.current.pending?.approve();
    });
    await result;
    expect(ran).toHaveLength(1);
  });

  it("still runs an ordinary action without asking on that table", async () => {
    handles.current = { session: undefined, pending: null };
    const { ran, capability } = sensitive();
    mount({
      tableId: "inherits-never",
      approval: { policy: "never" },
      capabilities: [capability],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const settled = await session().execute(
      "staff.archive",
      {},
      session().manifest().viewRevision,
      "never-1"
    );
    expect(settled.ok).toBe(true);
    expect(ran).toHaveLength(1);
    expect(handles.current.pending).toBeNull();
  });

  it("answers an indivisible write whole, even though it names rows", async () => {
    // Two proposals describing one change — a row move, or any custom write
    // that declares itself indivisible. Sending positions for one of these
    // reached the session as a decision it is right to refuse, so the write
    // could not be approved at all.
    handles.current = { session: undefined, pending: null };
    const ran: unknown[] = [];
    mount({
      tableId: "indivisible",
      approval: "writes",
      capabilities: [
        {
          key: "staff.swap",
          summary: "Swap two people",
          kind: "write",
          guide: {
            guide: "Swap.",
            input: { type: "object" },
            output: { type: "object" },
          },
          isEnabled: () => true,
          plan: () => ({
            proposals: [
              { rowKey: "1", after: "2" },
              { rowKey: "2", before: "1" },
            ],
            payload: { from: "1", to: "2" },
            // One change, described twice.
            perItem: false,
          }),
          execute: (_context, args) => {
            ran.push(args);
            return { proposals: [], applied: true, approval: "not-required" };
          },
        },
      ],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = session().execute(
      "staff.swap",
      { from: "1", to: "2" },
      session().manifest().viewRevision,
      "swap-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    expect(handles.current.pending?.proposals).toHaveLength(2);
    // No per-row controls, because it cannot be split.
    expect(handles.current.pending?.decideAt).toBeUndefined();

    act(() => {
      handles.current.pending?.approve();
    });
    const settled = await result;
    expect(settled.ok).toBe(true);
    expect((settled.result as { approval: string }).approval).toBe("approved");
    expect(ran).toHaveLength(1);
  });

  it("reviews an action where the action says, not where the table does", async () => {
    handles.current = { session: undefined, pending: null };
    const { capability } = sensitive({
      approval: { policy: "required", presentation: "modal" },
    });
    mount({
      tableId: "presentation-override",
      approval: { policy: "writes", presentation: "widget" },
      capabilities: [capability],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = session().execute(
      "staff.archive",
      {},
      session().manifest().viewRevision,
      "presentation-1"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    expect(handles.current.pending?.presentation).toBe("modal");

    act(() => {
      handles.current.pending?.reject();
    });
    await result;
  });

  it("takes the table's own location when the action names none", async () => {
    handles.current = { session: undefined, pending: null };
    const { capability } = sensitive({ approval: { policy: "required" } });
    mount({
      tableId: "presentation-inherit",
      approval: { policy: "never", presentation: "table" },
      capabilities: [capability],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const result = session().execute(
      "staff.archive",
      {},
      session().manifest().viewRevision,
      "presentation-2"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    // Policy overridden, location inherited — the fields resolve separately.
    expect(handles.current.pending?.presentation).toBe("table");

    act(() => {
      handles.current.pending?.reject();
    });
    await result;
  });
});

describe("what the card says, and what the host is told", () => {
  it("reads a value the way its own column writes it", async () => {
    // A table showing `$170k` in every cell must not ask the reader to agree
    // to `170 → 175`: the card is the one screen where an ambiguous number
    // costs something.
    interface Paid {
      id: string;
      name: string;
      salary: number;
    }
    const paid: Paid[] = [{ id: "1", name: "Ada", salary: 170 }];
    const view = {
      rows: paid,
      getRowId: (row: Paid) => row.id,
      rowLabel: (row: Paid) => row.name,
      editing: { onCellEdit: () => undefined },
      groupingState: {
        groupBy: undefined,
        aggregateOverrides: {},
        columnLabel: (key: string) => key,
        setGroupBy: () => undefined,
        columns: [
          {
            key: "salary",
            formatValue: (row: Paid) => `$${String(row.salary)}k`,
          },
        ],
      },
    } as unknown as TableRuntimeView<Row>;

    mount(
      {
        tableId: "paid",
        approval: "writes",
        columns: { salary: { type: "number", writable: true } },
      },
      view
    );
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    void session().execute(
      "edit.cells",
      { edits: [{ rowKey: "1", column: "salary", value: 175 }] },
      session().manifest().viewRevision,
      "fmt"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });

    const proposal = handles.current.pending?.proposals?.[0];
    expect(proposal?.beforeText).toBe("$170k");
    expect(proposal?.afterText).toBe("$175k");
  });

  it("publishes what the reader waved through to a panel outside the table", async () => {
    // The panel cannot read the table's own feature state, so the standing
    // decision travels through the bridge or it cannot be taken back.
    const seen: { capabilities: readonly string[] }[] = [];
    mount(
      {
        tableId: "bridged",
        approval: "never",
        bridge: { alwaysAllowed: (state) => seen.push(state) },
      },
      VIEW
    );
    await waitFor(() => {
      expect(seen.length).toBeGreaterThan(0);
    });

    expect(seen.at(-1)?.capabilities).toEqual([]);
  });

  it("remembers a waved-through write, and asks again once it is revoked", async () => {
    handles.current = { session: undefined, pending: null };
    const { ran, capability } = sensitive();
    mount({
      tableId: "wave-through",
      approval: { policy: "writes", alwaysAllow: ["staff.archive"] },
      capabilities: [capability],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const first = session().execute(
      "staff.archive",
      {},
      session().manifest().viewRevision,
      "wave-1"
    );
    await waitFor(() => {
      expect(handles.current.pending?.alwaysAllow).toBeTypeOf("function");
    });
    act(() => {
      handles.current.pending?.alwaysAllow?.();
    });
    expect((await first).ok).toBe(true);
    expect(ran).toHaveLength(1);

    const second = await session().execute(
      "staff.archive",
      {},
      session().manifest().viewRevision,
      "wave-2"
    );
    expect(second.ok).toBe(true);
    expect(ran).toHaveLength(2);
    expect(handles.current.pending).toBeNull();

    act(() => {
      handles.current.alwaysAllow?.revoke("staff.archive");
    });

    const third = session().execute(
      "staff.archive",
      {},
      session().manifest().viewRevision,
      "wave-3"
    );
    await waitFor(() => {
      expect(handles.current.pending).not.toBeNull();
    });
    act(() => {
      handles.current.pending?.reject();
    });
    await third;
    expect(ran).toHaveLength(2);
  });

  it("tells a panel outside the table how far a long write has got", async () => {
    handles.current = { session: undefined, pending: null };
    const seen: ({ capability: string } | null)[] = [];
    const ran: unknown[] = [];
    mount({
      tableId: "progress",
      approval: "never",
      bridge: { progress: (report) => seen.push(report) },
      capabilities: [
        {
          key: "staff.sweep",
          summary: "Sweep the roster",
          kind: "write" as const,
          guide: {
            guide: "Sweep.",
            input: { type: "object" },
            output: { type: "object" },
          },
          isEnabled: () => true,
          execute: (context: {
            reportProgress?: (report: {
              done: number;
              total: number;
              label: string;
            }) => void;
          }) => {
            context.reportProgress?.({ done: 1, total: 1, label: "rows" });
            ran.push(true);
            return { proposals: [], applied: true, approval: "not-required" };
          },
        },
      ],
    });
    await waitFor(() => {
      expect(handles.current.session).toBeDefined();
    });

    const settled = await session().execute(
      "staff.sweep",
      {},
      session().manifest().viewRevision,
      "sweep-1"
    );
    expect(settled.ok).toBe(true);
    expect(ran).toHaveLength(1);
    expect(seen.some((report) => report?.capability === "staff.sweep")).toBe(
      true
    );
    expect(seen.at(-1)).toBeNull();
  });
});
