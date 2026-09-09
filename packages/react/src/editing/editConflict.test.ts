/**
 * A live row changing under an open editor is a conflict, not a discard.
 */
import type { EditableColumnLike } from "@adapttable/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  liveRowChanged,
  resolveConflictChoice,
  useEditConflict,
} from "./editConflict";

interface Task {
  id: string;
  title: string;
  rev: number;
}

const OPENED: Task = { id: "1", title: "Ship", rev: 1 };
const LIVE: Task = { id: "1", title: "Arrived", rev: 2 };
const TITLE: EditableColumnLike<Task> = {
  key: "title",
  editable: true,
};

describe("liveRowChanged", () => {
  it("sees a change on the edited column", () => {
    expect(
      liveRowChanged({ opened: OPENED, current: LIVE, column: TITLE })
    ).toBe(true);
    expect(
      liveRowChanged({
        opened: OPENED,
        current: { ...OPENED, rev: 9 },
        column: TITLE,
      })
    ).toBe(false);
  });

  it("treats any rowVersion change as a conflict", () => {
    expect(
      liveRowChanged({
        opened: OPENED,
        current: { ...OPENED, rev: 2 },
        column: TITLE,
        rowVersion: (row) => row.rev,
      })
    ).toBe(true);
    expect(
      liveRowChanged({
        opened: OPENED,
        current: OPENED,
        column: TITLE,
        rowVersion: (row) => row.rev,
      })
    ).toBe(false);
  });
});

describe("resolveConflictChoice", () => {
  const conflict = {
    unit: "cell" as const,
    row: LIVE,
    previous: OPENED,
    rowId: "1",
    columnKey: "title",
    draft: "typed",
    incomingValue: "Arrived",
    previousValue: "Ship",
    changes: [],
  };

  it("lets the host override the policy", () => {
    expect(resolveConflictChoice(() => "take", conflict, "ask")).toBe("take");
    expect(resolveConflictChoice(() => undefined, conflict, "keep")).toBe(
      "keep"
    );
  });

  it("falls through to policy when the host throws", () => {
    expect(
      resolveConflictChoice(
        () => {
          throw new Error("analytics down");
        },
        conflict,
        "keep"
      )
    ).toBe("keep");
  });
});

describe("useEditConflict", () => {
  const column = TITLE;
  const base = {
    active: { rowId: "1", columnKey: "title" },
    openedRow: OPENED,
    draft: "typed",
    rows: [LIVE] as Task[],
    columns: [column],
    rowKey: (row: Task) => row.id,
    keep: vi.fn(),
    take: vi.fn(),
  };

  it("asks by default, then keep and take each run once", () => {
    const keep = vi.fn();
    const take = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcile({ ...base, keep, take, policy: "ask" });
    });
    expect(result.current.current?.incomingValue).toBe("Arrived");
    expect(result.current.isConflict("1", "title")).toBe(true);
    expect(keep).not.toHaveBeenCalled();
    act(() => {
      result.current.keep();
    });
    expect(keep).toHaveBeenCalledExactlyOnceWith(LIVE);
    expect(result.current.current).toBeNull();

    act(() => {
      result.current.reconcile({ ...base, keep, take, policy: "ask" });
    });
    act(() => {
      result.current.take();
    });
    expect(take).toHaveBeenCalledExactlyOnceWith(LIVE, "Arrived");
  });

  it("applies the keep policy without asking", () => {
    const keep = vi.fn();
    const take = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcile({ ...base, keep, take, policy: "keep" });
    });
    expect(keep).toHaveBeenCalledExactlyOnceWith(LIVE);
    expect(result.current.current).toBeNull();
  });

  it("applies the take policy without asking", () => {
    const keep = vi.fn();
    const take = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcile({ ...base, keep, take, policy: "take" });
    });
    expect(take).toHaveBeenCalledExactlyOnceWith(LIVE, "Arrived");
    expect(result.current.current).toBeNull();
  });

  it("does not re-ask the same incoming value", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcile({ ...base, policy: "ask" });
    });
    act(() => {
      result.current.reconcile({ ...base, policy: "ask" });
    });
    expect(result.current.current).not.toBeNull();
    // Same token — keep was not called a second time as a side effect.
    expect(base.keep).not.toHaveBeenCalled();
  });

  it("clears when the editor closes", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcile({ ...base, policy: "ask" });
    });
    act(() => {
      result.current.reconcile({
        ...base,
        active: null,
        openedRow: undefined,
        policy: "ask",
      });
    });
    expect(result.current.current).toBeNull();
  });

  it("does nothing when the live row or column is gone", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcile({ ...base, rows: [], policy: "ask" });
    });
    expect(result.current.current).toBeNull();
    act(() => {
      result.current.reconcile({ ...base, columns: [], policy: "ask" });
    });
    expect(result.current.current).toBeNull();
  });

  it("clears when the live row matches the opened snapshot again", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcile({ ...base, policy: "ask" });
    });
    expect(result.current.current).not.toBeNull();
    act(() => {
      result.current.reconcile({
        ...base,
        rows: [OPENED],
        policy: "ask",
      });
    });
    expect(result.current.current).toBeNull();
  });

  it("keep and take are no-ops while idle", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.keep();
      result.current.take();
    });
    expect(base.keep).not.toHaveBeenCalled();
    expect(base.take).not.toHaveBeenCalled();
  });
});

