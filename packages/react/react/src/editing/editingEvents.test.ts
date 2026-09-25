/**
 * Editing lifecycle events observe a commit; they never own it.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { observeEdit, useEditLifecycle } from "./editingEvents";
import { useCellEditing } from "./useCellEditing";

interface Task {
  id: string;
  title: string;
}

const ROW: Task = { id: "1", title: "Ship" };

describe("observeEdit", () => {
  it("does nothing when nobody is listening", () => {
    expect(() =>
      observeEdit(undefined, {
        row: ROW,
        rowId: "1",
        columnKey: "title",
        value: "Ship",
        previousValue: "Ship",
        unit: "cell",
      })
    ).not.toThrow();
  });

  it("swallows a throw so the observer cannot rewind the commit", () => {
    const handler = vi.fn(() => {
      throw new Error("analytics down");
    });
    expect(() =>
      observeEdit(handler, {
        row: ROW,
        rowId: "1",
        columnKey: "title",
        value: "Ship it",
        previousValue: "Ship",
        unit: "cell",
      })
    ).not.toThrow();
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("useEditLifecycle", () => {
  it("keeps a stable identity across a fresh inline handler", () => {
    const { result, rerender } = renderHook(
      (props: { onEditStart?: (e: unknown) => void }) =>
        useEditLifecycle<Task>(props),
      { initialProps: { onEditStart: vi.fn() } }
    );
    const first = result.current.onEditStart;
    const firstBundle = result.current;
    rerender({ onEditStart: vi.fn() });
    expect(result.current.onEditStart).toBe(first);
    expect(result.current).toBe(firstBundle);
  });

  it("forwards an observer and stays inert for the ones nobody wired", () => {
    const onEditStart = vi.fn();
    const { result } = renderHook(() =>
      useEditLifecycle<Task>({ onEditStart })
    );
    expect(result.current.onEditCancel).toBeUndefined();
    expect(result.current.onEditCommit).toBeUndefined();
    act(() => {
      result.current.onEditStart?.({
        row: ROW,
        rowId: "1",
        columnKey: "title",
        value: "Ship",
        previousValue: "Ship",
        unit: "cell",
      });
    });
    expect(onEditStart).toHaveBeenCalledOnce();
  });

  it("forwards every observer through the same latch", () => {
    const onEditStart = vi.fn();
    const onEditCancel = vi.fn();
    const onEditCommit = vi.fn();
    const onValidationFail = vi.fn();
    const onEditError = vi.fn();
    const { result } = renderHook(() =>
      useEditLifecycle<Task>({
        onEditStart,
        onEditCancel,
        onEditCommit,
        onValidationFail,
        onEditError,
      })
    );
    const event = {
      row: ROW,
      rowId: "1",
      columnKey: "title",
      value: "x",
      previousValue: "y",
      unit: "cell" as const,
    };
    act(() => {
      result.current.onEditStart?.(event);
      result.current.onEditCancel?.(event);
      result.current.onEditCommit?.(event);
      result.current.onValidationFail?.(event);
      result.current.onEditError?.(event);
    });
    expect(onEditStart).toHaveBeenCalledOnce();
    expect(onEditCancel).toHaveBeenCalledOnce();
    expect(onEditCommit).toHaveBeenCalledOnce();
    expect(onValidationFail).toHaveBeenCalledOnce();
    expect(onEditError).toHaveBeenCalledOnce();
  });
});

describe("useCellEditing lifecycle", () => {
  it("fires start on begin and cancel on Escape, never on a silent close", () => {
    const onEditStart = vi.fn();
    const onEditCancel = vi.fn();
    const { result } = renderHook(() =>
      useCellEditing<Task>({ onEditStart, onEditCancel })
    );
    act(() => {
      result.current.begin("1", "title", "Ship", ROW);
    });
    expect(onEditStart).toHaveBeenCalledExactlyOnceWith({
      row: ROW,
      rowId: "1",
      columnKey: "title",
      value: "Ship",
      previousValue: "Ship",
      unit: "cell",
    });
    act(() => {
      result.current.close();
    });
    expect(onEditCancel).not.toHaveBeenCalled();
    act(() => {
      result.current.begin("1", "title", "Ship", ROW);
      result.current.cancel();
    });
    expect(onEditCancel).toHaveBeenCalledOnce();
  });

  it("treats switching cells as a cancel of the one left behind", () => {
    const onEditCancel = vi.fn();
    const { result } = renderHook(() => useCellEditing<Task>({ onEditCancel }));
    act(() => {
      result.current.begin("1", "title", "Ship", ROW);
      result.current.setDraft("typed");
      result.current.begin("1", "id", "1", ROW);
    });
    expect(onEditCancel).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        columnKey: "title",
        value: "typed",
        unit: "cell",
      })
    );
  });
});
