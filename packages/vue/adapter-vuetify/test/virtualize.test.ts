import { mount } from "@vue/test-utils";
import { afterEach, expect, it } from "vitest";
import { nextTick } from "vue";
import { createVuetify } from "vuetify/framework";

import { DataTable } from "../src";
import { pinnedSummaryRows } from "../src/pinned-summary-rows";
import { virtualize } from "../src/virtualize";
interface HierarchyRow {
  id: string;
  name: string;
  score: number;
}
const wrappers: ReturnType<typeof mount>[] = [];
const native = {
  attachTo: document.body,
  global: { plugins: [createVuetify({ ssr: true })] },
};
const common = {
  columns: [{ key: "name" }, { key: "score" }],
  rowKey: (row: HierarchyRow) => row.id,
  urlSync: false,
  searchable: false,
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

it.each([false, true])(
  "windows actual row targets while preserving pinned summaries, mobile=%s",
  async (mobile) => {
    const height = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight"
    );
    const width = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetWidth"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 300;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
    const rows = Array.from({ length: 80 }, (_, index) => ({
      id: String(index),
      name: `Row ${index}`,
      score: index,
    }));
    try {
      const wrapper = mount(DataTable<HierarchyRow>, {
        ...native,
        props: {
          ...common,
          data: rows,
          forceMobile: mobile,
          paginationMode: "infinite",
          defaults: { limit: 100 },
          features: [
            virtualize({
              maxHeight: 300,
              estimateRowSize: 48,
              estimateCardSize: 100,
              virtualOverscan: 1,
            }),
            pinnedSummaryRows<HierarchyRow>({
              top: [{ id: "summary", name: "Total", score: 80 }],
            }),
          ],
        },
      });
      wrappers.push(wrapper);
      await settle();
      expect(wrapper.findAll(part("virtual-spacer"))).toHaveLength(2);
      expect(
        wrapper.findAll(part(mobile ? "card" : "row")).length
      ).toBeLessThan(80);
      expect(
        wrapper.findAll(part(mobile ? "card" : "row")).length
      ).toBeGreaterThan(0);
      expect(wrapper.get(part("pinned-summary-top")).text()).toContain("Total");
      expect(wrapper.get(part("scroll-box")).attributes("style")).toContain(
        "max-height: 300px"
      );
      expect(rows).toHaveLength(80);
      wrapper.unmount();
      wrappers.pop();
      await settle();
    } finally {
      if (height)
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", height);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
      if (width)
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
    }
  }
);
