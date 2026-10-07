import * as binding from "@adapttable/vue/features";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { DataTable, FilterHeaderControl, FilterHeaderRow } from "../src";
import { collapsibleColumnGroups } from "../src/column-groups";
import { fitColumns } from "../src/fit-columns";
import {
  FilterHeaderControl as HeaderControl,
  FilterHeaderRow as HeaderRow,
} from "../src/header-filters";
import { multiSort } from "../src/multi-sort";
import { resizableColumns } from "../src/resizable-columns";
import { virtualize } from "../src/virtualize";
import { mount, node } from "./mount";
interface Row {
  id: string;
  name: string;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function measuredViewport() {
  const observed = new Set<Element>();
  class Observer {
    readonly targets = new Set<Element>();
    observe(target: Element) {
      this.targets.add(target);
      observed.add(target);
    }
    unobserve(target: Element) {
      this.targets.delete(target);
      observed.delete(target);
    }
    disconnect() {
      for (const target of this.targets) observed.delete(target);
      this.targets.clear();
    }
  }
  // Only missing browser layout/observation is supplied; the binding owns windowing.
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.dataset.adapttablePart === "scroll-box" ? 240 : 56;
    }
  );
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(640);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(640);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return new DOMRect(
        0,
        0,
        640,
        this.dataset.adapttablePart === "scroll-box" ? 240 : 56
      );
    }
  );
  return observed;
}
describe("Element Plus canonical public entries", () => {
  it("keeps binding factory and root header-control identities", () => {
    expect(collapsibleColumnGroups).toBe(binding.collapsibleColumnGroups);
    expect(fitColumns).toBe(binding.fitColumns);
    expect(multiSort).toBe(binding.multiSort);
    expect(resizableColumns).toBe(binding.resizableColumns);
    expect(virtualize).toBe(binding.virtualize);
    expect(FilterHeaderControl).toBe(HeaderControl);
    expect(FilterHeaderRow).toBe(HeaderRow);
  });
  for (const mobile of [false, true]) {
    it(`uses the existing native viewport and real kit rows for binding-owned windowing, mobile=${mobile}`, async () => {
      const observed = measuredViewport();
      const active = shallowRef(true);
      const data = Array.from({ length: 120 }, (_, index) => ({
        id: `row-${index}`,
        name: `Name ${index}`,
      }));
      const feature = virtualize({
        maxHeight: 240,
        estimateRowSize: 56,
        estimateCardSize: 56,
        virtualOverscan: 2,
      });
      const view = mount(() =>
        h(DataTable<Row>, {
          data,
          columns: [{ key: "name" }],
          rowKey: (row) => row.id,
          forceMobile: mobile,
          urlSync: false,
          searchable: false,
          defaults: { limit: 120 },
          paginationMode: "infinite",
          features: active.value ? [feature] : [],
          classNames: { virtualSpacer: "host-spacer" },
        })
      );
      await tick();
      const viewport = node<HTMLElement>(view.root, part("scroll-box"));
      expect(viewport.style.overflow).toBe("auto");
      const rowSelector = mobile
        ? `${part("card")}[data-row-id]`
        : "tbody [data-row-id]";
      const visible = view.root.querySelectorAll<HTMLElement>(rowSelector);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.length).toBeLessThan(20);
      const first = visible[0];
      if (!first) throw new Error("Missing visible row");
      expect(first.getAttribute("data-row-id")).toBe("row-0");
      if (mobile) expect(first.classList.contains("el-card")).toBe(true);
      const spacers = [
        ...view.root.querySelectorAll<HTMLElement>(part("virtual-spacer")),
      ];
      expect(spacers).toHaveLength(2);
      for (const spacer of spacers) {
        expect(spacer.tagName).toBe(mobile ? "DIV" : "TR");
        expect(spacer.classList.contains("host-spacer")).toBe(true);
        expect(spacer.getAttribute("aria-hidden")).toBe("true");
      }
      const bottom = spacers[1];
      if (!bottom) throw new Error("Missing trailing spacer");
      expect(
        Number.parseFloat(
          (mobile ? bottom : node<HTMLElement>(bottom, "td")).style.height
        )
      ).toBeGreaterThan(0);
      active.value = false;
      await tick();
      expect(view.root.querySelectorAll(rowSelector)).toHaveLength(120);
      expect(node(view.root, part("scroll-box"))).toBe(viewport);
      expect(
        [...observed].filter((target) => target.hasAttribute("data-row-id"))
      ).toEqual([]);
      view.unmount();
      await tick();
      expect(
        [...observed].filter(
          (target) =>
            target.hasAttribute("data-row-id") ||
            target.getAttribute("data-adapttable-part") === "scroll-box"
        )
      ).toEqual([]);
    });
  }
});
