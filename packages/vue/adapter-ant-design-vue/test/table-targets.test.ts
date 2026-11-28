import type { ColumnDef, TableRowModel } from "@adapttable/vue";
import {
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import { antdButton } from "../src/controls/button";
import { antdSelectionCheckbox } from "../src/controls/checkbox";
import { AntdMobileCards } from "../src/presentation/AntdMobileCards";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada" }];
const columns: readonly ColumnDef<Row>[] = [{ key: "name" }];
const controls: TableChromeSlots<Row> = {
  SortButton: ({ attrs, content }) => antdButton(attrs, content),
  SelectionCheckbox: antdSelectionCheckbox,
};

describe("Ant Design Vue mobile semantic targets", () => {
  it.each([false, true])(
    "labels a prepared column by key when custom body is %s",
    async (custom) => {
      const row: TableRowModel<Row> = {
        key: "a",
        row: rows[0]!,
        index: 0,
        attrs: { "data-adapttable-part": "card" },
        cells: [
          {
            key: "name",
            attrs: {},
            context: {
              row: rows[0]!,
              rowIndex: 0,
              column: { key: "name" },
              value: "Ada",
            },
          },
        ],
      };
      const paint: TableChromeSlots<Row> = {
        ...controls,
        card: custom
          ? ({ fields }) =>
              h(
                "div",
                fields.map((field) => h("p", [field.label, field.value]))
              )
          : undefined,
      };
      const { root } = mount(() =>
        AntdMobileCards<Row>({
          model: {
            attrs: { role: "list" },
            rows: [row],
            summary: undefined,
            bodySlots: undefined,
          },
          controls: paint,
        })
      );
      await nextTick();
      expect(root.textContent).toContain("nameAda");
    }
  );

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
          h(AntdMobileCards<Row>, {
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
      '.ant-card[data-adapttable-part="card"]'
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