describe("a row edited as one unit", () => {
  const SEEDS = { title: "Ship" };

  /** Reconcile an open row form against a live row set. */
  function reconcile(
    state: ReturnType<typeof useEditConflict<Task>>,
    rows: readonly Task[],
    handlers: {
      accept: (row: Task, keys: readonly string[]) => void;
      take: (row: Task, keys: readonly string[]) => void;
    },
    over: {
      drafts?: Record<string, string>;
      activeRowId?: string | null;
      seeds?: Record<string, string>;
      openedRow?: Task;
      onEditConflict?: (conflict: {
        row: Task;
        previous: Task;
      }) => "keep" | "take" | void;
    } = {}
  ) {
    act(() => {
      state.reconcileRow({
        activeRowId: over.activeRowId === undefined ? "1" : over.activeRowId,
        openedRow: over.openedRow,
        onEditConflict: over.onEditConflict,
        seeds: over.seeds ?? SEEDS,
        drafts: over.drafts ?? { title: "mine" },
        rows,
        columns: [TITLE],
        rowKey: (row) => row.id,
        policy: "ask",
        ...handlers,
      });
    });
  }

  it("a second update replaces what the question shows and what Take writes", () => {
    // The keys do not change when a field that is already asking moves again.
    // A set compared by keys alone would go on showing — and taking — the
    // value that arrived first.
    const { result } = renderHook(() => useEditConflict<Task>());
    const take = vi.fn();
    reconcile(result.current, [LIVE], { accept: vi.fn(), take });
    expect(result.current.contestedCell("1", "title")?.incomingValue).toBe(
      "Arrived"
    );

    const AGAIN: Task = { id: "1", title: "Arrived again", rev: 3 };
    reconcile(result.current, [AGAIN], { accept: vi.fn(), take });
    expect(result.current.contestedCell("1", "title")?.incomingValue).toBe(
      "Arrived again"
    );

    act(() => {
      result.current.takeCell("1", "title");
    });
    expect(take).toHaveBeenCalledWith(AGAIN, ["title"]);
  });

  it("tells a host what the row read before the change", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    const seen: { row: Task; previous: Task }[] = [];
    reconcile(
      result.current,
      [LIVE],
      { accept: vi.fn(), take: vi.fn() },
      {
        openedRow: OPENED,
        onEditConflict: (conflict) => {
          seen.push({ row: conflict.row, previous: conflict.previous });
        },
      }
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]?.row).toBe(LIVE);
    expect(seen[0]?.previous).toBe(OPENED);
  });

  it("names every field of the row that is waiting on an answer", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    expect(result.current.isRowContested("1")).toBe(false);
    reconcile(result.current, [LIVE], { accept: vi.fn(), take: vi.fn() });
    expect(result.current.isRowContested("1")).toBe(true);
    expect(result.current.isRowContested("2")).toBe(false);
  });

  it("asks about a field the reader was working in", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcile(result.current, [LIVE], { accept: vi.fn(), take: vi.fn() });

    expect(result.current.isRowConflict("1")).toBe(true);
    expect(result.current.isRowConflict("2")).toBe(false);
    expect(result.current.contestedCell("1", "title")).toEqual({
      incomingValue: "Arrived",
    });
    // Only the field that moved, and only for the row it belongs to.
    expect(result.current.contestedCell("1", "other")).toBeUndefined();
    expect(result.current.contestedCell("2", "title")).toBeUndefined();
    // A cell-scoped reader must not mistake this for one of its own.
    expect(result.current.isConflict("1", "title")).toBe(false);
  });

  it("takes a field the reader never typed in, without asking", () => {
    const take = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    // The draft still reads what the seed does: nothing of theirs is at stake.
    reconcile(
      result.current,
      [LIVE],
      { accept: vi.fn(), take },
      { drafts: { title: "Ship" } }
    );

    expect(take).toHaveBeenCalledWith(LIVE, ["title"]);
    expect(result.current.isRowConflict("1")).toBe(false);
  });

  it("answers one field at a time", () => {
    const accept = vi.fn();
    const take = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcile(result.current, [LIVE], { accept, take });
    act(() => {
      result.current.keepCell("1", "title");
    });
    expect(accept).toHaveBeenCalledWith(LIVE, ["title"]);
    expect(result.current.isRowConflict("1")).toBe(false);

    const second = renderHook(() => useEditConflict<Task>());
    reconcile(second.result.current, [LIVE], { accept: vi.fn(), take });
    act(() => {
      second.result.current.takeCell("1", "title");
    });
    expect(take).toHaveBeenCalledWith(LIVE, ["title"]);
  });

  it("says nothing when no field moved, or no form is open", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcile(result.current, [OPENED], { accept: vi.fn(), take: vi.fn() });
    expect(result.current.isRowConflict("1")).toBe(false);

    reconcile(
      result.current,
      [LIVE],
      { accept: vi.fn(), take: vi.fn() },
      { activeRowId: null }
    );
    expect(result.current.isRowConflict("1")).toBe(false);
  });

  it("answers a whole form at once when a policy says how", () => {
    const accept = vi.fn();
    const take = vi.fn();
    const kept = renderHook(() => useEditConflict<Task>());
    act(() => {
      kept.result.current.reconcileRow({
        activeRowId: "1",
        seeds: SEEDS,
        drafts: { title: "mine" },
        rows: [LIVE],
        columns: [TITLE],
        rowKey: (row) => row.id,
        policy: "keep",
        accept,
        take: vi.fn(),
      });
    });
    expect(accept).toHaveBeenCalledWith(LIVE, ["title"]);
    expect(kept.result.current.isRowConflict("1")).toBe(false);

    const taken = renderHook(() => useEditConflict<Task>());
    act(() => {
      taken.result.current.reconcileRow({
        activeRowId: "1",
        seeds: SEEDS,
        drafts: { title: "mine" },
        rows: [LIVE],
        columns: [TITLE],
        rowKey: (row) => row.id,
        policy: "take",
        accept: vi.fn(),
        take,
      });
    });
    expect(take).toHaveBeenCalledWith(LIVE, ["title"]);
    expect(taken.result.current.isRowConflict("1")).toBe(false);
  });

  it("says nothing about a row that is not on screen", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcile(result.current, [], { accept: vi.fn(), take: vi.fn() });
    expect(result.current.isRowConflict("1")).toBe(false);
  });

  it("ignores an answer for a form nobody is asking about", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.keepCell("1", "title");
      result.current.takeCell("1", "title");
    });
    expect(result.current.current).toBeNull();
  });

  it("holds one question per cell, however often it is asked", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    const handlers = { accept: vi.fn(), take: vi.fn() };
    reconcile(result.current, [LIVE], handlers);
    const first = result.current.contestedCell("1", "title");
    reconcile(result.current, [LIVE], handlers);

    // The same cell, still asking the same thing.
    expect(result.current.contestedCell("1", "title")).toEqual(first);
    expect(result.current.anyContested).toBe(true);
  });
});

