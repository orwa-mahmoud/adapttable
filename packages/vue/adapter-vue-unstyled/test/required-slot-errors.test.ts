import { columnMenu as bindingColumnMenu } from "@adapttable/vue/column-menu";
import { describe, expect, it } from "vitest";
import { defineComponent, h, onErrorCaptured, shallowRef } from "vue";

import { DataTable } from "../src";
import { columnMenu } from "../src/column-menu";
import { mountNative, part, tick } from "./filter-editing-helpers";

const expected =
  'AdaptTable: feature "column-menu" requires the adapter control slot "column-menu".';
interface Row {
  id: string;
  name: string;
}
const base = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
};

describe("required control slot errors at a Vue error boundary", () => {
  for (const initiallyIncomplete of [true, false]) {
    it(`preserves the required-slot error when ${initiallyIncomplete ? "mounting" : "replacing"} an incomplete kit`, async () => {
      const incomplete = shallowRef(initiallyIncomplete);
      const errors: string[] = [];
      const message = shallowRef("");
      const Boundary = defineComponent({
        setup() {
          onErrorCaptured((error) => {
            const text = error instanceof Error ? error.message : String(error);
            errors.push(text);
            message.value = text;
            return false;
          });
          return () =>
            h("section", [
              h(DataTable<Row>, {
                ...base,
                features: [
                  incomplete.value ? bindingColumnMenu() : columnMenu(),
                ],
              }),
              h("p", { role: "alert" }, message.value),
            ]);
        },
      });
      const { host } = mountNative(() => h(Boundary));
      await tick();
      if (!initiallyIncomplete) {
        expect(errors).toEqual([]);
        expect(host.querySelector(part("column-menu-button"))).not.toBeNull();
        incomplete.value = true;
        await tick();
      }
      expect(host.querySelector('[role="alert"]')?.textContent).toBe(expected);
      expect(host.querySelector(part("column-menu-button"))).toBeNull();
      expect(host.querySelector(part("column-menu-panel"))).toBeNull();
      incomplete.value = false;
      await tick();
      expect(host.querySelector(part("column-menu-button"))).not.toBeNull();
      expect(host.querySelector('[role="alert"]')?.textContent).toBe(expected);
      expect(errors.every((message) => message === expected)).toBe(true);
    });
  }
});
