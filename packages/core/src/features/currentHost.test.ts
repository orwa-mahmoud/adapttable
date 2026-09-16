/**
 * The feature host is how a composed plugin reaches the table it was composed
 * into, without either of them holding a reference to the other. Two tables on
 * one page make that a correctness question, not a convenience: a callback
 * bound to one table's host must never resolve the other's, and the binding
 * must be gone the moment the call returns.
 */
import { describe, expect, it, vi } from "vitest";

import { defaultFilterRegistry } from "../filters/filterBuiltins";
import {
  appendByKey,
  applyFilterExtends,
  bindFeatureHostFn,
  currentFeatureHost,
  type FeatureHostState,
  runWithFeatureHost,
} from "./currentHost";

function host(patch: Partial<FeatureHostState> = {}): FeatureHostState {
  return {
    sidePanels: [],
    columnMenuActions: [],
    filterTypes: [],
    filterExtends: [],
    commands: [],
    contextMenuItems: [],
    ...patch,
  } as FeatureHostState;
}

describe("appendByKey", () => {
  it("keeps the first list untouched when there is nothing to add", () => {
    const first = [{ key: "a" }];
    expect(appendByKey(first, [], (item) => item.key)).toBe(first);
  });

  it("lets a later entry replace an earlier one with the same key", () => {
    const merged = appendByKey(
      [
        { key: "a", label: "first" },
        { key: "b", label: "kept" },
      ],
      [{ key: "a", label: "second" }],
      (item) => item.key
    );
    expect(merged).toEqual([
      { key: "a", label: "second" },
      { key: "b", label: "kept" },
    ]);
  });
});

describe("runWithFeatureHost", () => {
  it("resolves nothing outside a bound call", () => {
    expect(currentFeatureHost()).toBeUndefined();
  });

  it("binds the host for the duration of the call and no longer", () => {
    const table = host();
    const seen = runWithFeatureHost(table, () => currentFeatureHost());
    expect(seen).toBe(table);
    expect(currentFeatureHost()).toBeUndefined();
  });

  it("resolves the innermost table when two are nested", () => {
    const outer = host();
    const inner = host();
    runWithFeatureHost(outer, () => {
      expect(currentFeatureHost()).toBe(outer);
      runWithFeatureHost(inner, () => {
        expect(currentFeatureHost()).toBe(inner);
      });
      expect(currentFeatureHost()).toBe(outer);
    });
  });

  it("unbinds even when the call throws", () => {
    expect(() =>
      runWithFeatureHost(host(), () => {
        throw new Error("boom");
      })
    ).toThrow("boom");
    expect(currentFeatureHost()).toBeUndefined();
  });

  it("runs the call unbound when there is no host", () => {
    expect(
      runWithFeatureHost(undefined, () => currentFeatureHost())
    ).toBeUndefined();
  });
});

describe("bindFeatureHostFn", () => {
  it("leaves an absent callback absent", () => {
    expect(bindFeatureHostFn(host(), undefined)).toBeUndefined();
  });

  it("re-binds the host on every later invocation, arguments intact", () => {
    const table = host();
    const seen: (FeatureHostState | undefined)[] = [];
    const bound = bindFeatureHostFn(table, (n: number) => {
      seen.push(currentFeatureHost());
      return n * 2;
    });
    expect(bound?.(3)).toBe(6);
    expect(bound?.(4)).toBe(8);
    expect(seen).toEqual([table, table]);
    expect(currentFeatureHost()).toBeUndefined();
  });
});

describe("applyFilterExtends", () => {
  it("returns the registry unchanged with no host", () => {
    expect(applyFilterExtends(defaultFilterRegistry, undefined)).toBe(
      defaultFilterRegistry
    );
  });

  it("registers a host's own filter type and patches an existing one", () => {
    const render = vi.fn();
    const next = applyFilterExtends(
      defaultFilterRegistry,
      host({
        filterTypes: [
          {
            type: "rating",
            ops: ["eq"],
            defaultOp: "eq",
            render,
          },
        ],
        filterExtends: [{ type: "text", patch: { ops: ["eq"] } }],
      } as never)
    );
    expect(next.get("rating")?.defaultOp).toBe("eq");
    expect(next.get("text")?.ops).toEqual(["eq"]);
    expect(defaultFilterRegistry.get("rating")).toBeUndefined();
  });
});
