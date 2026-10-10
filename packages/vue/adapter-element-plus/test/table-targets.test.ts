import type { ColumnDef } from "@adapttable/vue";
import {
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import { elementButton } from "../src/controls/button";
import { elementSelectionCheckbox } from "../src/controls/checkbox";
import { ElementMobileCards } from "../src/presentation/ElementMobileCards";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada" }];
const columns: readonly ColumnDef<Row>[] = [{ key: "name" }];
const controls: TableChromeSlots<Row> = {
  SortButton: ({ attrs, content }) => elementButton(attrs, content),
  SelectionCheckbox: elementSelectionCheckbox,
};

describe("Element Plus mobile semantic targets", () => {
  it("forwards row measurement to the real ElCard root and cell refs to native values", async () => {
    const rowRefs: unknown[] = [];
    const cellRefs: unknown[] = [];
    const App = defineComponent({
      setup() {
        const shell = useDataTableShell<Row>(() => ({
          data: rows,
          columns,
          rowKey: (row) => row.id,
          forceMobile: true,
          urlSync: false,
        }));
        return () =>
          h(ElementMobileCards<Row>, {
            controls,
            model: {
              ...shell.mobile.value,
              rows: shell.mobile.value.rows.map((row) => ({
                ...row,
                attrs: {
                  ...row.attrs,
                  ref: (element: unknown) => rowRefs.push(element),
                },
                cells: row.cells.map((cell) => ({
                  ...cell,
                  attrs: {
                    ...cell.attrs,
                    ref: (element: unknown) => cellRefs.push(element),
                    "data-host-value": "name",
                  },
                })),
              })),
            },
          });
      },
    });
    const { root, unmount } = mount(() => h(App));
    await nextTick();
    const card = node<HTMLElement>(
      root,
      '.el-card[data-adapttable-part="card"]'
    );
    const value = node<HTMLElement>(root, 'dd[data-host-value="name"]');
    expect(rowRefs.at(-1)).toBe(card);
    expect(cellRefs.at(-1)).toBe(value);
    expect(value.textContent).toBe("Ada");
    unmount();
    expect(rowRefs.at(-1)).toBeNull();
    expect(cellRefs.at(-1)).toBeNull();
  });
});
