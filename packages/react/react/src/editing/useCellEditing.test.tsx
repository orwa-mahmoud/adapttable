import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  beginCellEdit,
  type CellEditKeyOutcome,
  useCellEditing,
} from "./useCellEditing";

interface Person {
  id: string;
  name: string;
  age: number;
}

const ROWS: Person[] = [
  { id: "1", name: "Ada", age: 36 },
  { id: "2", name: "Grace", age: 85 },
];

const COLS: ColumnDef<Person>[] = [
  { key: "name", editable: true },
  { key: "age", editable: true, editor: "number", sortValue: (r) => r.age },
  { key: "id" },
];

function keyEvent(key: string, shiftKey = false) {
  return {
    key,
    shiftKey,
    preventDefault: () => undefined,
  };
}

describe("useCellEditing", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useCellEditing());
    expect(result.current.active).toBeNull();
    expect(result.current.draft).toBe("");
    expect(result.current.isActive("1", "name")).toBe(false);
    expect(result.current.commit()).toBeNull();
  });

  it("begin → setDraft → commit clears and returns the draft", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    expect(result.current.isActive("1", "name")).toBe(true);
    expect(result.current.draft).toBe("Ada");
    act(() => result.current.setDraft("Augusta"));
    let commit: ReturnType<typeof result.current.commit> = null;
    act(() => {
      commit = result.current.commit();
    });
    expect(commit).toEqual({
      rowId: "1",
      columnKey: "name",
      draft: "Augusta",
    });
    expect(result.current.active).toBeNull();
    expect(result.current.draft).toBe("");
  });

  it("re-beginning the same cell keeps the draft", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    act(() => result.current.setDraft("typed"));
    act(() => result.current.begin("1", "name", "Ada"));
    expect(result.current.draft).toBe("typed");
  });

  it("switching cells abandons the previous draft without committing", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    act(() => result.current.setDraft("lost"));
    act(() => result.current.begin("1", "age", "36"));
    expect(result.current.active).toEqual({ rowId: "1", columnKey: "age" });
    expect(result.current.draft).toBe("36");
  });

  it("Escape cancels without a commit payload", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    let outcome: CellEditKeyOutcome | undefined;
    act(() => {
      outcome = result.current.handleKeyDown(keyEvent("Escape")) ?? undefined;
    });
    expect(outcome).toEqual({
      action: "cancel",
      commit: null,
      advanceTarget: null,
    });
    expect(result.current.active).toBeNull();
  });

  it("Enter commits", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    act(() => result.current.setDraft("Augusta"));
    let outcome: CellEditKeyOutcome | undefined;
    act(() => {
      outcome = result.current.handleKeyDown(keyEvent("Enter")) ?? undefined;
    });
    expect(outcome?.action).toBe("commit");
    expect(outcome?.commit).toEqual({
      rowId: "1",
      columnKey: "name",
      draft: "Augusta",
    });
  });

  it("Tab commits and advances; Shift+Tab goes previous", () => {
    const navigation = {
      rows: ROWS,
      columns: COLS,
      rowKey: (r: unknown) => (r as Person).id,
    };
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    let outcome: CellEditKeyOutcome | undefined;
    act(() => {
      outcome =
        result.current.handleKeyDown(keyEvent("Tab"), navigation) ?? undefined;
    });
    expect(outcome?.action).toBe("commit-advance");
    expect(outcome?.advanceTarget).toEqual({
      rowId: "1",
      columnKey: "age",
    });

    act(() => result.current.begin("1", "age", "36"));
    act(() => {
      outcome =
        result.current.handleKeyDown(keyEvent("Tab", true), navigation) ??
        undefined;
    });
    expect(outcome?.advanceTarget).toEqual({
      rowId: "1",
      columnKey: "name",
    });
  });

  it("ignores unrelated keys and stays idle without an active cell", () => {
    const { result } = renderHook(() => useCellEditing());
    expect(result.current.handleKeyDown(keyEvent("a"))).toBeNull();
    act(() => result.current.begin("1", "name", "Ada"));
    expect(result.current.handleKeyDown(keyEvent("a"))).toBeNull();
    expect(result.current.active).not.toBeNull();
  });

  it("discardIfRowMissing drops a stale active edit", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    act(() =>
      result.current.discardIfRowMissing(ROWS, (r) => (r as Person).id)
    );
    expect(result.current.active).not.toBeNull();
    act(() =>
      result.current.discardIfRowMissing([ROWS[1]!], (r) => (r as Person).id)
    );
    expect(result.current.active).toBeNull();
  });

  it("keeps a stable identity between unrelated renders", () => {
    const { result, rerender } = renderHook(() => useCellEditing());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("setDraft updates the ref so commit sees the latest keystroke", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada"));
    act(() => result.current.setDraft("Augusta"));
    let commit: ReturnType<typeof result.current.commit> | undefined;
    act(() => {
      commit = result.current.commit();
    });
    expect(commit).toEqual({
      rowId: "1",
      columnKey: "name",
      draft: "Augusta",
    });
  });

  it("keepLive accepts the incoming row and leaves the draft", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada", ROWS[0]));
    act(() => result.current.setDraft("typed"));
    const live = { ...ROWS[0]!, name: "Arrived" };
    act(() => result.current.keepLive(live));
    expect(result.current.draft).toBe("typed");
    expect(result.current.openedRow()).toBe(live);
    expect(result.current.active).not.toBeNull();
  });

  it("keepLive and takeLive do nothing while idle", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.keepLive(ROWS[0]!));
    act(() => result.current.takeLive(ROWS[0]!, "x"));
    expect(result.current.openedRow()).toBeUndefined();
    expect(result.current.draft).toBe("");
  });

  it("takeLive replaces the draft with the incoming value", () => {
    const { result } = renderHook(() => useCellEditing());
    act(() => result.current.begin("1", "name", "Ada", ROWS[0]));
    act(() => result.current.setDraft("typed"));
    const live = { ...ROWS[0]!, name: "Arrived" };
    act(() => result.current.takeLive(live, "Arrived"));
    expect(result.current.draft).toBe("Arrived");
    expect(result.current.openedRow()).toBe(live);
    act(() => result.current.cancel());
    act(() => result.current.takeLive(live, "gone"));
    expect(result.current.draft).toBe("");
    expect(result.current.openedRow()).toBeUndefined();
  });
});

describe("beginCellEdit", () => {
  it("opens when editable and refuses when not", () => {
    const { result } = renderHook(() => useCellEditing());
    let opened = false;
    act(() => {
      opened = beginCellEdit(result.current, ROWS[0]!, COLS[0]!, (r) => r.id);
    });
    expect(opened).toBe(true);
    expect(result.current.draft).toBe("Ada");

    act(() => result.current.cancel());
    act(() => {
      opened = beginCellEdit(result.current, ROWS[0]!, COLS[2]!, (r) => r.id);
    });
    expect(opened).toBe(false);
    expect(result.current.active).toBeNull();
  });
});
