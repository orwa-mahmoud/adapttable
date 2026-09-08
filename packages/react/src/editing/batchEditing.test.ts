/**
 * Many rows changed, saved in one go.
 *
 * The promise is the single write: nothing reaches the host until the reader
 * saves, and what arrives then is every pending row at once. So the rules that
 * matter are about what counts as pending, and what the one call contains.
 */
import type { EditableColumnLike } from "@adapttable/core";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBatchEditing } from "./batchEditing";

interface Task {
  id: string;
  title: string;
  points: number;
}
const ROWS: Task[] = [
  { id: "1", title: "Ship", points: 3 },
  { id: "2", title: "Test", points: 5 },
];
const COLUMNS: EditableColumnLike<Task>[] = [
  { key: "title", editable: true },
  { key: "points", editable: true, editor: "number" },
  { key: "id" },
];

const setup = (over?: {
  enabled?: boolean;
  onBatchEdit?: (edits: readonly unknown[]) => unknown;
  columns?: EditableColumnLike<Task>[];
}) =>
  renderHook(() =>
    useBatchEditing<Task>({
      enabled: over?.enabled ?? true,
      columns: over?.columns ?? COLUMNS,
      onBatchEdit: over?.onBatchEdit,
    })
  );

describe("useBatchEditing", () => {
  it("does nothing until the host arms it", () => {
    const { result } = setup({ enabled: false });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
    });
    expect(result.current.count).toBe(0);
    expect(result.current.pending).toBe(false);
  });

  it("shows a row's stored value until someone changes it", () => {
    const { result } = setup();
    expect(result.current.draftFor(ROWS[0]!, "1", "title")).toBe("Ship");
    expect(result.current.isChanged("1", "title")).toBe(false);
  });

  it("holds a change without telling the host", () => {
    const onBatchEdit = vi.fn();
    const { result } = setup({ onBatchEdit });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
    });
    expect(result.current.draftFor(ROWS[0]!, "1", "title")).toBe("Ship it");
    expect(result.current.isChanged("1", "title")).toBe(true);
    expect(result.current.isPending("1")).toBe(true);
    expect(result.current.count).toBe(1);
    expect(onBatchEdit).not.toHaveBeenCalled();
  });

  it("counts rows, not cells", () => {
    const { result } = setup();
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
      result.current.setDraft(ROWS[0]!, "1", "points", "8");
      result.current.setDraft(ROWS[1]!, "2", "title", "Tested");
    });
    // "3 unsaved rows" would be a lie: two rows hold three changes.
    expect(result.current.count).toBe(2);
  });

  it("stops counting a row typed back to what it was", () => {
    const { result } = setup();
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
    });
    expect(result.current.count).toBe(1);
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship");
    });
    expect(result.current.count).toBe(0);
    expect(result.current.isChanged("1", "title")).toBe(false);
  });

  it("hands the host every pending row in one call", () => {
    const onBatchEdit = vi.fn();
    const { result } = setup({ onBatchEdit });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
      result.current.setDraft(ROWS[0]!, "1", "points", "8");
      result.current.setDraft(ROWS[1]!, "2", "title", "Tested");
    });
    act(() => {
      result.current.saveAll();
    });
    // One call, so a host can make the whole batch one request.
    expect(onBatchEdit).toHaveBeenCalledOnce();
    expect(onBatchEdit.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[0], rowId: "1", patch: { title: "Ship it", points: 8 } },
      { row: ROWS[1], rowId: "2", patch: { title: "Tested" } },
    ]);
    expect(result.current.count).toBe(0);
  });

  it("says nothing when nothing is pending", () => {
    const onBatchEdit = vi.fn();
    const { result } = setup({ onBatchEdit });
    act(() => {
      result.current.saveAll();
    });
    expect(onBatchEdit).not.toHaveBeenCalled();
  });

  it("saves what was typed in the same gesture", () => {
    // A control that edits and saves together — the draft must not be a render
    // behind the click.
    const onBatchEdit = vi.fn();
    const { result } = setup({ onBatchEdit });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
      result.current.saveAll();
    });
    expect(onBatchEdit.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[0], rowId: "1", patch: { title: "Ship it" } },
    ]);
  });

  it("throws everything away on cancel, telling the host nothing", () => {
    const onBatchEdit = vi.fn();
    const { result } = setup({ onBatchEdit });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
      result.current.setDraft(ROWS[1]!, "2", "title", "Tested");
    });
    act(() => {
      result.current.cancelAll();
    });
    expect(onBatchEdit).not.toHaveBeenCalled();
    expect(result.current.count).toBe(0);
    expect(result.current.draftFor(ROWS[0]!, "1", "title")).toBe("Ship");
  });

  it("throws away one row without touching the others", () => {
    const { result } = setup();
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
      result.current.setDraft(ROWS[1]!, "2", "title", "Tested");
    });
    act(() => {
      result.current.cancelRow("1");
    });
    expect(result.current.isPending("1")).toBe(false);
    expect(result.current.isPending("2")).toBe(true);

    // Cancelling a row that holds nothing does no work.
    const before = result.current.signature;
    act(() => {
      result.current.cancelRow("9");
    });
    expect(result.current.signature).toBe(before);
  });

  it("runs a column's own parseValue", () => {
    const onBatchEdit = vi.fn();
    const { result } = setup({
      onBatchEdit,
      columns: [
        {
          key: "title",
          editable: true,
          parseValue: (draft) => draft.trim().toUpperCase(),
        },
      ],
    });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "  ship it  ");
      result.current.saveAll();
    });
    expect(onBatchEdit.mock.calls[0]?.[0]).toEqual([
      { row: ROWS[0], rowId: "1", patch: { title: "SHIP IT" } },
    ]);
  });

  it("ignores a column nobody declared", () => {
    const { result } = setup();
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "nope", "x");
    });
    expect(result.current.count).toBe(0);
    expect(result.current.draftFor(ROWS[0]!, "1", "nope")).toBe("");
  });

  it("changes its signature so pending rows repaint", () => {
    const { result } = setup();
    const before = result.current.signature;
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
    });
    expect(result.current.signature).not.toBe(before);
  });

  it("observes a row becoming pending, a save, and a cancel", () => {
    const onEditStart = vi.fn();
    const onEditCommit = vi.fn();
    const onEditCancel = vi.fn();
    const onBatchEdit = vi.fn();
    const { result } = renderHook(() =>
      useBatchEditing<Task>({
        enabled: true,
        columns: COLUMNS,
        onBatchEdit,
        onEditStart,
        onEditCommit,
        onEditCancel,
      })
    );
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "Ship it");
    });
    expect(onEditStart).toHaveBeenCalledOnce();
    act(() => {
      result.current.saveAll();
    });
    expect(onBatchEdit).toHaveBeenCalledOnce();
    expect(onEditCommit).toHaveBeenCalledOnce();

    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "again");
      result.current.cancelAll();
    });
    expect(onEditCancel).toHaveBeenCalledOnce();
  });
});

