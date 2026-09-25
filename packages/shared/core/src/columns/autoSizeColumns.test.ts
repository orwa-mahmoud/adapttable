/**
 * "Size this column to its content" measures the rendered cells, because the
 * table is the only thing that knows how wide the text actually drew. The
 * second click is the interesting one: measuring `scrollWidth` again on a
 * column that already fits would add padding every time and grow forever, so
 * a column at rest has to measure the same width twice.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { autoSizeColumns, measureColumnWidth } from "./autoSizeColumns";

function table(cells: { key: string; scroll: number; client: number }[]) {
  const root = document.createElement("div");
  for (const cell of cells) {
    const el = document.createElement("div");
    el.dataset.columnKey = cell.key;
    Object.defineProperty(el, "scrollWidth", { value: cell.scroll });
    Object.defineProperty(el, "clientWidth", { value: cell.client });
    root.append(el);
  }
  document.body.append(root);
  return root;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("measureColumnWidth", () => {
  it("has nothing to measure without a rendered table", () => {
    expect(measureColumnWidth(null, "name")).toBeNull();
  });

  it("has nothing to measure for a column that is not on screen", () => {
    expect(measureColumnWidth(table([]), "name")).toBeNull();
  });

  it("takes the widest cell in the column", () => {
    const root = table([
      { key: "name", scroll: 120, client: 80 },
      { key: "name", scroll: 200, client: 80 },
      { key: "team", scroll: 500, client: 80 },
    ]);
    const width = measureColumnWidth(root, "name");
    expect(width).toBeGreaterThanOrEqual(200);
  });

  it("escapes a column key that would otherwise be a selector", () => {
    const root = table([{ key: "a.b:c", scroll: 90, client: 40 }]);
    expect(measureColumnWidth(root, "a.b:c")).toBeGreaterThanOrEqual(90);
  });
});

describe("autoSizeColumns", () => {
  it("sizes every measurable column and reports how many", () => {
    const root = table([
      { key: "name", scroll: 120, client: 80 },
      { key: "team", scroll: 90, client: 40 },
    ]);
    const setWidth = vi.fn();
    expect(autoSizeColumns(root, ["name", "team", "gone"], setWidth)).toBe(2);
    expect(setWidth.mock.calls.map((call) => call[0])).toEqual([
      "name",
      "team",
    ]);
  });

  it("reports zero when nothing on screen could be measured", () => {
    const setWidth = vi.fn();
    expect(autoSizeColumns(null, ["name"], setWidth)).toBe(0);
    expect(setWidth).not.toHaveBeenCalled();
  });
});
