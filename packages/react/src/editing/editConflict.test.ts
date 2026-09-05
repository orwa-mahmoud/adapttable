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
