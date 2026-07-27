import { describe, expect, it } from "vitest";

import { defaultLabels, resolveLabels } from "./labels";

describe("resolveLabels", () => {
  it("returns the defaults when no overrides are given", () => {
    expect(resolveLabels(undefined)).toBe(defaultLabels);
  });

  it("merges overrides on top of the defaults", () => {
    const merged = resolveLabels({ search: "Buscar" });
    expect(merged.search).toBe("Buscar");
    expect(merged.noData).toBe(defaultLabels.noData);
  });

  it("ignores undefined override entries", () => {
    const merged = resolveLabels({ search: undefined, filters: "Filtros" });
    expect(merged.search).toBe(defaultLabels.search);
    expect(merged.filters).toBe("Filtros");
  });

  it("overrides function labels", () => {
    const merged = resolveLabels({ selectedCount: (n) => `${n} picked` });
    expect(merged.selectedCount(3)).toBe("3 picked");
  });
});

describe("defaultLabels", () => {
  it("provides English builders", () => {
    expect(defaultLabels.showing({ from: 1, to: 10, total: 50 })).toBe(
      "Showing 1–10 of 50"
    );
    expect(defaultLabels.pageOf({ page: 2, total: 5 })).toBe("Page 2 of 5");
    expect(defaultLabels.selectedCount(3)).toBe("3 selected");
    expect(defaultLabels.goToPage(4)).toBe("Go to page 4");
  });
});

it("formats the select-all-matching banner labels", () => {
  expect(defaultLabels.pageSelected(8)).toBe("All 8 on this page selected");
  expect(defaultLabels.selectAllMatching(57)).toBe("Select all 57 matching");
  expect(defaultLabels.allMatchingSelected(57)).toBe(
    "All 57 matching selected"
  );
});
