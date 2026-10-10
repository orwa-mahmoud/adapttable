import ui from "@nuxt/ui/vue-plugin";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { rowDetail } from "../src/row-detail";
import { statusBar } from "../src/status-bar";
import { virtualize } from "../src/virtualize";

interface Row {
  id: string;
  name: string;
}
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.unstubAllGlobals();
});
async function settle() {
  await nextTick();
  await nextTick();
  await nextTick();
}
it("keeps one virtual scroll owner through measured details, reorder, and mobile replacement", async () => {
  const observed = new Set<Element>();
  const unobserved = new Set<Element>();
  class Observer {
    readonly targets = new Set<Element>();
    observe(target: Element) {
      this.targets.add(target);
      observed.add(target);
    }
    unobserve(target: Element) {
      this.targets.delete(target);
      unobserved.add(target);
    }
    disconnect() {
      for (const target of this.targets) unobserved.add(target);
      this.targets.clear();
    }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.getAttribute("data-adapttable-part") === "scroll-box"
        ? 200
        : 32;
    }
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(640);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const height =
        this.getAttribute("data-adapttable-part") === "detail-row" ? 48 : 32;
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 640,
        bottom: height,
        width: 640,
        height,
        toJSON: () => ({}),
      };
    }
  );
  const rows = Array.from({ length: 60 }, (_, i) => ({
    id: String(i),
    name: "Person " + i,
  }));
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns: [{ key: "name", header: "Name" }],
    rowKey: (row) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    paginationMode: "infinite",
    features: [
      virtualize({
        maxHeight: 200,
        estimateRowSize: 32,
        estimateCardSize: 32,
        virtualOverscan: 1,
      }),
      cellNavigation(),
      statusBar(),
      rowDetail<Row>((row) => h("p", "Detail " + row.name), ["0"]),
    ],
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render: () => h(DataTable<Row>, props.value) }).use(
    ui
  );
  app.mount(root);
  cleanups.push(() => {
    app.unmount();
    root.remove();
  });
  await settle();
  expect(
    root.querySelectorAll('[data-adapttable-part="scroll-box"]')
  ).toHaveLength(1);
  const count = root.querySelectorAll("tbody [data-row-id]").length;
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(rows.length);
  const detail = root.querySelector('[data-adapttable-part="detail-row"]');
  if (!detail) throw new Error("Missing expanded virtual detail");
  expect(observed.has(detail)).toBe(true);
  props.value = { ...props.value, data: [...rows].reverse() };
  await settle();
  expect(unobserved.has(detail)).toBe(true);
  props.value = { ...props.value, forceMobile: true };
  await settle();
  expect(root.querySelector("table")).toBeNull();
  expect(
    root.querySelectorAll('[data-adapttable-part="scroll-box"]')
  ).toHaveLength(1);
  expect(root.querySelectorAll("article[data-row-id]").length).toBeGreaterThan(
    0
  );
  expect(root.querySelector('[role="grid"]')).toBeNull();
  props.value = { ...props.value, features: [] };
  await settle();
  expect(
    root.querySelectorAll('[data-adapttable-part="virtual-spacer"]')
  ).toHaveLength(0);
});
