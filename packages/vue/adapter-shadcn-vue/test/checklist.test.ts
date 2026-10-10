import type { FilterDef } from "@adapttable/vue";
import type { ChecklistFilterProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { ChecklistFilter } from "../src/filters/ChecklistFilter";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [
  { id: "one", name: "Ada" },
  { id: "two", name: "Grace" },
];
const def: FilterDef<Row> = { key: "name", type: "checklist" };
const props: ChecklistFilterProps<Row> = {
  def,
  source: { extra: {}, setExtra: vi.fn(), allFilteredRows: rows },
  classNames: {
    filterCheckbox: "choice-host",
    filterChecklistSearch: "search-target",
  },
};

describe("generic checklist presentation", () => {
  it("renders the binding-owned checklist through typed shadcn controls", async () => {
    const app = createSSRApp({
      render: () => h(ChecklistFilter<Row>, { ...props, id: "checklist-root" }),
    });
    const html = await renderToString(app);
    expect(html).toContain('id="checklist-root"');
    expect(html).toContain('data-slot="checkbox"');
    expect(html).toContain('data-slot="input"');
    expect(html).toContain("Ada");
    expect(html).toContain("Grace");
    expect(html).toContain("choice-host");
    expect(html).toContain("search-target");
  });
});
