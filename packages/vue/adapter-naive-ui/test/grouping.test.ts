import type { ColumnDef } from "@adapttable/vue";
import { h, shallowRef } from "vue";

import { DataTable } from "../src";
import { grouping } from "../src/grouping";
import { find, mount, part, tick } from "./filter-helpers";

interface Row {
  id: string;
  team: string;
  amount: number;
}
const data: Row[] = [
  { id: "1", team: "A", amount: 2 },
  { id: "2", team: "A", amount: 3 },
  { id: "3", team: "B", amount: 4 },
];
const columns: ColumnDef<Row>[] = [{ key: "team" }, { key: "amount" }];
it.each([false, true])(
  "renders and collapses grouping with genuine Naive controls in mobile=%s",
  async (forceMobile) => {
    const view = mount(() =>
      h(DataTable<Row>, {
        data,
        columns,
        rowKey: (row) => row.id,
        forceMobile,
        selectable: true,
        urlSync: false,
        features: [grouping("team")],
      })
    );
    await tick();
    const toggle = find<HTMLButtonElement>(view.host, part("group-toggle"));
    expect(toggle.classList.contains("n-button")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      find(view.host, part("group-select")).classList.contains("n-checkbox")
    ).toBe(true);
    expect(view.host.querySelectorAll('[data-row-id="1"]')).toHaveLength(1);
    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(view.host.querySelector('[data-row-id="1"]')).toBeNull();
    toggle.click();
    await tick();
    expect(view.host.querySelector('[data-row-id="1"]')).not.toBeNull();
  }
);

it.each([false, true])(
  "pages and selects all group leaves through Naive controls in mobile=%s",
  async (forceMobile) => {
    const selected = shallowRef<string[]>([]);
    const view = mount(() =>
      h(DataTable<Row>, {
        data,
        columns,
        rowKey: (row) => row.id,
        forceMobile,
        selectable: true,
        selectedIds: selected.value,
        "onUpdate:selectedIds": (ids) => {
          selected.value = ids;
        },
        urlSync: false,
        features: [
          grouping("team", { groupRowPageSize: 1, groupFooters: true }),
        ],
      })
    );
    await tick();
    expect(view.host.querySelector('[data-row-id="2"]')).toBeNull();
    const checkbox = find<HTMLElement>(view.host, part("group-select"));
    checkbox.click();
    await tick();
    expect(selected.value).toEqual(["1", "2"]);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    const more = find<HTMLButtonElement>(view.host, part("group-more"));
    expect(more.classList.contains("n-button")).toBe(true);
    expect(more.textContent?.trim()).toBeTruthy();
    more.click();
    await tick();
    expect(view.host.querySelector('[data-row-id="2"]')).not.toBeNull();
    expect(view.host.querySelector(part("group-more"))).toBeNull();
  }
);
