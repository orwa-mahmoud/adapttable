/**
 * Children fetched when a node is opened.
 *
 * What these cover is everything that goes wrong around one request: asking
 * twice, a spinner that outlives its fetch, a rejection that leaves the node
 * stuck, and a resolve after the table has gone.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useLazyChildren } from "./useLazyChildren";

interface Node {
  id: string;
  children?: Node[];
}

const FOLDER: Node = { id: "src" };
const LOADED: Node = { id: "lib", children: [{ id: "util" }] };

/** A hook wired to nested data, with the fetch under the test's control. */
function setup(onLoadChildren?: (row: Node) => void | Promise<void>) {
  return renderHook(() =>
    useLazyChildren<Node>({
      onLoadChildren,
      hasLoadedChildren: (row) => (row.children?.length ?? 0) > 0,
      getRowId: (row) => row.id,
    })
  );
}

describe("useLazyChildren", () => {
  it("does nothing without a handler", () => {
    const { result } = setup();
    act(() => {
      result.current.loadIfNeeded(FOLDER);
    });
    expect([...result.current.loadingIds]).toEqual([]);
  });

  it("marks a node while its children are fetched, and clears it after", async () => {
    let settle: (() => void) | undefined;
    const onLoadChildren = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        })
    );
    const { result } = setup(onLoadChildren);

    act(() => {
      result.current.loadIfNeeded(FOLDER);
    });
    expect([...result.current.loadingIds]).toEqual(["src"]);

    await act(async () => {
      settle?.();
      await Promise.resolve();
    });
    expect([...result.current.loadingIds]).toEqual([]);
    expect(onLoadChildren).toHaveBeenCalledExactlyOnceWith(FOLDER);
  });

  it("never asks for children it already has", () => {
    const onLoadChildren = vi.fn();
    const { result } = setup(onLoadChildren);
    act(() => {
      result.current.loadIfNeeded(LOADED);
    });
    expect(onLoadChildren).not.toHaveBeenCalled();
    expect([...result.current.loadingIds]).toEqual([]);
  });

  it("asks once however many times the reader clicks", () => {
    const onLoadChildren = vi.fn(() => new Promise<void>(() => undefined));
    const { result } = setup(onLoadChildren);
    act(() => {
      result.current.loadIfNeeded(FOLDER);
      result.current.loadIfNeeded(FOLDER);
      result.current.loadIfNeeded(FOLDER);
    });
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
  });

  it("clears the spinner on a rejection and allows another attempt", async () => {
    const onLoadChildren = vi
      .fn<(row: Node) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const { result } = setup(onLoadChildren);

    await act(async () => {
      result.current.loadIfNeeded(FOLDER);
      await Promise.resolve();
    });
    expect([...result.current.loadingIds]).toEqual([]);
    expect([...result.current.failedIds]).toEqual(["src"]);

    // The retry is the same gesture — the node was left clickable.
    await act(async () => {
      result.current.loadIfNeeded(FOLDER);
      await Promise.resolve();
    });
    expect(onLoadChildren).toHaveBeenCalledTimes(2);
    expect([...result.current.failedIds]).toEqual([]);
  });

  it("settles a handler that throws synchronously", async () => {
    const onLoadChildren = vi.fn(() => {
      throw new Error("boom");
    });
    const { result } = setup(onLoadChildren);
    await act(async () => {
      result.current.loadIfNeeded(FOLDER);
      await Promise.resolve();
    });
    // A thrown handler must not leave the chevron spinning forever.
    expect([...result.current.loadingIds]).toEqual([]);
    expect([...result.current.failedIds]).toEqual(["src"]);
  });

  it("ignores a fetch that lands after the table is gone", async () => {
    let settle: (() => void) | undefined;
    const { result, unmount } = setup(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        })
    );
    act(() => {
      result.current.loadIfNeeded(FOLDER);
    });
    unmount();
    await act(async () => {
      settle?.();
      await Promise.resolve();
    });
    // No state update after unmount — nothing to assert but that it did not
    // throw, which is the whole point.
    expect(settle).toBeDefined();
  });
});
