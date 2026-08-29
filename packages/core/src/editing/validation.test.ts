/**
 * Validation that gates a commit.
 *
 * The rules worth pinning down are the ones a hand-rolled version gets wrong:
 * a stale async answer marking a value the reader already changed, a row
 * validator naming cells other than the edited one, and a rejection that must
 * not reach the host at all.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useEditValidation } from "./validation";

interface Task {
  id: string;
  title: string;
  start: number;
  end: number;
}

const TASK: Task = { id: "1", title: "Ship", start: 3, end: 9 };
const target = { rowId: "1", columnKey: "title" };

describe("useEditValidation", () => {
  it("allows a commit when nothing validates it", async () => {
    const { result } = renderHook(() => useEditValidation<Task>());
    let verdict: { allowed: boolean; error?: string } | undefined;
    await act(async () => {
      verdict = await result.current.check({
        target,
        value: "Ship",
        row: TASK,
      });
    });
    expect(verdict?.allowed).toBe(true);
    expect(result.current.errorFor("1", "title")).toBeUndefined();
    expect(result.current.hasRowValidator).toBe(false);
  });

  it("stops a commit a cell validator rejects, and says why", async () => {
    const { result } = renderHook(() => useEditValidation<Task>());
    let verdict: { allowed: boolean; error?: string } | undefined;
    await act(async () => {
      verdict = await result.current.check({
        target,
        value: "",
        row: TASK,
        validateCell: (value) =>
          String(value) === "" ? "A title is required" : undefined,
      });
    });
    expect(verdict?.allowed).toBe(false);
    expect(verdict?.error).toBe("A title is required");
    expect(result.current.errorFor("1", "title")).toBe("A title is required");
    expect(result.current.rowHasError("1")).toBe(true);
  });

  it("clears the message once the value passes", async () => {
    const validateCell = (value: unknown) =>
      String(value) === "" ? "A title is required" : undefined;
    const { result } = renderHook(() => useEditValidation<Task>());
    await act(async () => {
      await result.current.check({
        target,
        value: "",
        row: TASK,
        validateCell,
      });
    });
    await act(async () => {
      await result.current.check({
        target,
        value: "Ship it",
        row: TASK,
        validateCell,
      });
    });
    expect(result.current.errorFor("1", "title")).toBeUndefined();
  });

  it("marks the cell busy while an async check runs", async () => {
    let settle: ((message?: string) => void) | undefined;
    const { result } = renderHook(() => useEditValidation<Task>());
    let pending: Promise<{ allowed: boolean; error?: string }> | undefined;
    act(() => {
      pending = result.current.check({
        target,
        value: "Ship",
        row: TASK,
        validateCell: () =>
          new Promise<string | undefined>((resolve) => {
            settle = resolve;
          }),
      });
    });
    expect(result.current.isValidating("1", "title")).toBe(true);

    await act(async () => {
      settle?.("Already taken");
      await pending;
    });
    expect(result.current.isValidating("1", "title")).toBe(false);
    expect(result.current.errorFor("1", "title")).toBe("Already taken");
  });

  it("lets a newer check win over one still in flight", async () => {
    // The reader typed again while the first request was out. Its answer is
    // about a value that no longer exists and must not mark the new one.
    const settles: ((message?: string) => void)[] = [];
    const { result } = renderHook(() => useEditValidation<Task>());
    const validateCell = () =>
      new Promise<string | undefined>((resolve) => {
        settles.push(resolve);
      });

    let first: Promise<{ allowed: boolean; error?: string }> | undefined;
    let second: Promise<{ allowed: boolean; error?: string }> | undefined;
    act(() => {
      first = result.current.check({
        target,
        value: "a",
        row: TASK,
        validateCell,
      });
      second = result.current.check({
        target,
        value: "ab",
        row: TASK,
        validateCell,
      });
    });
    await act(async () => {
      settles[0]?.("Too short");
      settles[1]?.(undefined);
      await Promise.all([first, second]);
    });
    // The stale rejection is discarded; the newer pass stands.
    expect(await second).toEqual({ allowed: true });
    expect(await first).toEqual({ allowed: false });
    expect(result.current.errorFor("1", "title")).toBeUndefined();
  });

  it("runs the row validator against the row the edit WOULD produce", async () => {
    const validateRow = vi.fn((row: Task) =>
      row.end <= row.start ? "The end must come after the start" : undefined
    );
    const { result } = renderHook(() =>
      useEditValidation<Task>({ validateRow })
    );
    let verdict: { allowed: boolean; error?: string } | undefined;
    await act(async () => {
      verdict = await result.current.check({
        target: { rowId: "1", columnKey: "end" },
        value: 1,
        row: TASK,
      });
    });
    expect(validateRow).toHaveBeenCalledWith({ ...TASK, end: 1 });
    expect(verdict?.allowed).toBe(false);
    expect(verdict?.error).toBe("The end must come after the start");
    expect(result.current.rowErrorFor("1")).toBe(
      "The end must come after the start"
    );
    expect(result.current.hasRowValidator).toBe(true);
  });

  it("lets a row validator name cells other than the edited one", async () => {
    const { result } = renderHook(() =>
      useEditValidation<Task>({
        validateRow: () => ({ start: "Too late", end: "Too early" }),
      })
    );
    await act(async () => {
      await result.current.check({
        target: { rowId: "1", columnKey: "end" },
        value: 1,
        row: TASK,
      });
    });
    // A cross-field rule points at the fields, not just at the row.
    expect(result.current.errorFor("1", "start")).toBe("Too late");
    expect(result.current.errorFor("1", "end")).toBe("Too early");
    expect(result.current.rowErrorFor("1")).toBeUndefined();
  });

  it("treats an empty map as a pass", async () => {
    const { result } = renderHook(() =>
      useEditValidation<Task>({ validateRow: () => ({}) })
    );
    let verdict: { allowed: boolean; error?: string } | undefined;
    await act(async () => {
      verdict = await result.current.check({
        target,
        value: "Ship",
        row: TASK,
      });
    });
    expect(verdict?.allowed).toBe(true);
  });

  it("reads a nested field through the host's own applyEdit", async () => {
    // A column key that is not the field: the host says how an edit lands.
    const validateRow = vi.fn((row: Task) =>
      row.title === "SHIP" ? undefined : "wrong path"
    );
    const applyEdit = vi.fn((row: Task, key: string, value: unknown): Task =>
      key === "title" ? { ...row, title: String(value).toUpperCase() } : row
    );
    const { result } = renderHook(() =>
      useEditValidation<Task>({ validateRow, applyEdit })
    );
    let verdict: { allowed: boolean; error?: string } | undefined;
    await act(async () => {
      verdict = await result.current.check({
        target,
        value: "Ship",
        row: TASK,
      });
    });
    expect(applyEdit).toHaveBeenCalledWith(TASK, "title", "Ship");
    expect(validateRow).toHaveBeenCalledWith({ ...TASK, title: "SHIP" });
    expect(verdict?.allowed).toBe(true);
  });

  it("forgets one cell, and forgets everything", async () => {
    const { result } = renderHook(() => useEditValidation<Task>());
    const validateCell = () => "no";
    await act(async () => {
      await result.current.check({
        target,
        value: "x",
        row: TASK,
        validateCell,
      });
      await result.current.check({
        target: { rowId: "2", columnKey: "title" },
        value: "x",
        row: TASK,
        validateCell,
      });
    });
    act(() => {
      result.current.clear("1", "title");
    });
    expect(result.current.errorFor("1", "title")).toBeUndefined();
    expect(result.current.errorFor("2", "title")).toBe("no");

    act(() => {
      result.current.clearAll();
    });
    expect(result.current.errorFor("2", "title")).toBeUndefined();
  });

  it("changes its signature when a message appears", async () => {
    const { result } = renderHook(() => useEditValidation<Task>());
    const before = result.current.signature;
    await act(async () => {
      await result.current.check({
        target,
        value: "",
        row: TASK,
        validateCell: () => "required",
      });
    });
    // A row memo compares this, or a rejected cell never repaints.
    expect(result.current.signature).not.toBe(before);
  });
});
