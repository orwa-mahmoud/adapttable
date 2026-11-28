import { describe, expect, it } from "vitest";
import { h, nextTick } from "vue";

import DataTable from "../src/DataTable.vue";
import {
  filtersWith,
  rangeFilterWidget,
  textFilterWidget,
} from "../src/filters";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
  age: number;
}

async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
}

describe("Ant Design Vue filtersWith", () => {
  it("draws each field with the widget composed for its kind", async () => {
    const filters = filtersWith([textFilterWidget, rangeFilterWidget]);
    const { root } = mount(() =>
      h(DataTable<Row>, {
        data: [{ id: "a", name: "Ada", age: 36 }],
        columns: [{ key: "name", header: "Name" }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [
          filters<Row>([
            { key: "name", type: "text" },
            { key: "age", type: "numberRange" },
          ]),
        ],
      })
    );
    await tick();
    node<HTMLButtonElement>(
      root,
      'button[data-adapttable-part="filters-button"]'
    ).click();
    await tick();
    const form = node(document, '[data-adapttable-part="filters-form"]');
    expect(
      form.querySelectorAll('[data-adapttable-part="filter-field"]')
    ).toHaveLength(2);
    expect(
      form.querySelectorAll('[data-adapttable-part="filter-operator"]')
    ).toHaveLength(2);
  });
});
