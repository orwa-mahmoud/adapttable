import { describe, expect, it } from "vitest";
import { h } from "vue";

import { DataTable } from "../src";
import {
  filtersWith,
  rangeFilterWidget,
  textFilterWidget,
} from "../src/filters";
import { click, find, mountNative, part } from "./filter-editing-helpers";

interface Row {
  id: string;
  name: string;
  amount: number;
}

describe("unstyled filtersWith", () => {
  it("draws each field with the widget composed for its kind", async () => {
    const filters = filtersWith([textFilterWidget, rangeFilterWidget]);
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: [{ id: "1", name: "Ada", amount: 2 }],
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
    await click(view.host, "filters-button");
    const form = find(document.body, part("filters-form"));
    expect(form.querySelectorAll(part("filter-field"))).toHaveLength(2);
    expect(form.querySelectorAll(part("filter-operator"))).toHaveLength(2);
  });
});