describe("an incoming row under a pending batch", () => {
  const ARRIVED: Task = { id: "1", title: "Arrived", points: 9 };

  it("reports what each changed field was measured against", () => {
    const { result } = setup();
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "mine");
    });

    expect(result.current.entries).toEqual([
      { rowId: "1", seeds: { title: "Ship" }, drafts: { title: "mine" } },
    ]);
  });

  it("keeps the draft and measures that field against the incoming value", () => {
    const onBatchEdit = vi.fn();
    const { result } = setup({ onBatchEdit });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "mine");
    });
    act(() => {
      result.current.acceptSeeds(ARRIVED, "1", ["title"]);
    });

    expect(result.current.entries[0]?.seeds).toEqual({ title: "Arrived" });
    expect(result.current.draftFor(ARRIVED, "1", "title")).toBe("mine");
    act(() => {
      result.current.saveAll();
    });
    expect(onBatchEdit).toHaveBeenCalledWith([
      { row: ARRIVED, rowId: "1", patch: { title: "mine" } },
    ]);
  });

  it("drops the draft on take, so the cell reads the row again", () => {
    const onBatchEdit = vi.fn();
    const { result } = setup({ onBatchEdit });
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "mine");
    });
    act(() => {
      result.current.takeSeeds(ARRIVED, "1", ["title"]);
    });

    // Nothing of the reader's is left in that row, so it is not pending.
    expect(result.current.pending).toBe(false);
    expect(result.current.draftFor(ARRIVED, "1", "title")).toBe("Arrived");
    act(() => {
      result.current.saveAll();
    });
    expect(onBatchEdit).not.toHaveBeenCalled();
  });

  it("leaves the row's other changes alone", () => {
    const { result } = setup();
    act(() => {
      result.current.setDraft(ROWS[0]!, "1", "title", "mine");
      result.current.setDraft(ROWS[0]!, "1", "points", "7");
    });
    act(() => {
      result.current.takeSeeds(ARRIVED, "1", ["title"]);
    });

    expect(result.current.isChanged("1", "title")).toBe(false);
    expect(result.current.isChanged("1", "points")).toBe(true);
    expect(result.current.entries[0]?.seeds).toEqual({ points: "3" });
  });

  it("does nothing for a row with no pending changes", () => {
    const { result } = setup();
    act(() => {
      result.current.acceptSeeds(ARRIVED, "1", ["title"]);
      result.current.takeSeeds(ARRIVED, "1", ["title"]);
    });
    expect(result.current.pending).toBe(false);
  });
});
