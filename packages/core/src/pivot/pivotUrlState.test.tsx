/**
 * Keeping the pivot configuration in the URL.
 *
 * The encoding itself is tested in `pivotUrlCodec.test.ts`, which needs no
 * renderer. What is left here is the hook: reading the parameter, writing it
 * back, the overlay that covers the gap until the write lands, and the SSR rule
 * it shares with the other URL hooks.
 */
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryAdapter, type UrlStateAdapter } from "../url/adapter";
import { EMPTY_PIVOT_CONFIG } from "./pivotConfigModel";
import { pivot, type PivotConfig } from "./pivotModel";
import { PIVOT_URL_WRITE_DEBOUNCE_MS, usePivotUrlState } from "./pivotUrlState";

/** Rows whose region/team paths give two subtotal lines to fold. */
const ROWS = [
  { region: "EU", team: "Alpha", amount: 10 },
  { region: "US", team: "Gamma", amount: 30 },
];

// The URL write is deferred past the batch that asked for it, so advance the
// clock to observe one.
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

function flushUrl() {
  act(() => {
    vi.advanceTimersByTime(PIVOT_URL_WRITE_DEBOUNCE_MS + 10);
  });
}

describe("usePivotUrlState", () => {
  it("reads a configuration out of the URL", () => {
    const urlAdapter = createMemoryAdapter("?pivot=rows:team;sum:amount");
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    expect(result.current.config.rows).toEqual(["team"]);
    expect(result.current.config.measures).toEqual([
      { key: "amount", agg: "sum" },
    ]);
  });

  it("writes a change back", () => {
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    act(() => {
      result.current.onConfigChange({ ...EMPTY_PIVOT_CONFIG, rows: ["team"] });
    });
    flushUrl();

    expect(urlAdapter.getSearch()).toContain("pivot=rows%3Ateam");
    expect(urlAdapter.getSearch()).toContain("atv=1");
    expect(result.current.config.rows).toEqual(["team"]);
  });

  it("reads optimistically before the URL write lands", () => {
    // Deferred rather than same-batch: a router adapter whose write arrives a
    // tick later would otherwise render one frame with the overlay already
    // gone — the field the reader just moved jumping back to where it was.
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    act(() => {
      result.current.onConfigChange({ ...EMPTY_PIVOT_CONFIG, rows: ["team"] });
    });

    expect(result.current.config.rows).toEqual(["team"]);
    expect(urlAdapter.getSearch()).toBe("");

    flushUrl();

    expect(urlAdapter.getSearch()).toContain("pivot=rows%3Ateam");
    expect(result.current.config.rows).toEqual(["team"]);
  });

  it("coalesces a burst of moves into one trailing write", () => {
    const adapter = createMemoryAdapter("");
    const writes: string[] = [];
    const spied: UrlStateAdapter = {
      ...adapter,
      setSearch: (search: string) => {
        writes.push(search);
        adapter.setSearch(search);
      },
    };
    const { result } = renderHook(() =>
      usePivotUrlState({ urlAdapter: spied })
    );

    act(() => {
      // Somebody building a pivot, one keystroke per zone.
      for (const rows of [["region"], ["region", "team"], ["team"]]) {
        result.current.onConfigChange({ ...EMPTY_PIVOT_CONFIG, rows });
      }
    });
    flushUrl();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("rows%3Ateam");
  });

  it("flushes a pending configuration on unmount so it is not lost", () => {
    const urlAdapter = createMemoryAdapter("");
    const { result, unmount } = renderHook(() =>
      usePivotUrlState({ urlAdapter })
    );

    act(() => {
      result.current.onConfigChange({ ...EMPTY_PIVOT_CONFIG, rows: ["team"] });
    });
    unmount();

    expect(urlAdapter.getSearch()).toContain("pivot=rows%3Ateam");
  });

  it("removes the parameter when the pivot is cleared", () => {
    const urlAdapter = createMemoryAdapter("?pivot=rows:team");
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    act(() => {
      result.current.onConfigChange(EMPTY_PIVOT_CONFIG);
    });
    flushUrl();

    expect(urlAdapter.getSearch()).not.toContain("pivot");
  });

  it("namespaces the parameter so two tables can share a URL", () => {
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      usePivotUrlState({ urlAdapter, urlKey: "left" })
    );

    act(() => {
      result.current.onConfigChange({ ...EMPTY_PIVOT_CONFIG, rows: ["team"] });
    });
    flushUrl();

    expect(urlAdapter.getSearch()).toContain("left.pivot=");
  });

  it("reads nothing before hydration when no adapter was given", () => {
    // The SSR rule the other URL hooks follow: only an explicit adapter is
    // trusted to be hydration-consistent, so the server snapshot is empty.
    const { result } = renderHook(() => usePivotUrlState({ urlSync: false }));

    expect(result.current.config).toEqual(EMPTY_PIVOT_CONFIG);

    act(() => {
      result.current.onConfigChange({ ...EMPTY_PIVOT_CONFIG, rows: ["team"] });
    });

    expect(result.current.config.rows).toEqual(["team"]);
  });

  it("renders on the server without reading a URL it cannot trust", () => {
    // Server-rendered with no explicit adapter: the snapshot has to be the
    // empty pivot, or hydration would disagree with the first client render.
    function Probe() {
      const { config } = usePivotUrlState();
      return <span>{`rows=${String(config.rows.length)}`}</span>;
    }

    expect(renderToString(<Probe />)).toContain("rows=0");
  });

  it("keeps the switches and the folded groups in the same parameter", () => {
    // The whole round trip, through the real hook: a reader turns subtotals off
    // and folds two groups, and the link they send restores all three. The keys
    // come from the engine, because those are the keys it matches against.
    const urlAdapter = createMemoryAdapter("");
    const config: PivotConfig = {
      rows: ["region", "team"],
      columns: [],
      measures: [{ key: "amount", agg: "sum" }],
      subtotals: false,
      grandTotals: false,
    };
    const folded = pivot(ROWS, { ...config, subtotals: true })
      .rows.filter((row) => row.kind === "subtotal")
      .map((row) => row.key);
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    act(() => {
      result.current.onConfigChange(config);
    });
    act(() => {
      result.current.onCollapsedChange(new Set(folded));
    });
    flushUrl();

    expect(folded).toHaveLength(2);
    const restored = renderHook(() => usePivotUrlState({ urlAdapter }));
    expect(restored.result.current.config).toEqual(config);
    expect([...restored.result.current.collapsed]).toEqual(folded);
    // And the engine folds by them: the rendering the link restores is the
    // rendering it was taken from.
    expect(
      pivot(ROWS, restored.result.current.config, {
        collapsed: restored.result.current.collapsed,
      }).rows.map((row) => row.key)
    ).toEqual(
      pivot(ROWS, config, { collapsed: new Set(folded) }).rows.map(
        (row) => row.key
      )
    );
  });

  it("keeps both halves when one batch changes both", () => {
    // The two setters share one parameter, and React need not render between
    // them: the second must build on the first rather than on the state the
    // render was built from.
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    act(() => {
      result.current.onConfigChange({
        ...EMPTY_PIVOT_CONFIG,
        rows: ["region", "team"],
      });
      result.current.onCollapsedChange(new Set(["EU"]));
    });
    flushUrl();

    expect(result.current.config.rows).toEqual(["region", "team"]);
    expect([...result.current.collapsed]).toEqual(["EU"]);
  });

  it("folds nothing until something says so", () => {
    const urlAdapter = createMemoryAdapter("?pivot=rows:team;sum:amount");
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    expect(result.current.collapsed.size).toBe(0);
  });

  it("keeps the folded set when a field moves", () => {
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() => usePivotUrlState({ urlAdapter }));

    act(() => {
      result.current.onConfigChange({
        ...EMPTY_PIVOT_CONFIG,
        rows: ["region", "team"],
      });
    });
    act(() => {
      result.current.onCollapsedChange(new Set(["EU"]));
    });
    act(() => {
      result.current.onConfigChange({
        ...EMPTY_PIVOT_CONFIG,
        rows: ["region", "team"],
        columns: ["quarter"],
      });
    });
    flushUrl();

    expect([...result.current.collapsed]).toEqual(["EU"]);
    expect(urlAdapter.getSearch()).toContain("hide%3AEU");
  });

  it("falls back to the given default while the URL is silent", () => {
    const urlAdapter = createMemoryAdapter("");
    const defaultConfig: PivotConfig = {
      ...EMPTY_PIVOT_CONFIG,
      rows: ["region"],
    };
    const { result } = renderHook(() =>
      usePivotUrlState({ urlAdapter, defaultConfig })
    );

    expect(result.current.config.rows).toEqual(["region"]);
  });
});
