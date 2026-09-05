/**
 * Keeping the formula columns in the URL.
 *
 * The encoding is tested in `formulaUrlCodec.test.ts`, which needs no renderer.
 * What is left here is the hook: reading the parameter, writing it back, the
 * overlay that covers the gap between a keystroke and the URL, and the SSR rule
 * it shares with the other URL hooks.
 */
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/adapter";
import type { FormulaColumnSpec } from "@adapttable/core";
import {
  FORMULA_URL_WRITE_DEBOUNCE_MS,
  useFormulaUrlState,
} from "./useFormulaUrlState";

// The URL write is debounced — a formula bar that writes as it is typed commits
// one list per keystroke — so advance past it to observe a URL.
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

const TOTAL: FormulaColumnSpec[] = [
  { key: "total", header: "Total", formula: "=quantity * 2" },
];

function flushUrl() {
  act(() => {
    vi.advanceTimersByTime(FORMULA_URL_WRITE_DEBOUNCE_MS + 10);
  });
}

function renderWith(
  initial = "",
  options?: Parameters<typeof useFormulaUrlState>[0]
) {
  const adapter = createMemoryAdapter(initial);
  const view = renderHook(() =>
    useFormulaUrlState({ urlAdapter: adapter, ...options })
  );
  return { adapter, ...view };
}

describe("useFormulaUrlState", () => {
  it("reads the columns out of the URL", () => {
    const { result } = renderWith("formula=total:%3Dquantity%20*%202:Total");
    expect(result.current.formulas).toEqual(TOTAL);
  });

  it("writes a change back", () => {
    const { adapter, result } = renderWith("");
    act(() => {
      result.current.onFormulasChange(TOTAL);
    });
    flushUrl();
    expect(adapter.getSearch()).toContain("formula=total");
    expect(adapter.getSearch()).toContain("atv=1");
    expect(result.current.formulas).toEqual(TOTAL);
  });

  it("reads optimistically before the URL write lands", () => {
    // Deferred rather than same-batch: a router adapter whose write arrives a
    // tick later would otherwise render one frame with the overlay already
    // gone — the column the reader just typed vanishing and coming back.
    const { adapter, result } = renderWith("");
    act(() => {
      result.current.onFormulasChange(TOTAL);
    });
    expect(result.current.formulas).toEqual(TOTAL);
    expect(adapter.getSearch()).toBe("");
    flushUrl();
    expect(adapter.getSearch()).toContain("formula=total");
    expect(result.current.formulas).toEqual(TOTAL);
  });

  it("coalesces a burst of edits into one trailing write", () => {
    const adapter = createMemoryAdapter("");
    const writes: string[] = [];
    const spied = {
      ...adapter,
      setSearch: (search: string) => {
        writes.push(search);
        adapter.setSearch(search);
      },
    };
    const { result } = renderHook(() =>
      useFormulaUrlState({ urlAdapter: spied })
    );
    act(() => {
      // Someone typing `=quantity`, one keystroke at a time.
      for (const text of ["=q", "=qu", "=qua", "=quantity"]) {
        result.current.onFormulasChange([{ key: "total", formula: text }]);
      }
    });
    flushUrl();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("quantity");
  });

  it("flushes a pending list on unmount so a typed formula is kept", () => {
    const adapter = createMemoryAdapter("");
    const { result, unmount } = renderHook(() =>
      useFormulaUrlState({ urlAdapter: adapter })
    );
    act(() => {
      result.current.onFormulasChange(TOTAL);
    });
    unmount();
    expect(adapter.getSearch()).toContain("formula=total");
  });

  it("removes the parameter when the last column goes", () => {
    const { adapter, result } = renderWith("formula=total:%3D1");
    act(() => {
      result.current.onFormulasChange([]);
    });
    flushUrl();
    expect(adapter.getSearch()).not.toContain("formula");
    expect(result.current.formulas).toEqual([]);
  });

  it("applies the default while the URL is silent", () => {
    const { result } = renderWith("", { defaultFormulas: TOTAL });
    expect(result.current.formulas).toEqual(TOTAL);
  });

  it("keeps a default-carrying table empty once the columns are removed", () => {
    // Deleting the parameter would read back as "nothing has been said", and
    // the removed column would return on the next read.
    const { adapter, result } = renderWith("", { defaultFormulas: TOTAL });
    act(() => {
      result.current.onFormulasChange([]);
    });
    flushUrl();
    expect(adapter.getSearch()).toContain("formula=");
    expect(result.current.formulas).toEqual([]);
  });

  it("namespaces the parameter so two tables can share a URL", () => {
    const { adapter, result } = renderWith("", { urlKey: "left" });
    act(() => {
      result.current.onFormulasChange(TOTAL);
    });
    flushUrl();
    expect(adapter.getSearch()).toContain("left.formula=");
  });

  it("reads a namespaced parameter and ignores the other table's", () => {
    const { result } = renderWith("formula=other:%3D1&left.formula=mine:%3D2", {
      urlKey: "left",
    });
    expect(result.current.formulas).toEqual([{ key: "mine", formula: "=2" }]);
  });

  it("reads nothing before hydration when no adapter was given", () => {
    // The SSR rule the other URL hooks follow: only an explicit adapter is
    // trusted to be hydration-consistent, so the server snapshot is empty.
    function Probe() {
      const { formulas } = useFormulaUrlState({ urlSync: false });
      return <span>{`columns-${String(formulas.length)}`}</span>;
    }
    expect(renderToString(<Probe />)).toContain("columns-0");
  });

  it("reads the parameter through the server snapshot of an explicit adapter", () => {
    const adapter = createMemoryAdapter("formula=total:%3D1");
    function Probe() {
      const { formulas } = useFormulaUrlState({ urlAdapter: adapter });
      return <span>{formulas.map((spec) => spec.key).join(",")}</span>;
    }
    expect(renderToString(<Probe />)).toContain("total");
  });

  it("keeps every other parameter it finds", () => {
    const { adapter, result } = renderWith("q=ada&page=2");
    act(() => {
      result.current.onFormulasChange(TOTAL);
    });
    flushUrl();
    expect(adapter.getSearch()).toContain("q=ada");
    expect(adapter.getSearch()).toContain("page=2");
  });
});
