/**
 * The error model every adapter reads, and the rule that decides whether a
 * retry is offered at all.
 */
import { describe, expect, it, vi } from "vitest";

import type { TableSource } from "../source/TableSource";
import { fillSlot, tableErrorState } from "./errorState";

function source(over: Partial<TableSource<unknown>>): TableSource<unknown> {
  return {
    error: null,
    isFetching: false,
    ...over,
  } as TableSource<unknown>;
}

describe("tableErrorState", () => {
  it("reports nothing while the source is fine", () => {
    expect(tableErrorState(source({}))).toBeUndefined();
  });

  it("carries the error and a retry the source can perform", () => {
    const refetch = vi.fn();
    const state = tableErrorState(
      source({ error: new Error("boom"), refetch })
    );

    expect(state?.error.message).toBe("boom");
    state?.retry?.();
    expect(refetch).toHaveBeenCalled();
  });

  it("offers no retry when the source cannot re-fetch", () => {
    // A static `data` array has nothing to ask again — a button that did
    // nothing would be worse than no button.
    const state = tableErrorState(source({ error: new Error("boom") }));

    expect(state?.retry).toBeUndefined();
  });

  it("says when a retry is already running", () => {
    const state = tableErrorState(
      source({ error: new Error("boom"), isFetching: true })
    );

    expect(state?.retrying).toBe(true);
  });
});

describe("fillSlot", () => {
  it("leaves the built-in alone when the host passed nothing", () => {
    expect(fillSlot(undefined, { n: 1 })).toBeUndefined();
  });

  it("takes a plain node for a fixed message", () => {
    expect(fillSlot("gone", { n: 1 })).toBe("gone");
  });

  it("builds from the state when the host passed a function", () => {
    expect(fillSlot((state: { n: number }) => `n=${state.n}`, { n: 7 })).toBe(
      "n=7"
    );
  });
});
