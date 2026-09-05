import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "@adapttable/core";
import type { RowAction } from "@adapttable/core";
import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  useRowMutations,
} from "./rowMutations";

interface Row {
  id: string;
}
const ROW: Row = { id: "a" };

/** One built action, named — the list is short and always in a known order. */
function actionAt(
  actions: readonly RowAction<Row>[],
  index: number
): RowAction<Row> {
  const action = actions[index];
  if (!action) throw new Error(`no action at ${String(index)}`);
  return action;
}

/** Arm the hook with whatever handlers a case needs. */
function arm(options: Parameters<typeof useRowMutations<Row>>[0]) {
  return renderHook((props: typeof options) => useRowMutations<Row>(props), {
    initialProps: options,
  });
}

describe("useRowMutations", () => {
  it("offers nothing until a handler is wired", () => {
    const { result } = arm({ labels: defaultLabels });
    expect(result.current.canAdd).toBe(false);
    expect(result.current.actions).toEqual([]);
    // Inert rather than throwing: an adapter may call it before the host wires
    // anything up, and a table that crashes on a dormant feature is worse than
    // one that does nothing.
    act(() => {
      result.current.addRow();
    });
  });

  it("arms the Add control and hands the ask straight to the host", () => {
    const onAddRow = vi.fn();
    const { result } = arm({ labels: defaultLabels, onAddRow });
    expect(result.current.canAdd).toBe(true);
    act(() => {
      result.current.addRow();
    });
    expect(onAddRow).toHaveBeenCalledTimes(1);
    // The table stores nothing: the row arrives through the source like any
    // other, so there is no argument to pass back.
    expect(onAddRow).toHaveBeenCalledWith();
  });

  it("builds a duplicate action that passes the row through", () => {
    const onDuplicateRow = vi.fn();
    const { result } = arm({ labels: defaultLabels, onDuplicateRow });
    expect(result.current.actions.map((a) => a.key)).toEqual([
      DUPLICATE_ROW_ACTION_KEY,
    ]);
    const action = actionAt(result.current.actions, 0);
    expect(action.label).toBe(defaultLabels.duplicateRow);
    expect(action.confirm).toBeUndefined();
    action.onClick(ROW);
    expect(onDuplicateRow).toHaveBeenCalledWith(ROW);
  });

  it("puts a delete behind a confirmation by default", () => {
    const onDeleteRow = vi.fn();
    const { result } = arm({ labels: defaultLabels, onDeleteRow });
    const action = actionAt(result.current.actions, 0);
    expect(action.key).toBe(DELETE_ROW_ACTION_KEY);
    expect(action.color).toBe("red");
    expect(action.confirm?.danger).toBe(true);
    expect(action.confirm?.message(ROW)).toBe(defaultLabels.deleteRowConfirm);
    action.onClick(ROW);
    expect(onDeleteRow).toHaveBeenCalledWith(ROW);
  });

  it("drops the confirmation when the host says it already asked", () => {
    const { result } = arm({
      labels: defaultLabels,
      onDeleteRow: vi.fn(),
      confirmDeleteRow: false,
    });
    expect(actionAt(result.current.actions, 0).confirm).toBeUndefined();
  });

  it("orders delete last, after duplicate", () => {
    const { result } = arm({
      labels: defaultLabels,
      onDuplicateRow: vi.fn(),
      onDeleteRow: vi.fn(),
    });
    expect(result.current.actions.map((a) => a.key)).toEqual([
      DUPLICATE_ROW_ACTION_KEY,
      DELETE_ROW_ACTION_KEY,
    ]);
  });

  it("names the actions in the host's language", () => {
    const labels = {
      ...defaultLabels,
      duplicateRow: "Dupliquer la ligne",
      deleteRow: "Supprimer la ligne",
      deleteRowConfirm: "Supprimer cette ligne ?",
    };
    const { result } = arm({
      labels,
      onDuplicateRow: vi.fn(),
      onDeleteRow: vi.fn(),
    });
    const duplicate = actionAt(result.current.actions, 0);
    const remove = actionAt(result.current.actions, 1);
    expect(duplicate.label).toBe("Dupliquer la ligne");
    expect(remove.label).toBe("Supprimer la ligne");
    expect(remove.confirm?.title).toBe("Supprimer la ligne");
    expect(remove.confirm?.confirmLabel).toBe("Supprimer la ligne");
    expect(remove.confirm?.message(ROW)).toBe("Supprimer cette ligne ?");
  });

  it("keeps the action list stable across renders so memoized rows hold", () => {
    const handlers = {
      labels: defaultLabels,
      onDuplicateRow: vi.fn(),
      onDeleteRow: vi.fn(),
    };
    const { result, rerender } = arm(handlers);
    const first = result.current.actions;
    // A fresh handler identity every render is the common case — an inline
    // arrow in the host's JSX. The actions must not change with it, or every
    // row in the table repaints on every keystroke.
    rerender({ ...handlers, onDeleteRow: vi.fn() });
    expect(result.current.actions).toBe(first);
  });

  it("calls the handler the host has NOW, not the one it started with", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = arm({
      labels: defaultLabels,
      onDeleteRow: first,
    });
    const action = actionAt(result.current.actions, 0);
    rerender({ labels: defaultLabels, onDeleteRow: second });
    action.onClick(ROW);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(ROW);
  });
});
