/**
 * Editing a row as one unit.
 *
 * The point of the mode is the commit: every field's draft is held until the
 * reader saves, and what the host receives is one patch of what actually
 * changed. So the rules that matter are about the patch — never a partial write,
 * never an untouched field, never a write at all when nothing was edited.
 */
import type { EditableColumnLike } from "@adapttable/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRowEditing } from "./rowEditing";

interface Task {
  id: string;
  title: string;
  points: number;
  done: boolean;
  owner: string;
}

const TASK: Task = {
  id: "1",
  title: "Ship",
  points: 3,
  done: false,
  owner: "ada",
};

const COLUMNS: EditableColumnLike<Task>[] = [
  { key: "title", editable: true },
  { key: "points", editable: true, editor: "number" },
  { key: "done", editable: true, editor: "boolean" },
  // Not editable: it seeds nothing and can never appear in a patch.
  { key: "owner" },
];

const setup = (over?: {
  enabled?: boolean;
  onRowEdit?: (row: Task, patch: Readonly<Record<string, unknown>>) => unknown;
  columns?: EditableColumnLike<Task>[];
}) =>
  renderHook(() =>
    useRowEditing<Task>({
      enabled: over?.enabled ?? true,
      columns: over?.columns ?? COLUMNS,
      onRowEdit: over?.onRowEdit,
    })
  );

describe("useRowEditing", () => {
  it("does nothing until the host arms it", () => {
    const { result } = setup({ enabled: false });
    act(() => {
      result.current.begin(TASK, "1");
    });
    expect(result.current.activeRowId).toBeNull();
    expect(result.current.isEditing("1")).toBe(false);
  });

  it("opens a row with every editable field seeded", () => {
    const { result } = setup();
    act(() => {
      result.current.begin(TASK, "1");
    });
    expect(result.current.isEditing("1")).toBe(true);
    expect(result.current.isEditing("2")).toBe(false);
    expect(result.current.drafts).toEqual({
      title: "Ship",
      points: "3",
      done: "false",
    });
    // A column nobody may edit has no draft to hold.
    expect(result.current.draftFor("owner")).toBe("");
  });

  it("holds a draft without telling the host", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.setDraft("title", "Ship it");
    });
    expect(result.current.draftFor("title")).toBe("Ship it");
    expect(result.current.isDirty).toBe(true);
    // Nothing reaches the host until the reader saves: a row whose fields
    // constrain each other must not pass through a half-applied state.
    expect(onRowEdit).not.toHaveBeenCalled();
  });

  it("hands the host one patch of only what changed", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.setDraft("title", "Ship it");
      result.current.setDraft("points", "8");
    });
    act(() => {
      result.current.save();
    });
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, {
      title: "Ship it",
      points: 8,
    });
    // Parsed by each column's editor: a number editor commits a number.
    expect(result.current.activeRowId).toBeNull();
  });

  it("says nothing when the reader changed nothing", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.save();
    });
    // Saving an untouched row is a write the host never asked for.
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(result.current.activeRowId).toBeNull();
  });

  it("says nothing when a draft is typed back to what it was", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.setDraft("title", "Shipped");
    });
    act(() => {
      result.current.setDraft("title", "Ship");
    });
    expect(result.current.isDirty).toBe(false);
    act(() => {
      result.current.save();
    });
    expect(onRowEdit).not.toHaveBeenCalled();
  });

  it("throws every draft away on cancel", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.setDraft("title", "Ship it");
      result.current.setDraft("points", "8");
    });
    act(() => {
      result.current.cancel();
    });
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(result.current.activeRowId).toBeNull();
    expect(result.current.drafts).toEqual({});
    expect(result.current.isDirty).toBe(false);
  });

  it("commits a checkbox as a boolean and a select as its value", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.setDraft("done", "true");
    });
    act(() => {
      result.current.save();
    });
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, { done: true });
  });

  it("runs a column's own parseValue", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({
      onRowEdit,
      columns: [
        {
          key: "title",
          editable: true,
          parseValue: (draft) => draft.trim().toUpperCase(),
        },
      ],
    });
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.setDraft("title", "  ship it  ");
    });
    act(() => {
      result.current.save();
    });
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(TASK, {
      title: "SHIP IT",
    });
  });

  it("honours a per-row editable predicate", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({
      onRowEdit,
      columns: [
        { key: "title", editable: true },
        // Locked on this row: it seeds nothing and cannot be patched.
        { key: "points", editable: (row) => row.id !== "1", editor: "number" },
      ],
    });
    act(() => {
      result.current.begin(TASK, "1");
    });
    expect(result.current.drafts).toEqual({ title: "Ship" });
    act(() => {
      result.current.setDraft("points", "99");
    });
    act(() => {
      result.current.save();
    });
    expect(onRowEdit).not.toHaveBeenCalled();
  });

  it("moves the open row when another is opened", () => {
    const { result } = setup();
    act(() => {
      result.current.begin(TASK, "1");
    });
    act(() => {
      result.current.setDraft("title", "Ship it");
    });
    act(() => {
      result.current.begin({ ...TASK, id: "2", title: "Other" }, "2");
    });
    // The first row's drafts are gone with it — one row is open at a time.
    expect(result.current.activeRowId).toBe("2");
    expect(result.current.draftFor("title")).toBe("Other");
  });

  it("changes its signature so the open row repaints", () => {
    const { result } = setup();
    expect(result.current.signature).toBe("");
    act(() => {
      result.current.begin(TASK, "1");
    });
    const opened = result.current.signature;
    act(() => {
      result.current.setDraft("title", "Ship it");
    });
    expect(result.current.signature).not.toBe(opened);
  });

  it("is inert with no row open", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.setDraft("title", "x");
      result.current.save();
      result.current.cancel();
    });
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(result.current.activeRowId).toBeNull();
  });

  it("observes start, commit and cancel without letting a throw rewind them", () => {
    const onEditStart = vi.fn();
    const onEditCommit = vi.fn(() => {
      throw new Error("analytics down");
    });
    const onEditCancel = vi.fn();
    const onRowEdit = vi.fn();
    const { result } = renderHook(() =>
      useRowEditing<Task>({
        enabled: true,
        columns: COLUMNS,
        onRowEdit,
        onEditStart,
        onEditCommit,
        onEditCancel,
      })
    );
    act(() => {
      result.current.begin(TASK, "1");
    });
    expect(onEditStart).toHaveBeenCalledOnce();
    act(() => {
      result.current.setDraft("title", "Ship it");
      result.current.save();
    });
    expect(onRowEdit).toHaveBeenCalledOnce();
    expect(onEditCommit).toHaveBeenCalledOnce();
    expect(result.current.activeRowId).toBeNull();

    act(() => {
      result.current.begin(TASK, "1");
      result.current.cancel();
    });
    expect(onEditCancel).toHaveBeenCalledOnce();
  });
});

