import type { FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it } from "vitest";
import { createSSRApp, h, nextTick, type VNodeChild } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { filters } from "../src/filters";
import { FilterHeaderControl, headerFilters } from "../src/header-filters";
import { node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";
interface Row {
  name: string;
}
function app(render: () => VNodeChild) {
  const value = createSSRApp({ render });
  value.provide(ID_INJECTION_KEY, { prefix: 5500, current: 0 });
  value.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return value;
}
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
describe("Element Plus header hydration", () => {
  for (const compact of [false, true]) {
    it(`hydrates and activates ${compact ? "compact choices" : "table header filters"} without mismatches`, async () => {
      const source: FilterFormSource<Row> = {
        extra: {},
        setExtra: () => undefined,
        setExtras: () => undefined,
      };
      const render = () =>
        compact
          ? h(FilterHeaderControl<Row>, {
              def: {
                key: "name",
                type: "multiSelect",
                label: "Name choices",
                options: [{ value: "Ada", label: "Ada" }],
              },
              source,
              labels: resolveLabels(undefined),
            })
          : h(DataTable<Row>, {
              data: [{ name: "Ada" }],
              columns: [{ key: "name" }],
              rowKey: (row) => row.name,
              urlSync: false,
              forceMobile: false,
              features: [
                filters<Row>([{ key: "name", type: "text" }]),
                headerFilters(),
              ],
            });
      const context: SSRContext = {};
      const root = document.createElement("div");
      root.innerHTML = await renderToString(app(render), context);
      const cleanup = installSsrTeleports(context);
      document.body.append(root);
      const client = app(render);
      const warnings: string[] = [];
      client.config.warnHandler = (message) => warnings.push(message);
      try {
        client.mount(root);
        await tick();
        const trigger = node<HTMLButtonElement>(
          root,
          `button[data-adapttable-part="${compact ? "filter-header-input" : "filter-header-trigger"}"]`
        );
        trigger.click();
        await tick();
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        const dialog = node(document, '[role="dialog"]');
        expect(dialog.getAttribute("aria-label")).toBe(
          compact ? "Name choices" : "Filters: Name"
        );
        expect(warnings).toEqual([]);
      } finally {
        client.unmount();
        root.remove();
        cleanup();
      }
    });
  }
});
