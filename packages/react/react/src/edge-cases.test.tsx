/**
 * Edge-case probes — adversarial scenarios that could hide bugs in the
 * URL round-trip, the in-memory source boundaries, and search matching.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFrontendData } from "./source/useFrontendData";
import { createMemoryAdapter } from "./url/adapter";
import { useTableUrlState } from "./url/useTableUrlState";

describe("URL round-trip with special characters", () => {
  it("preserves spaces, ampersands, and equals in the search term", () => {
    const adapter = createMemoryAdapter();
    const { result } = renderHook(() =>
      useTableUrlState({ urlAdapter: adapter })
    );
    act(() => result.current.setSearch("a b & c=d"));
    expect(result.current.search).toBe("a b & c=d");
    // The stored query string is percent-encoded.
    expect(adapter.getSearch()).toContain("q=a+b+%26+c%3Dd");
  });

  it("preserves unicode (Arabic) search terms", () => {
    const adapter = createMemoryAdapter();
    const { result } = renderHook(() =>
      useTableUrlState({ urlAdapter: adapter })
    );
    act(() => result.current.setSearch("بحث"));
    expect(result.current.search).toBe("بحث");
  });

  it("round-trips array extras with whitespace, trimming each element", () => {
    const adapter = createMemoryAdapter();
    const { result } = renderHook(() =>
      useTableUrlState({ urlAdapter: adapter, arrayExtraKeys: ["tags"] })
    );
    act(() => result.current.setExtra("tags", ["a", " b ", "c"]));
    expect(result.current.extra.tags).toEqual(["a", "b", "c"]);
  });
});

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 5 }, (_, i) => ({
  id: String(i),
  name: `Row ${i}`,
}));

describe("useFrontendData boundaries", () => {
  it("walks infinite mode page-by-page to the end, then stops", () => {
    const adapter = createMemoryAdapter("limit=2");
    const { result } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        paginationMode: "infinite",
      })
    );
    expect(result.current.rows).toHaveLength(2);
    act(() => result.current.fetchNextPage()); // page 2 → 4 rows
    expect(result.current.rows).toHaveLength(4);
    act(() => result.current.fetchNextPage()); // page 3 → all 5
    expect(result.current.rows).toHaveLength(5);
    expect(result.current.hasNextPage).toBe(false);
    act(() => result.current.fetchNextPage()); // no-op past the end
    expect(result.current.rows).toHaveLength(5);
  });

  it("returns an empty slice when the search matches nothing", () => {
    const adapter = createMemoryAdapter("q=zzz");
    const { result } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(result.current.rows).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("clamps the page to the last when the page size grows past the data", () => {
    const adapter = createMemoryAdapter("page=3&limit=2");
    const { result } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(result.current.page).toBe(3); // 5 rows / 2 = 3 pages
    expect(result.current.rows).toHaveLength(1); // last page has 1 row
  });
});
