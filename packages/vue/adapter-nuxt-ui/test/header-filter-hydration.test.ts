import type { FilterFormSource } from "@adapttable/vue";
import {
  provideDataTableClassNames,
  resolveLabels,
} from "@adapttable/vue/adapter";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { FilterHeaderControl, NuxtHeaderFilter } from "../src/header-filters";

interface Row {
  name: string;
}
const labels = resolveLabels(undefined);
const source: FilterFormSource<Row> = {
  extra: {},
  setExtra: () => undefined,
  setExtras: () => undefined,
  allFilteredRows: [{ name: "Ada" }],
};
it.each(["popover", "text", "multiSelect"] as const)(
  "hydrates a genuine %s header control without replacing its native element",
  async (mode) => {
    const app = () =>
      createSSRApp({
        setup() {
          provideDataTableClassNames(() => ({}));
          return () =>
            h(UApp, { dir: "rtl", toaster: null }, () =>
              mode === "popover"
                ? h(NuxtHeaderFilter<Row>, {
                    def: { key: "name", type: "text" },
                    source,
                    labels,
                    dir: "rtl",
                  })
                : h(FilterHeaderControl<Row>, {
                    def: {
                      key: "name",
                      type: mode,
                      options: [{ value: "Ada", label: "Ada" }],
                    },
                    source,
                    labels,
                    dir: "rtl",
                  })
            );
        },
      }).use(ui);
    const root = document.createElement("div");
    root.innerHTML = await renderToString(app());
    document.body.append(root);
    let selector = '[role="combobox"]';
    if (mode === "popover")
      selector = '[data-adapttable-part="filter-header-trigger"]';
    if (mode === "text") selector = "input";
    const original = root.querySelector(selector);
    expect(original).not.toBeNull();
    const client = app();
    try {
      client.mount(root);
      await nextTick();
      await nextTick();
      expect(root.querySelector(selector)).toBe(original);
    } finally {
      client.unmount();
      root.remove();
    }
  }
);
