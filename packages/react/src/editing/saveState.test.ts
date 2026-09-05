/**
 * What a cell shows while its edit is in flight, and after it fails.
 *
 * The failure modes worth pinning down are the dishonest ones: a cell that looks
 * saved while a request is still out, a stale rejection marking a value the
 * reader has already replaced, and an optimistic table left showing a value the
 * server refused.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCellSaveState } from "./saveState";

interface Row {
  id: string;
  name: string;
}
const ADA: Row = { id: "1", name: "Ada" };

/**
 * A thenable that rejects with any reason at all.
 *
 * A save's result is whatever the host's client returned, and a rejection
 * carries whatever that client threw — a string, a response body, an `Error`.
 * Reading all three is the behaviour under test, so the reason has to be able to
 * be a non-`Error`, which `Promise.reject` will not express here.
 */
function rejectingThenable(reason: unknown): PromiseLike<never> {
  return {
    then: (_onFulfilled, onRejected) =>
      onRejected
        ? (onRejected(reason) as PromiseLike<never>)
        : (undefined as unknown as PromiseLike<never>),
  };
}

describe("useCellSaveState", () => {
  it("says nothing for a host that saves synchronously", async () => {
    const { result } = renderHook(() => useCellSaveState<Row>());
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "Augusta",
        result: undefined,
      });
    });
    // Nothing to wait for is a save that already happened, and no render is
    // paid for a state that would last no time at all.
    expect(saved).toBe(true);
    expect(result.current.statusFor("1", "name")).toBeUndefined();
    expect(result.current.signature).toBe("");
  });

  it("marks a cell saving until the promise settles", async () => {
    let settle: (() => void) | undefined;
    const { result } = renderHook(() => useCellSaveState<Row>());
    let tracked: Promise<boolean> | undefined;
    act(() => {
      tracked = result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "Augusta",
        result: new Promise<void>((resolve) => {
          settle = resolve;
        }),
      });
    });
    expect(result.current.statusFor("1", "name")).toBe("saving");

    await act(async () => {
      settle?.();
      await tracked;
    });
    expect(result.current.statusFor("1", "name")).toBeUndefined();
  });

  it("marks a cell failed, with the reason and what it takes to undo", async () => {
    const { result } = renderHook(() => useCellSaveState<Row>());
    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "Augusta",
        result: Promise.reject(new Error("Conflict")),
      });
    });
    // Reported, not read off the state: a caller holding a render-old closure
    // would otherwise read the state as it was BEFORE the failure.
    expect(saved).toBe(false);
    expect(result.current.statusFor("1", "name")).toBe("failed");
    const failure = result.current.failureFor("1", "name");
    expect(failure?.message).toBe("Conflict");
    expect(failure?.previous).toBe(ADA);
    expect(failure?.attempted).toBe("Augusta");
  });

  it("tells a lifecycle observer why the save rejected", async () => {
    const onEditError = vi.fn();
    const { result } = renderHook(() => useCellSaveState<Row>({ onEditError }));
    await act(async () => {
      await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "Augusta",
        previousValue: "Ada",
        result: Promise.reject(new Error("Conflict")),
      });
    });
    expect(onEditError).toHaveBeenCalledExactlyOnceWith({
      row: ADA,
      rowId: "1",
      columnKey: "name",
      value: "Augusta",
      previousValue: "Ada",
      unit: "cell",
      error: "Conflict",
    });
  });

  it("falls back to the previous row when the cell's old value is unknown", async () => {
    const onEditError = vi.fn();
    const { result } = renderHook(() => useCellSaveState<Row>({ onEditError }));
    await act(async () => {
      await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "Augusta",
        result: Promise.reject(new Error("Conflict")),
      });
    });
    expect(onEditError.mock.calls[0]?.[0].previousValue).toBe(ADA);
  });

  it("reads a rejection of any shape", async () => {
    const { result } = renderHook(() => useCellSaveState<Row>());
    // A rejection can be anything at all, which is the point: `reject` is not
    // typed, so a table has to read whatever a host's client throws.
    const failWith = async (error: unknown) => {
      await act(async () => {
        await result.current.track({
          rowId: "1",
          columnKey: "name",
          previous: ADA,
          attempted: "x",
          result: rejectingThenable(error),
        });
      });
      return result.current.failureFor("1", "name")?.message;
    };
    expect(await failWith("Offline")).toBe("Offline");
    expect(await failWith({ status: 409 })).toBe("Could not save");
    expect(await failWith("")).toBe("Could not save");
  });

  it("takes the host's own wording", async () => {
    const { result } = renderHook(() =>
      useCellSaveState<Row>({
        formatError: (error) => `hm: ${String(error)}`,
      })
    );
    await act(async () => {
      await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "x",
        result: rejectingThenable("nope"),
      });
    });
    expect(result.current.failureFor("1", "name")?.message).toBe("hm: nope");
  });

  it("puts the previous row back when asked, once", async () => {
    const onRollback = vi.fn();
    const { result } = renderHook(() => useCellSaveState<Row>({ onRollback }));
    await act(async () => {
      await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "Augusta",
        result: Promise.reject(new Error("Conflict")),
      });
    });
    act(() => {
      result.current.rollback("1", "name");
    });
    expect(onRollback).toHaveBeenCalledExactlyOnceWith(ADA, "name");
    expect(result.current.statusFor("1", "name")).toBeUndefined();

    // A second rollback has nothing to restore.
    act(() => {
      result.current.rollback("1", "name");
    });
    expect(onRollback).toHaveBeenCalledOnce();
  });

  it("forgets a failure without restoring anything", async () => {
    const onRollback = vi.fn();
    const { result } = renderHook(() => useCellSaveState<Row>({ onRollback }));
    await act(async () => {
      await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "Augusta",
        result: Promise.reject(new Error("Conflict")),
      });
    });
    act(() => {
      result.current.clear("1", "name");
    });
    // What a retry does: the message goes, the value the reader typed stays.
    expect(result.current.statusFor("1", "name")).toBeUndefined();
    expect(onRollback).not.toHaveBeenCalled();
  });

  it("lets a newer save win over one still in flight", async () => {
    const settles: { reject?: (e: unknown) => void; resolve?: () => void }[] =
      [];
    const { result } = renderHook(() => useCellSaveState<Row>());
    const pending = () =>
      new Promise<void>((resolve, reject) => {
        settles.push({ resolve, reject });
      });

    let first: Promise<boolean> | undefined;
    let second: Promise<boolean> | undefined;
    act(() => {
      first = result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "a",
        result: pending(),
      });
      second = result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "ab",
        result: pending(),
      });
    });
    await act(async () => {
      settles[0]?.reject?.(new Error("stale"));
      settles[1]?.resolve?.();
      await Promise.all([first, second]);
    });
    // The stale rejection is about a value that no longer exists.
    expect(result.current.statusFor("1", "name")).toBeUndefined();
  });

  it("changes its signature so a row repaints", async () => {
    const { result } = renderHook(() => useCellSaveState<Row>());
    const before = result.current.signature;
    await act(async () => {
      await result.current.track({
        rowId: "1",
        columnKey: "name",
        previous: ADA,
        attempted: "x",
        result: Promise.reject(new Error("Conflict")),
      });
    });
    expect(result.current.signature).not.toBe(before);
  });
});
