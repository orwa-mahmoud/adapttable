import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import {
  AUTO_OPTIONS_LIMIT,
  type FilterDef,
  type FilterOption,
  materializeAutoOptions,
} from "./filterDefs";
import { useFilterOptions } from "./useFilterOptions";

beforeEach(() => resetDevWarnings());

describe("materializeAutoOptions", () => {
  interface Row {
    status: string;
  }
  const rows: Row[] = [
    { status: "open" },
    { status: "paid" },
    { status: "open" },
    { status: "" },
  ];

  it("derives sorted distinct values, skipping blanks", () => {
    const [def] = materializeAutoOptions<Row>(
      [{ key: "status", type: "multiSelect", options: "auto" }],
      rows
    );
    expect(def!.options).toEqual([
      { value: "open", label: "open" },
      { value: "paid", label: "paid" },
    ]);
  });

  it("caps the derived set", () => {
    const many = Array.from({ length: AUTO_OPTIONS_LIMIT + 20 }, (_, i) => ({
      status: `v${String(i).padStart(3, "0")}`,
    }));
    const [def] = materializeAutoOptions<Row>(
      [{ key: "status", type: "select", options: "auto" }],
      many
    );
    expect(def!.options as unknown[]).toHaveLength(AUTO_OPTIONS_LIMIT);
  });

  it("derives through a custom getValue projection", () => {
    const [def] = materializeAutoOptions<Row>(
      [
        {
          key: "k",
          type: "select",
          options: "auto",
          getValue: (r) => r.status.toUpperCase(),
        },
      ],
      rows
    );
    expect(def!.options).toEqual([
      { value: "OPEN", label: "OPEN" },
      { value: "PAID", label: "PAID" },
    ]);
  });

  it("passes static arrays and loaders through untouched", () => {
    const loader = () => Promise.resolve<readonly FilterOption[]>([]);
    const defs: FilterDef<Row>[] = [
      { key: "a", type: "select", options: [{ value: "x", label: "X" }] },
      { key: "b", type: "select", options: loader },
      { key: "c", type: "text" },
    ];
    const out = materializeAutoOptions(defs, rows);
    expect(out[0]).toBe(defs[0]);
    expect(out[1]).toBe(defs[1]);
    expect(out[2]).toBe(defs[2]);
  });
});

describe("useFilterOptions", () => {
  it("returns static arrays immediately", () => {
    const options = [{ value: "x", label: "X" }];
    const { result } = renderHook(() =>
      useFilterOptions({ key: "k", options })
    );
    expect(result.current).toEqual({ options, loading: false });
  });

  it("resolves an async loader once, with a loading flag", async () => {
    const loader = vi.fn(() => Promise.resolve([{ value: "a", label: "A" }]));
    const { result, rerender } = renderHook(() =>
      useFilterOptions({ key: "k", options: loader })
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([{ value: "a", label: "A" }]);
    rerender();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("a failing loader warns and resolves to no options", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useFilterOptions({
        key: "broken",
        options: () => Promise.reject(new Error("nope")),
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('async options for filter "broken"')
    );
    warn.mockRestore();
  });

  it('a leftover "auto" warns (no dataset on this tier) and yields none', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useFilterOptions({ key: "k", options: "auto" })
    );
    expect(result.current.options).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"auto"'));
    warn.mockRestore();
  });

  it("no options at all resolves to an empty list", () => {
    const { result } = renderHook(() => useFilterOptions({ key: "k" }));
    expect(result.current).toEqual({ options: [], loading: false });
  });

  it("ignores a resolution that lands after unmount", async () => {
    let resolve!: (v: readonly { value: string; label: string }[]) => void;
    const gate = new Promise<readonly { value: string; label: string }[]>(
      (r) => {
        resolve = r;
      }
    );
    const { unmount } = renderHook(() =>
      useFilterOptions({ key: "k", options: () => gate })
    );
    unmount();
    resolve([{ value: "late", label: "Late" }]);
    // The guard drops the late resolution — settling must not throw.
    await expect(gate).resolves.toHaveLength(1);
  });

  it("ignores a rejection that lands after unmount", async () => {
    let reject!: (e: Error) => void;
    const gate = new Promise<readonly { value: string; label: string }[]>(
      (_r, rj) => {
        reject = rj;
      }
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { unmount } = renderHook(() =>
      useFilterOptions({ key: "k", options: () => gate })
    );
    unmount();
    reject(new Error("late"));
    await gate.catch(() => undefined);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
