import { useFrontendData } from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";
import { effectScope, h, shallowRef } from "vue";

import { DataTable } from "../src";
import { filters } from "../src/filters";
import {
  click,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns = [{ key: "name" }];

describe("Clear filters disabled state", () => {
  it.each(["popover", "drawer"] as const)(
    "follows accepted source state through empty, active, rejected and cleared %s filters",
    async (mode) => {
      const scope = effectScope();
      const source = scope.run(() =>
        useFrontendData<Row>({ data: rows, columns, urlSync: false })
      )!;
      const acceptClear = shallowRef(false);
      const clearExtras = vi.fn(() => {
        if (acceptClear.value) source.value.clearExtras();
      });
      const view = mountNative(() =>
        h(DataTable<Row>, {
          source: { ...source.value, clearExtras },
          columns,
          rowKey: (row) => row.id,
          urlSync: false,
          features: [filters<Row>([{ key: "name", type: "text" }], { mode })],
        })
      );
      try {
        await click(view.host, "filters-button");
        const surface = find(
          document.body,
          part(mode === "drawer" ? "filters-panel" : "filters-popover")
        );
        const clear = find<HTMLButtonElement>(surface, part("filters-clear"));
        const input = find<HTMLInputElement>(surface, 'input[type="text"]');
        expect(clear.disabled).toBe(true);
        clear.click();
        await tick();
        expect(clearExtras).not.toHaveBeenCalled();

        await write(input, "Ada");
        expect(source.value.extra.name).toBe("Ada");
        expect(clear.disabled).toBe(false);
        expect(find(view.host, part("filters-count")).textContent).toContain(
          "1"
        );
        clear.click();
        await tick();
        expect(clearExtras).toHaveBeenCalledTimes(1);
        expect(source.value.extra.name).toBe("Ada");
        expect(input.value).toBe("Ada");
        expect(clear.disabled).toBe(false);
        expect(find(view.host, part("filters-count")).textContent).toContain(
          "1"
        );

        acceptClear.value = true;
        clear.click();
        await tick();
        expect(clearExtras).toHaveBeenCalledTimes(2);
        expect(source.value.extra.name).toBeUndefined();
        expect(input.value).toBe("");
        expect(clear.disabled).toBe(true);
        expect(view.host.querySelector(part("filters-count"))).toBeNull();
        clear.click();
        await tick();
        expect(clearExtras).toHaveBeenCalledTimes(2);

        source.value.setFilterTree?.({
          combinator: "and",
          conditions: [{ key: "name", op: "contains", value: "Ada" }],
        });
        await tick();
        expect(clear.disabled).toBe(false);
        expect(find(view.host, part("filters-count")).textContent).toContain(
          "1"
        );
        clear.click();
        await tick();
        expect(source.value.filterTree).toBeUndefined();
        expect(clear.disabled).toBe(true);
        expect(clearExtras).toHaveBeenCalledTimes(3);
      } finally {
        view.stop();
        scope.stop();
      }
    }
  );
});
