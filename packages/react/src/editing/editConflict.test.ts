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
  /** Reconcile an open row form against a live row set. */
  function reconcile(
    state: ReturnType<typeof useEditConflict<Task>>,
    rows: readonly Task[],
    handlers: { keep: (row: Task) => void; take: (row: Task) => void },
    activeRowId: string | null = "1"
  ) {
    act(() => {
      state.reconcileRow({
        activeRowId,
        openedRow: OPENED,
        rows,
        columns: [TITLE],
        rowKey: (row) => row.id,
        policy: "ask",
        ...handlers,
      });
    });
  }

  it("asks about the whole form, naming no column", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcile(result.current, [LIVE], { keep: vi.fn(), take: vi.fn() });

    expect(result.current.isRowConflict("1")).toBe(true);
    expect(result.current.isRowConflict("2")).toBe(false);
    // The form holds every field, so no single cell owns the clash — and a
    // cell-scoped reader must not mistake this for one of its own.
    expect(result.current.current?.unit).toBe("row");
    expect(result.current.isConflict("1", "title")).toBe(false);
  });

  it("reseeds the drafts on take, and keeps them on keep", () => {
    const take = vi.fn();
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcile(result.current, [LIVE], { keep: vi.fn(), take });
    act(() => {
      result.current.take();
    });
    expect(take).toHaveBeenCalledWith(LIVE);
    expect(result.current.isRowConflict("1")).toBe(false);

    const keep = vi.fn();
    const second = renderHook(() => useEditConflict<Task>());
    reconcile(second.result.current, [LIVE], { keep, take: vi.fn() });
    act(() => {
      second.result.current.keep();
    });
    expect(keep).toHaveBeenCalledWith(LIVE);
  });

  it("says nothing when the row did not move, or no form is open", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    reconcile(result.current, [OPENED], { keep: vi.fn(), take: vi.fn() });
    expect(result.current.isRowConflict("1")).toBe(false);

    reconcile(result.current, [LIVE], { keep: vi.fn(), take: vi.fn() }, null);
    expect(result.current.isRowConflict("1")).toBe(false);
  });

  it("asks once for one incoming change", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    const handlers = { keep: vi.fn(), take: vi.fn() };
    reconcile(result.current, [LIVE], handlers);
    const first = result.current.current;
    reconcile(result.current, [LIVE], handlers);

    expect(result.current.current).toBe(first);
  });

  it("takes the host's version as the whole answer", () => {
    const { result } = renderHook(() => useEditConflict<Task>());
    act(() => {
      result.current.reconcileRow({
        activeRowId: "1",
        openedRow: OPENED,
        // Same title, new revision: the host said the row moved.
        rows: [{ ...OPENED, rev: 7 }],
        columns: [TITLE],
        rowKey: (row) => row.id,
        rowVersion: (row) => row.rev,
        policy: "ask",
        keep: vi.fn(),
        take: vi.fn(),
      });
    });
    expect(result.current.isRowConflict("1")).toBe(true);
  });
});
