import type {
  FeatureMountContext,
  GridFocusState,
  StaticTableFeature,
} from "@adapttable/vue";
import { GRID_FOCUS_MODEL } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, type ShallowRef } from "vue";

import FeatureUnionDemo from "../../../../apps/showcase/src/vue/feature-union/FeatureUnionDemo.vue";
import * as navigation from "../src/cell-navigation";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

afterEach(() => vi.restoreAllMocks());

describe("actual combined Find selection contract", () => {
  it("keeps the raw one-cell range for export while reporting no multi-cell rectangle", async () => {
    let grid: Readonly<ShallowRef<GridFocusState | undefined>> | undefined;
    const original = navigation.cellNavigation;
    vi.spyOn(navigation, "cellNavigation").mockImplementation(
      (options): StaticTableFeature => {
        const declaration = original(options);
        return {
          ...declaration,
          mount<TRow>(context: FeatureMountContext<TRow>) {
            const cleanup = declaration.mount?.(context);
            grid = context.state.get(GRID_FOCUS_MODEL);
            return cleanup;
          },
        };
      }
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(320);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
    const { host } = mountNative(() => h(FeatureUnionDemo));
    await tick();
    expect(grid?.value).toBeDefined();
    const root = find(host, '[data-demo-table="feature-union"]');
    find(root, part("find-button")).click();
    await tick();
    const input = find<HTMLInputElement>(root, part("find-input"));
    await write(input, "far-cell-120");
    expect(find(root, part("find-count")).textContent).toBe("1 of 1");
    const expected = {
      anchor: { row: 121, col: 19 },
      head: { row: 121, col: 19 },
    };
    expect(grid?.value?.range).toEqual(expected);
    expect(grid?.value?.cellAt("leaf-120", "metric-18")).toEqual({
      row: 121,
      col: 19,
    });
    expect(find(host, "#union-range").textContent).toBe("null");
    expect(grid?.value?.getCellProps({ row: 121, col: 19 })).toHaveProperty(
      "data-cell-selected",
      ""
    );

    find(root, part("export-csv-button")).click();
    await tick();
    expect(
      JSON.parse(find(host, "#union-export").textContent ?? "null")
    ).toEqual({
      scope: "range",
      rowIds: ["leaf-120"],
      columnKeys: ["metric-18"],
    });
    const scope = find<HTMLSelectElement>(host, "fieldset select");
    await write(scope, "page", "change");
    find(root, part("export-csv-button")).click();
    await tick();
    expect(
      JSON.parse(find(host, "#union-export").textContent ?? "null")
    ).toEqual({
      scope: "page",
      rowIds: ["source", "destination"],
      columnKeys: [
        "name",
        ...Array.from({ length: 24 }, (_, index) => `metric-${index}`),
        "tail",
      ],
    });
    expect(find(host, "#union-export-count").textContent).toBe("2");
    const rectangle = { anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } };
    grid?.value?.selectRange(rectangle);
    await tick();
    expect(
      JSON.parse(find(host, "#union-range").textContent ?? "null")
    ).toEqual(rectangle);
    grid?.value?.selectRange(expected);
    await tick();
    expect(grid?.value?.range).toEqual(expected);
    expect(find(host, "#union-range").textContent).toBe("null");
    expect(find(host, "#union-edit-count").textContent).toBe("0");
    expect(find(host, "#union-move-count").textContent).toBe("0");
  }, 10_000);
});
