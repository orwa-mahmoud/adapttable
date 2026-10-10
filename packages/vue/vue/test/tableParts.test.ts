import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { mergeVueAttrs } from "../src/attrs";
import type { ColumnInput } from "../src/columnDef";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeClassNames,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  name: string;
  score: number;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", score: 2 },
  { id: "b", name: "Bea", score: 1 },
];
const columns: readonly ColumnInput<Row>[] = [
  { key: "name", sortable: true },
  { key: "score", sortable: true },
];
const classNames: TableChromeClassNames = {
  table: "kit-table",
  thead: "kit-thead",
  tbody: "kit-tbody",
  tr: "kit-row",
  th: "kit-head",
  td: "kit-cell",
  sortButton: "kit-sort",
  selectionHeader: "kit-selection-head",
  selectionCell: "kit-selection-cell",
  selectionCheckbox: "kit-checkbox",
  columnGroup: "kit-group",
  cards: "kit-cards",
  card: "kit-card",
  cardFields: "kit-fields",
  cardRow: "kit-card-row",
  cardLabel: "kit-label",
  cardValue: "kit-value",
};
const releases: (() => void)[] = [];
afterEach(() => {
  for (const release of releases.splice(0)) release();
});
function part(
  root: HTMLElement,
  name: string,
  tag: string,
  className: string
): HTMLElement {
  const elements = [
    ...root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
  ];
  expect(elements.length, name).toBeGreaterThan(0);
  for (const element of elements) {
    expect(element.tagName, name).toBe(tag.toUpperCase());
    expect(element.classList.contains(className), name).toBe(true);
  }
  return elements[0]!;
}

it.each(["first", "second"])(
  "places canonical basic and mobile parts on semantic targets with kit %s",
  async (kit) => {
    const mobile = shallowRef(false);
    const sortHost = vi.fn();
    const tableClick = vi.fn();
    const cellEnter = vi.fn();
    const ref = vi.fn();
    const slots: TableChromeSlots<Row> = {
      SortButton: (props) =>
        h(
          "button",
          mergeVueAttrs(props.attrs, {
            class: `host-${kit}`,
            onClick: sortHost,
            "data-kit": kit,
          }),
          [props.content]
        ),
      SelectionCheckbox: (props) => h("input", props.attrs),
    };
    const root = document.createElement("div");
    const app = createApp({
      setup() {
        const shell = useDataTableShell({
          data,
          columns,
          rowKey: (row) => row.id,
          selectable: true,
          forceMobile: mobile,
          urlSync: false,
        });
        return () => {
          if (mobile.value)
            return MobileCardsChrome({
              model: shell.mobile.value,
              slots,
              classNames,
            });
          const model = shell.desktop.value;
          return DesktopTableChrome({
            model: {
              ...model,
              attrs: {
                ...model.attrs,
                id: "people",
                tabindex: 0,
                "aria-describedby": "help",
                onClick: tableClick,
                ref,
              },
              headerRowAttrs: {
                ...model.headerRowAttrs,
                "data-host-header": "kept",
              },
              rows: model.rows.map((row) => ({
                ...row,
                cells: row.cells.map((cell) => ({
                  ...cell,
                  attrs: {
                    ...cell.attrs,
                    "data-host-cell": "kept",
                    onMouseenter: cellEnter,
                  },
                })),
              })),
            },
            slots,
            classNames,
          });
        };
      },
    });
    app.mount(root);
    releases.push(() => app.unmount());
    const table = part(root, "table", "table", "kit-table");
    part(root, "thead", "thead", "kit-thead");
    part(root, "tbody", "tbody", "kit-tbody");
    const headerRow = part(root, "header-row", "tr", "kit-row");
    const header = part(root, "header-cell", "th", "kit-head");
    const row = part(root, "row", "tr", "kit-row");
    const cell = part(root, "cell", "td", "kit-cell");
    part(root, "selection-header", "th", "kit-selection-head");
    part(root, "selection-cell", "td", "kit-selection-cell");
    const checkbox = part(
      root,
      "checkbox",
      "input",
      "kit-checkbox"
    ) as HTMLInputElement;
    const sort = part(root, "sort-button", "button", "kit-sort");
    expect(table.id).toBe("people");
    expect(table.tabIndex).toBe(0);
    expect(table.getAttribute("aria-describedby")).toBe("help");
    expect(ref).toHaveBeenCalledWith(table, expect.any(Object));
    expect(headerRow.getAttribute("data-host-header")).toBe("kept");
    expect(header.getAttribute("scope")).toBe("col");
    expect(header.getAttribute("role")).toBe("columnheader");
    expect(row.getAttribute("role")).toBe("row");
    expect(cell.getAttribute("role")).toBe("cell");
    expect(cell.getAttribute("data-host-cell")).toBe("kept");
    cell.dispatchEvent(new MouseEvent("mouseenter"));
    expect(cellEnter).toHaveBeenCalledOnce();
    expect(sort.classList.contains(`host-${kit}`)).toBe(true);
    expect(sort.getAttribute("data-kit")).toBe(kit);
    sort.click();
    await nextTick();
    expect(sortHost).toHaveBeenCalledOnce();
    expect(tableClick).toHaveBeenCalledOnce();
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await nextTick();
    expect(root.querySelectorAll("tbody input:checked")).toHaveLength(2);
    mobile.value = true;
    await nextTick();
    part(root, "cards", "div", "kit-cards");
    part(root, "card", "article", "kit-card");
    const fields = root.querySelectorAll("dl.kit-fields");
    expect(fields).toHaveLength(data.length);
    for (const field of fields)
      expect(field.hasAttribute("data-adapttable-part")).toBe(false);
    expect(
      root.querySelector('[data-adapttable-part="card-fields"]')
    ).toBeNull();
    part(root, "card-row", "div", "kit-card-row");
    part(root, "card-label", "dt", "kit-label");
    part(root, "card-value", "dd", "kit-value");
    part(root, "checkbox", "input", "kit-checkbox");
    for (const field of root.querySelectorAll(
      '[data-adapttable-part="card-row"]'
    )) {
      expect([...field.children].map((child) => child.tagName)).toEqual([
        "DT",
        "DD",
      ]);
      expect(field.parentElement?.tagName).toBe("DL");
    }
    expect(ref).toHaveBeenLastCalledWith(null, expect.any(Object));
  }
);

it("distinguishes spanning group bands from the leaf header row", () => {
  const grouped: readonly ColumnInput<Row>[] = [
    { header: "Person", children: columns },
  ];
  const root = document.createElement("div");
  const app = createApp({
    setup() {
      const shell = useDataTableShell({
        data,
        columns: grouped,
        rowKey: (row) => row.id,
        urlSync: false,
      });
      const slots: TableChromeSlots<Row> = {
        SortButton: (props) => h("button", props.attrs, [props.content]),
        SelectionCheckbox: (props) => h("input", props.attrs),
      };
      return () =>
        DesktopTableChrome({ model: shell.desktop.value, slots, classNames });
    },
  });
  app.mount(root);
  releases.push(() => app.unmount());
  const group = part(root, "header-group-cell", "th", "kit-group");
  part(root, "header-group-row", "tr", "kit-row");
  part(root, "header-row", "tr", "kit-row");
  part(root, "header-cell", "th", "kit-head");
  expect(group.getAttribute("scope")).toBe("colgroup");
  expect(group.getAttribute("colspan")).toBe("2");
  expect(
    [...root.querySelectorAll("thead tr")].map((row) =>
      row.getAttribute("data-adapttable-part")
    )
  ).toEqual(["header-group-row", "header-row"]);
});