describe("an incoming row under an open form", () => {
  const ARRIVED: Task = { ...TASK, title: "Arrived", points: 9 };

  it("hands back what each field was measured against", () => {
    const { result } = setup();
    expect(result.current.seeds()).toBeUndefined();
    act(() => {
      result.current.begin(TASK, "1");
    });
    expect(result.current.seeds()).toEqual({
      title: "Ship",
      points: "3",
      done: "false",
    });
    expect(result.current.openedRow()).toBe(TASK);
  });

  it("keeps the draft and measures that field against the incoming value", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
      result.current.setDraft("title", "Mine");
    });
    act(() => {
      result.current.acceptSeeds(ARRIVED, ["title"]);
    });

    expect(result.current.draftFor("title")).toBe("Mine");
    expect(result.current.seeds()?.title).toBe("Arrived");
    // Only the field the reader typed in moved, so only it is asked about
    // again — and Points, which they never touched, stays as it was.
    expect(result.current.seeds()?.points).toBe("3");
    act(() => {
      result.current.save();
    });
    expect(onRowEdit).toHaveBeenCalledWith(ARRIVED, { title: "Mine" });
  });

  it("takes the incoming value into the field and its measure", () => {
    const onRowEdit = vi.fn();
    const { result } = setup({ onRowEdit });
    act(() => {
      result.current.begin(TASK, "1");
      result.current.setDraft("title", "Mine");
    });
    act(() => {
      result.current.takeSeeds(ARRIVED, ["title", "points"]);
    });

    expect(result.current.draftFor("title")).toBe("Arrived");
    expect(result.current.draftFor("points")).toBe("9");
    expect(result.current.isDirty).toBe(false);
    act(() => {
      result.current.save();
    });
    // Nothing differs from what those fields now read, so nothing is sent.
    expect(onRowEdit).not.toHaveBeenCalled();
  });

  it("leaves the fields it was not asked about alone", () => {
    const { result } = setup();
    act(() => {
      result.current.begin(TASK, "1");
      result.current.setDraft("points", "7");
    });
    act(() => {
      result.current.takeSeeds(ARRIVED, ["title"]);
    });

    expect(result.current.draftFor("title")).toBe("Arrived");
    expect(result.current.draftFor("points")).toBe("7");
  });

  it("does nothing when no form is open", () => {
    const { result } = setup();
    act(() => {
      result.current.acceptSeeds(ARRIVED, ["title"]);
      result.current.takeSeeds(ARRIVED, ["title"]);
    });
    expect(result.current.activeRowId).toBeNull();
    expect(result.current.seeds()).toBeUndefined();
  });
});