describe("a batch of open rows", () => {
  const OTHER: Task = { id: "2", title: "Test", rev: 1 };
  const OTHER_LIVE: Task = { id: "2", title: "Moved", rev: 2 };

  /** Reconcile a batch against a live row set. */
  function reconcileBatch(
    state: ReturnType<typeof useEditConflict<Task>>,
    rows: readonly Task[],
    entries: readonly {
      rowId: string;
      seeds: Record<string, string>;
      drafts: Record<string, string>;
    }[],
    handlers: {
      accept: (row: Task, rowId: string, keys: readonly string[]) => void;
      take: (row: Task, rowId: string, keys: readonly string[]) => void;
    }
  ) {
    act(() => {
      state.reconcileBatch({
        entries,
        rows,
        columns: [TITLE],
        rowKey: (row) => row.id,
        policy: "ask",
        ...handlers,
      });
    });
  }

  const changed = [
    { rowId: "1", seeds: { title: "Ship" }, drafts: { title: "mine" } },
    { rowId: "2", seeds: { title: "Test" }, drafts: { title: "myOther" } },
  ];

  it("asks per cell, naming each by its row", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcileBatch(result.current, [LIVE, OTHER_LIVE], changed, {
      accept: vi.fn(),
      take: vi.fn(),
    });

    expect(result.current.contestedCell("1", "title")).toEqual({
      incomingValue: "Arrived",
    });
    expect(result.current.contestedCell("2", "title")).toEqual({
      incomingValue: "Moved",
    });
    expect(result.current.anyContested).toBe(true);
  });

  it("answers one row without disturbing the other", () => {
    const accept = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcileBatch(result.current, [LIVE, OTHER_LIVE], changed, {
      accept,
      take: vi.fn(),
    });
    act(() => {
      result.current.keepCell("1", "title");
    });

    expect(accept).toHaveBeenCalledWith(LIVE, "1", ["title"]);
    expect(result.current.contestedCell("1", "title")).toBeUndefined();
    expect(result.current.contestedCell("2", "title")).toBeDefined();
  });

  it("takes a cell the reader never changed, without asking", () => {
    const take = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcileBatch(
      result.current,
      [LIVE],
      [{ rowId: "1", seeds: { title: "Ship" }, drafts: { title: "Ship" } }],
      { accept: vi.fn(), take }
    );

    expect(take).toHaveBeenCalledWith(LIVE, "1", ["title"]);
    expect(result.current.anyContested).toBe(false);
  });

  it("forgets a row that left the batch, or the row set", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcileBatch(result.current, [LIVE, OTHER_LIVE], changed, {
      accept: vi.fn(),
      take: vi.fn(),
    });
    // Row 2 saved or cancelled: its question goes with it.
    reconcileBatch(result.current, [LIVE, OTHER_LIVE], [changed[0]!], {
      accept: vi.fn(),
      take: vi.fn(),
    });
    expect(result.current.contestedCell("2", "title")).toBeUndefined();
    expect(result.current.contestedCell("1", "title")).toBeDefined();

    // Row 1 fell out of the rendered set entirely.
    reconcileBatch(result.current, [OTHER], [changed[0]!], {
      accept: vi.fn(),
      take: vi.fn(),
    });
    expect(result.current.anyContested).toBe(false);
  });

  it("digests one row's questions for a row memo", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    expect(result.current.rowSignature("1")).toBe("");
    reconcileBatch(result.current, [LIVE, OTHER_LIVE], changed, {
      accept: vi.fn(),
      take: vi.fn(),
    });

    expect(result.current.rowSignature("1")).toBe("|title=Arrived");
    expect(result.current.rowSignature("2")).toBe("|title=Moved");
  });
});
