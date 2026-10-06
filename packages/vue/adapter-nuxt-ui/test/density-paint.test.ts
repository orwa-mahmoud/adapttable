import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { TableDensity } from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}
function element(root: ParentNode, selector: string): HTMLElement {
  const target = root.querySelector<HTMLElement>(selector);
  if (!target) throw new Error(`Missing density paint target: ${selector}`);
  return target;
}
describe("Nuxt density presentation", () => {
  it("keeps the touch override at the same selector specificity as compact controls", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../src/DataTable.vue"),
      "utf8"
    );
    const coarse = source.slice(source.indexOf("@media (pointer: coarse)"));
    expect(coarse).toContain('.adapttable-nuxt button:not([role="checkbox"])');
    expect(coarse).toContain(
      '.adapttable-nuxt[data-density="compact"] button:not([role="checkbox"])'
    );
    expect(coarse).toContain("min-height: 2.75rem");
  });
  it.each([false, true])(
    "repaints native cells/cards and genuine controls without remount (mobile=%s)",
    async (mobile) => {
      const density = shallowRef<TableDensity>("comfortable");
      const root = document.createElement("div");
      document.body.append(root);
      const app = createApp({
        render: () =>
          h(DataTable<{ id: string; name: string }>, {
            data: [{ id: "a", name: "Ada" }],
            columns: [{ key: "name", sortable: true }],
            rowKey: (row) => row.id,
            selectable: true,
            urlSync: false,
            forceMobile: mobile,
            density: density.value,
            features: [densityChooser()],
          }),
      }).use(ui);
      try {
        app.mount(root);
        await settle();
        const row = element(root, '[data-row-id="a"]');
        const input = element(root, '[data-adapttable-part="search"]');
        const select = element(root, '[data-adapttable-part="density-toggle"]');
        const button = element(
          root,
          mobile
            ? '[data-adapttable-part="sort-direction"]'
            : '[data-adapttable-part="page-next"]'
        );
        const checkbox = element(row, 'button[role="checkbox"]');
        const controlClasses = [
          input.className,
          select.className,
          button.className,
          checkbox.className,
        ];
        const paint = element(
          row,
          mobile ? '[data-slot="body"]' : "td[data-column-key]"
        );
        const comfortablePaint = paint.className;
        density.value = "compact";
        await settle();
        expect(
          element(root, '[data-adapttable-part="root"]').dataset.density
        ).toBe("compact");
        expect(paint.className).not.toBe(comfortablePaint);
        expect(paint.classList.contains(mobile ? "p-3" : "py-1.5")).toBe(true);
        if (mobile) expect(paint.classList.contains("sm:p-3")).toBe(true);
        else {
          expect(paint.classList.contains("px-2")).toBe(true);
          expect(paint.classList.contains("text-xs")).toBe(true);
          expect(
            element(root, "th[data-column-key]").classList.contains("py-1.5")
          ).toBe(true);
        }
        [input, select, button, checkbox].forEach((target, index) =>
          expect(target.className).not.toBe(controlClasses[index])
        );
        expect(element(root, '[data-row-id="a"]')).toBe(row);
        expect(element(root, '[data-adapttable-part="search"]')).toBe(input);
        density.value = "comfortable";
        await settle();
        expect(paint.className).toBe(comfortablePaint);
        [input, select, button, checkbox].forEach((target, index) =>
          expect(target.className).toBe(controlClasses[index])
        );
      } finally {
        app.unmount();
        root.remove();
      }
    }
  );
});
