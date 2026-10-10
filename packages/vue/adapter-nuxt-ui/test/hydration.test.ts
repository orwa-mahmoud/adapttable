import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

describe("Nuxt table hydration", () => {
  it.each([false, true])(
    "hydrates without replacing native model targets (mobile=%s)",
    async (mobile) => {
      const props = {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name", sortable: true }],
        rowKey: (row: { id: string; name: string }) => row.id,
        forceMobile: mobile,
        urlSync: false,
        dir: "rtl" as const,
        selectable: true,
        features: [densityChooser()],
      };
      const create = () =>
        createSSRApp({
          render: () => h(DataTable<{ id: string; name: string }>, props),
        }).use(ui);
      const root = document.createElement("div");
      root.innerHTML = await renderToString(create());
      document.body.append(root);
      const input = root.querySelector("input");
      const row = root.querySelector('[data-row-id="a"]');
      const densityOptions = Array.from(
        root.querySelectorAll(
          '[data-adapttable-part="density-toggle"] [role="radio"]'
        )
      );
      expect(densityOptions).toHaveLength(2);
      const warnings: string[] = [];
      const app = create();
      app.config.warnHandler = (message) => {
        warnings.push(message);
      };
      try {
        app.mount(root);
        await nextTick();
        await nextTick();
        expect(warnings).toEqual([]);
        expect(root.querySelector("input")).toBe(input);
        expect(root.querySelector('[data-row-id="a"]')).toBe(row);
        expect(
          Array.from(
            root.querySelectorAll(
              '[data-adapttable-part="density-toggle"] [role="radio"]'
            )
          )
        ).toEqual(densityOptions);
        expect(
          root.querySelectorAll('[data-adapttable-part="scroll-box"]')
        ).toHaveLength(1);
      } finally {
        app.unmount();
        root.remove();
      }
    }
  );
});
