// @vitest-environment node
import type { FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { filters } from "../src/filters";
import { FilterHeaderControl, headerFilters } from "../src/header-filters";
interface Row {
  name: string;
}
const rows: Row[] = [{ name: "Ada" }];
function seeded(app: ReturnType<typeof createSSRApp>) {
  return app;
}
describe("Ant Design Vue header filter Node SSR", () => {
  it("renders the native funnel with no browser-only popup", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = await renderToString(
      seeded(
        createSSRApp(() =>
          h(DataTable<Row>, {
            data: rows,
            columns: [{ key: "name" }],
            rowKey: (row) => row.name,
            urlSync: false,
            forceMobile: false,
            features: [
              filters<Row>([{ key: "name", type: "text" }]),
              headerFilters(),
            ],
          })
        )
      )
    );
    expect(html).toMatch(
      /<button[^>]*data-adapttable-part="filter-header-trigger"/
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-adapttable-part="filter-header-cell"');
  });
  it("renders actual compact kit fields over the supplied source", async () => {
    const source: FilterFormSource<Row> = {
      extra: { name: "Ada" },
      setExtra: () => undefined,
      setExtras: () => undefined,
    };
    const html = await renderToString(
      seeded(
        createSSRApp(() =>
          h("section", [
            h(FilterHeaderControl<Row>, {
              def: { key: "name", type: "text", label: "Name" },
              source,
              labels: resolveLabels(undefined),
            }),
            h(FilterHeaderControl<Row>, {
              def: {
                key: "name",
                type: "multiSelect",
                label: "Choices",
                options: [{ value: "Ada", label: "Ada" }],
              },
              source,
              labels: resolveLabels(undefined),
            }),
          ])
        )
      )
    );
    expect(html).toMatch(
      /<input(?=[^>]*data-adapttable-part="filter-header-input")(?=[^>]*value="Ada")[^>]*>/
    );
    expect(html).toContain('aria-label="Name"');
    expect(html).toMatch(
      /<button[^>]*data-adapttable-part="filter-header-input"/
    );
    expect(html).not.toContain('data-adapttable-part="filter-header-menu"');
  });
});
