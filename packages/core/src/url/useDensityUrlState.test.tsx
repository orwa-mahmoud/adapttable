/**
 * Density in the URL.
 *
 * The interesting rule is what does NOT get written: choosing the default
 * removes the parameter rather than restating it, so a shared link carries
 * what someone chose and nothing else.
 *
 * The URL write is deferred, so these advance the clock to see one. What the
 * deferral buys is the render in between: the overlay covers the gap while a
 * router's navigation is still in flight.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UrlStateAdapter } from "./adapter";
import {
  DENSITY_URL_WRITE_DEBOUNCE_MS,
  useDensityUrlState,
} from "./useDensityUrlState";

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

function memoryAdapter(initial = ""): UrlStateAdapter & { search: string } {
  let search = initial;
  const listeners = new Set<() => void>();
  return {
    get search() {
      return search;
    },
    getSearch: () => search,
    setSearch: (next) => {
      search = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function flushUrl() {
  act(() => {
    vi.advanceTimersByTime(DENSITY_URL_WRITE_DEBOUNCE_MS + 10);
  });
}

describe("useDensityUrlState", () => {
  // Reading, in each state the parameter can arrive in. Every row names the
  // behaviour it stands for, so a failure still reports which reading broke.
  it.each([
    {
      name: "is comfortable until something says otherwise",
      search: "",
      density: "comfortable",
    },
    {
      name: "reads what the URL already carries",
      search: "density=compact",
      density: "compact",
    },
    {
      name: "ignores a value the table does not have",
      search: "density=enormous",
      density: "comfortable",
    },
    {
      // The server snapshot has to agree with the first client render or
      // React tears the tree down and rebuilds it. Only an explicit adapter
      // is trusted to be consistent across both.
      name: "hydrates from the adapter it was given, not from the address bar",
      search: "density=compact",
      density: "compact",
    },
  ])("$name", ({ search, density }) => {
    const urlAdapter = memoryAdapter(search);
    const { result } = renderHook(() => useDensityUrlState({ urlAdapter }));

    expect(result.current.density).toBe(density);
  });

  it("writes a choice into the URL", () => {
    const urlAdapter = memoryAdapter();
    const { result } = renderHook(() => useDensityUrlState({ urlAdapter }));
    act(() => {
      result.current.onDensityChange("compact");
    });
    flushUrl();

    expect(urlAdapter.search).toContain("density=compact");
    expect(urlAdapter.search).toContain("atv=1");
    expect(result.current.density).toBe("compact");
  });

  it("reads optimistically before the URL write lands", () => {
    // Deferred rather than same-batch: a router adapter whose write arrives a
    // tick later would otherwise render one frame with the overlay already
    // gone, and the table would snap back to the density just left behind.
    const urlAdapter = memoryAdapter();
    const { result } = renderHook(() => useDensityUrlState({ urlAdapter }));
    act(() => {
      result.current.onDensityChange("compact");
    });

    expect(result.current.density).toBe("compact");
    expect(urlAdapter.search).toBe("");

    flushUrl();

    expect(urlAdapter.search).toContain("density=compact");
    expect(result.current.density).toBe("compact");
  });

  it("coalesces a burst of clicks into one trailing write", () => {
    const adapter = memoryAdapter();
    const writes: string[] = [];
    const spied: UrlStateAdapter = {
      ...adapter,
      setSearch: (search: string) => {
        writes.push(search);
        adapter.setSearch(search);
      },
    };
    const { result } = renderHook(() =>
      useDensityUrlState({ urlAdapter: spied })
    );
    act(() => {
      // Somebody clicking the chooser back and forth.
      result.current.onDensityChange("compact");
      result.current.onDensityChange("comfortable");
      result.current.onDensityChange("compact");
    });
    flushUrl();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("density=compact");
  });

  it("flushes a pending choice on unmount so it is not lost", () => {
    const urlAdapter = memoryAdapter();
    const { result, unmount } = renderHook(() =>
      useDensityUrlState({ urlAdapter })
    );
    act(() => {
      result.current.onDensityChange("compact");
    });
    unmount();

    expect(urlAdapter.search).toContain("density=compact");
  });

  it("removes the parameter when the default is chosen again", () => {
    const urlAdapter = memoryAdapter("density=compact");
    const { result } = renderHook(() => useDensityUrlState({ urlAdapter }));
    act(() => {
      result.current.onDensityChange("comfortable");
    });
    flushUrl();

    // A link should carry what someone chose, not restate what the table
    // would have done anyway.
    expect(urlAdapter.search).not.toContain("density");
  });

  it("honours a host default, and writes only a departure from it", () => {
    const urlAdapter = memoryAdapter();
    const { result } = renderHook(() =>
      useDensityUrlState({ urlAdapter, defaultDensity: "compact" })
    );

    expect(result.current.density).toBe("compact");

    act(() => {
      result.current.onDensityChange("compact");
    });
    flushUrl();

    expect(urlAdapter.search).not.toContain("density");

    act(() => {
      result.current.onDensityChange("comfortable");
    });
    flushUrl();

    expect(urlAdapter.search).toContain("density=comfortable");
  });

  it("keeps other parameters intact", () => {
    const urlAdapter = memoryAdapter("sort=name&page=2");
    const { result } = renderHook(() => useDensityUrlState({ urlAdapter }));
    act(() => {
      result.current.onDensityChange("compact");
    });
    flushUrl();

    expect(urlAdapter.search).toContain("sort=name");
    expect(urlAdapter.search).toContain("page=2");
  });

  it("namespaces itself so two tables on a page do not collide", () => {
    const urlAdapter = memoryAdapter();
    const { result } = renderHook(() =>
      useDensityUrlState({ urlAdapter, urlKey: "left" })
    );
    act(() => {
      result.current.onDensityChange("compact");
    });
    flushUrl();

    expect(urlAdapter.search).toContain("left.density=compact");
  });
});
