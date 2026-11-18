import { describe, expect, it } from "vitest";
import { h } from "vue";

import { DataTable } from "../src";
import {
  filtersWith,
  rangeFilterWidget,
  textFilterWidget,
} from "../src/filters";
import { find, mount, part, type Row, rows, tick } from "./filter-helpers";

describe("Naive filtersWith", () => {
  it("draws each field with the widget composed for its kind", async () => {
    const filters = filtersWith([textFilterWidget, rangeFilterWidget]);
    const view = mount(() =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        features: [
          filters<Row>([
            { key: "name", type: "text" },
            { key: "amount", type: "numberRange" },
          ]),
        ],
      })
    );
    find(view.host, part("filters-button")).click();
    await tick();
    const form = find(document.body, part("filters-form"));
    expect(form.querySelectorAll(part("filter-field"))).toHaveLength(2);
    expect(form.querySelectorAll(part("filter-operator"))).toHaveLength(2);
  });
});
