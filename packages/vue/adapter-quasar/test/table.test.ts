import type {
  ColumnDef,
  DesktopTableModel,
  MobileCardsModel,
  TableRowModel,
} from "@adapttable/vue";
import {
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QCard, QMarkupTable, QTable, QTd, QTh, QTr, Quasar } from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Comment,
  defineComponent,
  Fragment,
  h,
  nextTick,
  ref,
  shallowRef,
  Text,
} from "vue";

import { DataTable } from "../src";
import QuasarButton from "../src/controls/QuasarButton.vue";
import { grouping } from "../src/grouping";
import { rowActions } from "../src/row-actions";
import { quasarTableControls } from "../src/table/controls";
import { QuasarDesktop } from "../src/table/desktop";
import { quasarLoading } from "../src/table/loading";
import { QuasarMobile } from "../src/table/mobile";
import QuasarRowActions from "../src/table/QuasarRowActions.vue";

interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: Row[] = [
  { id: "b", name: "Bea", score: 2 },
  { id: "a", name: "Ada", score: 1 },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score" },
];
const wrappers: ReturnType<typeof mount>[] = [];
const host: typeof mount = (component, options) => {
  const wrapper = mount(component, {
    ...options,
    attachTo: document.body,
    global: { plugins: [Quasar] },
  });
  wrappers.push(wrapper);
  return wrapper;
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
});
const settle = async () => {
  await nextTick();
  await nextTick();
};
const controls = quasarTableControls<Row>();
function preparedModel(
  refs: Record<string, (node: Element | null) => void> = {}
): DesktopTableModel<Row> {
  const wire = (row: Row, index: number): TableRowModel<Row> => ({
    key: row.id,
    row,
    index,
    attrs: {
      id: `row-${row.id}`,
      "data-adapttable-part": "row",
      role: "row",
      ref: refs.row,
    },
    checkboxAttrs: {
      checked: false,
      onChange: vi.fn(),
      "aria-label": `Select ${row.name}`,
    },
    cells: columns.map((column) => ({
      key: column.key,
      attrs: {
        "data-column-key": column.key,
        ref: refs.cell,
        style: { width: 160 },
      },
      context: {
        row,
        rowIndex: index,
        column,
        value: column.key === "name" ? row.name : row.score,
      },
    })),
  });
  return {
    attrs: {
      role: "table",
      "aria-label": "People",
      dir: "rtl",
      "aria-rowcount": 3,
      ref: refs.table,
    },
    headerRowAttrs: { role: "row", ref: refs.headerRow },
    headers: columns.map((column) => ({
      key: column.key,
      column,
      attrs: { scope: "col", role: "columnheader", ref: refs.header },
      sortAttrs: column.sortable
        ? { "aria-label": `Sort ${column.header}`, onClick: vi.fn() }
        : undefined,
      context: {
        column,
        label: column.header ?? column.key,
        sortDir: undefined,
        sortIndex: undefined,
        toggleSort: vi.fn(),
      },
    })),
    rows: rows.map(wire),
    columnCount: 3,
    headerCheckboxAttrs: {
      checked: false,
      indeterminate: true,
      onChange: vi.fn(),
      "aria-label": "Select all",
    },
    headerPlan: null,
    groupToggleProps: () => undefined,
  };
}

describe("Quasar prepared table renderer", () => {
  it("verifies why QTable and QMarkupTable cannot carry the native table contract", () => {
    const table = host(QTable, {
      props: {
        rows,
        columns: [{ name: "name", field: "name", label: "Name" }],
        hideBottom: true,
      },
      attrs: { "data-probe-target": "contract", "aria-label": "People" },
    });
    expect(table.attributes("data-probe-target")).toBe("contract");
    expect(table.element.tagName).toBe("DIV");
    expect(table.get("table").attributes("data-probe-target")).toBeUndefined();
    const markup = host(QMarkupTable, {
      attrs: { "data-probe-target": "contract" },
      slots: { default: () => h("tbody", [h("tr", [h("td", "Cell")])]) },
    });
    expect(markup.element.tagName).toBe("DIV");
    expect(markup.get("table").attributes("data-probe-target")).toBeUndefined();
  });

  it("places attributes and owned refs on the genuine table/TR/TH/TD roots and preserves supplied order", async () => {
    const refs = {
      table: vi.fn(),
      row: vi.fn(),
      headerRow: vi.fn(),
      header: vi.fn(),
      cell: vi.fn(),
    };
    const model = preparedModel(refs);
    const wrapper = host(
      defineComponent(
        () => () =>
          QuasarDesktop({
            model,
            slots: controls,
            classNames: {
              table: "table-paint",
              tr: "row-paint",
              th: "head-paint",
              td: "cell-paint",
            },
          })
      )
    );
    await settle();
    expect(wrapper.findComponent(QCard).exists()).toBe(true);
    expect(wrapper.findAllComponents(QTr)).toHaveLength(3);
    expect(wrapper.findAllComponents(QTh)).toHaveLength(3);
    expect(wrapper.findAllComponents(QTd)).toHaveLength(6);
    const table = wrapper.get("table");
    expect(table.attributes()).toMatchObject({
      "aria-label": "People",
      "aria-rowcount": "3",
      dir: "rtl",
      "data-adapttable-part": "table",
    });
    expect(table.classes()).toContain("table-paint");
    expect(refs.table).toHaveBeenLastCalledWith(table.element);
    expect(
      wrapper
        .findAll('tbody [data-adapttable-part="row"]')
        .map((row) => row.attributes("id"))
    ).toEqual(["row-b", "row-a"]);
    for (const [key, tag] of [
      ["row", "TR"],
      ["headerRow", "TR"],
      ["header", "TH"],
      ["cell", "TD"],
    ] as const) {
      expect(refs[key].mock.calls.length).toBeGreaterThan(0);
      expect(
        refs[key].mock.calls.every(
          ([node]) => node instanceof HTMLElement && node.tagName === tag
        )
      ).toBe(true);
    }
    expect(
      wrapper.get('[data-adapttable-part="cell"]').attributes("style")
    ).toContain("width: 160px");
    await wrapper.get('[data-adapttable-part="sort-button"]').trigger("click");
    expect(model.headers[0]?.sortAttrs?.onClick).toHaveBeenCalledTimes(1);
    const checkbox = wrapper.get('thead [role="checkbox"]');
    expect(checkbox.attributes("aria-checked")).toBe("mixed");
    await checkbox.trigger("click");
    expect(model.headerCheckboxAttrs?.onChange).toHaveBeenCalledTimes(1);
    expect(checkbox.attributes("aria-checked")).toBe("mixed");
    wrapper.unmount();
    wrappers.pop();
    for (const ref of Object.values(refs))
      expect(ref).toHaveBeenLastCalledWith(null);
  });

  it("releases a replaced row ref before handing the unchanged native row to its new owner", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const current = shallowRef(preparedModel({ row: first }));
    const wrapper = host(
      defineComponent(
        () => () => QuasarDesktop({ model: current.value, slots: controls })
      )
    );
    await settle();
    const row = wrapper.get("#row-b").element;
    current.value = {
      ...current.value,
      rows: current.value.rows.map((item) => ({
        ...item,
        attrs: { ...item.attrs, ref: second },
      })),
    };
    await settle();
    expect(first).toHaveBeenLastCalledWith(null);
    expect(second).toHaveBeenCalledWith(row);
    expect(wrapper.get("#row-b").element).toBe(row);
    wrapper.unmount();
    wrappers.pop();
    expect(second).toHaveBeenLastCalledWith(null);
  });

  it("owns native table refs through callback replacement, removal and unchanged renders", async () => {
    const events: { owner: string; element: Element | null }[] = [];
    const first = vi.fn((element: Element | null) => {
      events.push({ owner: "first", element });
    });
    const second = vi.fn((element: Element | null) => {
      events.push({ owner: "second", element });
    });
    const current = shallowRef(preparedModel({ table: first }));
    const wrapper = host(
      defineComponent(
        () => () => QuasarDesktop({ model: current.value, slots: controls })
      )
    );
    await settle();
    const table = wrapper.get("table").element;
    expect(first.mock.calls).toEqual([[table]]);
    current.value = {
      ...current.value,
      attrs: { ...current.value.attrs, "aria-label": "Updated" },
    };
    await settle();
    expect(first.mock.calls).toEqual([[table]]);
    expect(wrapper.get("table").element).toBe(table);
    current.value = {
      ...current.value,
      attrs: { ...current.value.attrs, ref: second },
    };
    await settle();
    expect(events).toEqual([
      { owner: "first", element: table },
      { owner: "first", element: null },
      { owner: "second", element: table },
    ]);
    expect(wrapper.get("table").element).toBe(table);
    current.value = {
      ...current.value,
      attrs: { ...current.value.attrs, ref: undefined },
    };
    await settle();
    expect(second.mock.calls).toEqual([[table], [null]]);
    expect(wrapper.get("table").element).toBe(table);
    wrapper.unmount();
    wrappers.pop();
    expect(second.mock.calls).toEqual([[table], [null]]);
  });

  it("renders prepared grouped headers, cell spans, column spacers, details and summary without recomputing rows", async () => {
    const model = preparedModel();
    const detail = vi.fn();
    const first = model.rows[0];
    const name = model.headers[0];
    const score = model.headers[1];
    if (!first || !name || !score) throw new Error("Missing model fixture");
    const enriched: DesktopTableModel<Row> = {
      ...model,
      columnCount: 5,
      columnSpacers: { start: 25, end: 40 },
      headerPlan: [
        [
          { kind: "leaf", key: name.key, columnIndex: 0, rowSpan: 2 },
          { kind: "leaf", key: score.key, columnIndex: 1, rowSpan: 2 },
        ],
      ],
      rows: [
        {
          ...first,
          cells: first.cells.map((cell) => ({
            ...cell,
            attrs: { ...cell.attrs, colspan: 2, rowspan: 2 },
          })),
          detail: {
            expanded: true,
            toggleAttrs: { "aria-label": "Collapse detail" },
            render: () => h("strong", "Prepared detail"),
            measure: detail,
          },
        },
      ],
      summary: {
        cells: columns.map((column) => ({
          key: column.key,
          attrs: {},
          label: column.header ?? column.key,
          context: { column, value: column.key === "score" ? 3 : "Totals" },
        })),
      },
    };
    const wrapper = host(
      defineComponent(
        () => () => QuasarDesktop({ model: enriched, slots: controls })
      )
    );
    await settle();
    expect(
      wrapper.get('[data-adapttable-part="header-cell"]').attributes("rowspan")
    ).toBe("2");
    expect(
      wrapper.get('[data-adapttable-part="cell"]').attributes()
    ).toMatchObject({ colspan: "2", rowspan: "2" });
    expect(
      wrapper
        .get('[data-adapttable-part="column-spacer-start"]')
        .attributes("style")
    ).toContain("width: 25px");
    expect(
      wrapper.get('[data-adapttable-part="detail-cell"]').attributes("colspan")
    ).toBe("5");
    expect(wrapper.text()).toContain("Prepared detail");
    expect(detail).toHaveBeenLastCalledWith(
      wrapper.get('[data-adapttable-part="detail-row"]').element
    );
    expect(wrapper.get("tfoot").text()).toContain("Totals");
    expect(wrapper.get("tfoot").text()).toContain("3");
  });

  it("keeps resize keyboard and pointer wiring on the genuine Quasar separator", async () => {
    const base = preparedModel();
    const key = vi.fn();
    const pointer = vi.fn();
    const target = vi.fn();
    const model: DesktopTableModel<Row> = {
      ...base,
      headers: base.headers.map((header, index) =>
        index === 0
          ? {
              ...header,
              resizeAttrs: {
                role: "separator",
                tabIndex: 0,
                "aria-valuenow": 160,
                "aria-label": "Resize Name",
                onKeyDown: key,
                onPointerDown: pointer,
                ref: target,
              },
            }
          : header
      ),
    };
    const wrapper = host(
      defineComponent(() => () => QuasarDesktop({ model, slots: controls }))
    );
    await settle();
    const grip = wrapper.get('[data-adapttable-part="resize-handle"]');
    expect(grip.element.tagName).toBe("HR");
    expect(grip.classes()).toContain("q-separator");
    expect(grip.attributes()).toMatchObject({
      tabindex: "0",
      role: "separator",
      "aria-orientation": "vertical",
      "aria-valuenow": "160",
    });
    expect(target).toHaveBeenLastCalledWith(grip.element);
    await grip.trigger("keydown", { key: "ArrowRight" });
    await grip.trigger("pointerdown");
    expect(key).toHaveBeenCalledTimes(1);
    expect(pointer).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    wrappers.pop();
    expect(target).toHaveBeenLastCalledWith(null);
  });

  it("paints mobile list items with genuine Quasar cards and preserves control callbacks", async () => {
    const source = preparedModel();
    const target = vi.fn();
    const model: MobileCardsModel<Row> = {
      attrs: { role: "list", dir: "rtl", "data-adapttable-part": "cards" },
      rows: source.rows.map((row) => ({
        ...row,
        attrs: {
          role: "listitem",
          "data-adapttable-part": "card",
          ref: target,
        },
      })),
    };
    const wrapper = host(
      defineComponent(() => () => QuasarMobile({ model, slots: controls }))
    );
    await settle();
    expect(wrapper.findAllComponents(QCard)).toHaveLength(2);
    expect(wrapper.findAll("article")).toHaveLength(2);
    expect(wrapper.get("article").attributes("role")).toBe("listitem");
    expect(wrapper.get("dl").classes()).toContain("q-card__section");
    expect(wrapper.findAll("dt").map((label) => label.text())).toEqual([
      "Name",
      "Score",
      "Name",
      "Score",
    ]);
    expect(wrapper.findAll("dd").map((value) => value.text())).toEqual([
      "Bea",
      "2",
      "Ada",
      "1",
    ]);
    expect(
      target.mock.calls.every(
        ([element]) =>
          element instanceof HTMLElement && element.tagName === "ARTICLE"
      )
    ).toBe(true);
    await wrapper.get('[role="checkbox"]').trigger("click");
    expect(model.rows[0]?.checkboxAttrs?.onChange).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    wrappers.pop();
    expect(target).toHaveBeenLastCalledWith(null);
  });

  it("renders mobile prepared extras, summary, tree, detail and action contributions", async () => {
    const base = preparedModel();
    const original = base.rows[0];
    if (!original) throw new Error("Missing row");
    const action = vi.fn();
    const detail = vi.fn();
    const tree = vi.fn();
    const measured = vi.fn();
    const row: TableRowModel<Row> = {
      ...original,
      attrs: { role: "listitem", "data-adapttable-part": "card" },
      reorder: () => h("span", "Prepared reorder"),
      editActions: () => h("span", "Prepared edit actions"),
      actionControls: [
        {
          key: "open",
          label: "Open row",
          action: { key: "open", label: "Open row", onClick: action },
          attrs: { "data-adapttable-part": "row-action", onClick: action },
        },
      ],
      detail: {
        expanded: true,
        toggleAttrs: {
          "data-adapttable-part": "expand-toggle",
          "aria-label": "Collapse detail",
          onClick: detail,
        },
        render: () => "Prepared child",
        measure: measured,
      },
      cells: original.cells.map((cell, index) =>
        index === 0
          ? {
              ...cell,
              render: (value) => h("em", [value]),
              addon: () => h("span", "Prepared addon"),
              tree: {
                attrs: { "data-adapttable-part": "tree-cell" },
                toggleAttrs: {
                  "aria-label": "Collapse children",
                  onClick: tree,
                },
                entry: {
                  row: original.row,
                  key: "b",
                  level: 0,
                  path: [],
                  descendantIds: [],
                  hasChildren: true,
                  expanded: true,
                  loading: true,
                },
              },
            }
          : cell
      ),
    };
    const model: MobileCardsModel<Row> = {
      attrs: { role: "list", dir: "rtl" },
      rows: [],
      bodySlots: [
        { kind: "virtualPad", key: "pad-top", height: 15, colSpan: 1 },
        {
          kind: "extra",
          key: "notice",
          extraKind: "separator",
          colSpan: 1,
          render: () => "Prepared notice",
        },
        { kind: "row", key: row.key, wiring: row },
      ],
      summary: {
        cells: [
          {
            key: "score",
            attrs: {},
            label: "Score",
            context: { column: columns[1]!, value: 3 },
          },
          {
            key: "empty",
            attrs: {},
            label: "Empty",
            context: { column: { key: "empty" }, value: undefined },
          },
        ],
      },
    };
    const slots: TableChromeSlots<Row> = {
      ...controls,
      RowActions: ({ controls: actions }) =>
        h(QuasarRowActions<Row>, {
          controls: actions,
          label: "Actions",
          classNames: {},
        }),
    };
    const wrapper = host(
      defineComponent(() => () => QuasarMobile({ model, slots }))
    );
    await settle();
    expect(
      wrapper.get('[data-adapttable-part="virtual-spacer"]').attributes("style")
    ).toContain("height: 15px");
    expect(wrapper.get('[data-adapttable-part="separator-cell"]').text()).toBe(
      "Prepared notice"
    );
    expect(wrapper.get('[data-adapttable-part="card"]').text()).toContain(
      "Prepared addon"
    );
    expect(wrapper.get('[data-adapttable-part="card"]').text()).toContain(
      "Prepared child"
    );
    expect(
      wrapper.get('[data-adapttable-part="summary-card"]').text()
    ).toContain("3");
    expect(
      wrapper.get('[data-adapttable-part="summary-card"]').text()
    ).not.toContain("Empty");
    expect(measured).toHaveBeenLastCalledWith(
      wrapper.get('[data-adapttable-part="card-detail"]').element
    );
    await wrapper
      .get('[data-adapttable-part="expand-toggle"]')
      .trigger("click");
    expect(detail).toHaveBeenCalledTimes(1);
    await wrapper.get('[aria-label="Collapse children"]').trigger("click");
    expect(tree).toHaveBeenCalledTimes(1);
    await wrapper.get('[data-adapttable-part="row-action"]').trigger("click");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("assembles the shared shell with kit search, sort and pagination and has one scroll owner", async () => {
    const wrapper = host(DataTable<Row>, {
      props: {
        data: rows,
        columns,
        rowKey: (row: Row) => row.id,
        defaults: { limit: 1 },
        paginationMode: "paged",
        urlSync: false,
        searchDebounceMs: 0,
        forceMobile: false,
      },
    });
    await settle();
    expect(wrapper.findAll('[data-adapttable-part="scroll-box"]')).toHaveLength(
      1
    );
    expect(wrapper.get("tbody").text()).toContain("Bea");
    await wrapper.get('[data-adapttable-part="page-next"]').trigger("click");
    await settle();
    expect(wrapper.get("tbody").text()).toContain("Ada");
    await wrapper.get('[data-adapttable-part="page-prev"]').trigger("click");
    await settle();
    expect(wrapper.get("tbody").text()).toContain("Bea");
    const input = wrapper.get('input[type="search"]');
    await input.setValue("Ada");
    await settle();
    expect(wrapper.get("tbody").text()).toContain("Ada");
    expect(wrapper.get("tbody").text()).not.toContain("Bea");
    await input.setValue("");
    await settle();
    await wrapper.get('[data-adapttable-part="sort-button"]').trigger("click");
    await settle();
    expect(wrapper.get("tbody").text()).toContain("Ada");
  });

  it.each([
    ["empty text", "", false],
    ["whitespace", "  ", false],
    ["boolean", false, false],
    ["comment", h(Comment), false],
    ["empty fragment", h(Fragment, null, [h(Comment)]), false],
    ["text node", h(Text, null, "Action text"), true],
    ["fragment", h(Fragment, null, [h("span", "Action text")]), true],
    ["node", h("span", "Action text"), true],
    ["text", "Action text", true],
  ])(
    "preserves meaningful header action content: %s",
    async (_name, content, visible) => {
      const base = preparedModel();
      const model: DesktopTableModel<Row> = {
        ...base,
        headers: base.headers.map((header, index) =>
          index === 0
            ? {
                ...header,
                column: { ...header.column, headerActions: () => content },
              }
            : header
        ),
      };
      const wrapper = host(
        defineComponent(() => () => QuasarDesktop({ model, slots: controls }))
      );
      await settle();
      expect(
        wrapper.find('[data-adapttable-part="header-actions"]').exists()
      ).toBe(visible);
    }
  );

  it("aligns explicit detail, reorder and action utility columns with prepared content and footer pads", async () => {
    const base = preparedModel();
    const clicked = vi.fn();
    const button = (label: string) =>
      h(QuasarButton, { attrs: { onClick: clicked }, label });
    const model: DesktopTableModel<Row> = {
      ...base,
      expandLabel: "Details",
      reorderLabel: "Order",
      actionsLabel: "Actions",
      columnCount: 6,
      headers: base.headers.map((header, index) =>
        index === 0
          ? {
              ...header,
              rename: (caption) => h("strong", [caption]),
              selection: () => button("Select column"),
              filter: () => button("Filter column"),
              context: { ...header.context, sortIndex: 1 },
            }
          : header
      ),
      rows: base.rows.map((row, index) => ({
        ...row,
        checkboxAttrs: index === 0 ? row.checkboxAttrs : undefined,
        reorder: () => button("Move row"),
        editActions: () => button("Save row"),
        detail:
          index === 0
            ? {
                expanded: false,
                toggleAttrs: { "aria-label": "Expand row", onClick: clicked },
                render: () => "Child",
              }
            : undefined,
      })),
      summary: {
        cells: columns.map((column) => ({
          key: column.key,
          attrs: {},
          label: column.header ?? column.key,
          context: { column, value: 3 },
        })),
      },
    };
    const wrapper = host(
      defineComponent(
        () => () =>
          QuasarDesktop({
            model,
            slots: controls,
            classNames: {
              expandHeader: "expand-head",
              expandCell: "expand-cell",
            },
          })
      )
    );
    await settle();
    expect(
      wrapper.get('[data-adapttable-part="expand-header"]').classes()
    ).toContain("expand-head");
    expect(
      wrapper.get('[data-adapttable-part="expand-cell"]').classes()
    ).toContain("expand-cell");
    expect(wrapper.get('[data-adapttable-part="reorder-header"]').text()).toBe(
      "Order"
    );
    expect(wrapper.get('[data-adapttable-part="actions-header"]').text()).toBe(
      "Actions"
    );
    expect(
      wrapper.findAll('tfoot [data-adapttable-part="summary-cell"]')
    ).toHaveLength(6);
    expect(wrapper.get('[data-adapttable-part="sort-index"]').text()).toBe("1");
    await wrapper.get('[aria-label="Expand row"]').trigger("click");
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(wrapper.get("tbody").text()).toContain("Move row");
    expect(wrapper.get("tbody").text()).toContain("Save row");
  });

  it("renders groups in the mobile card layout with Quasar controls", async () => {
    const wrapper = host(DataTable<Row>, {
      props: {
        data: rows,
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: true,
        selectable: true,
        features: [grouping("score")],
      },
    });
    await settle();
    const toggle = wrapper.get('[data-adapttable-part="group-toggle"]');
    expect(toggle.classes()).toContain("q-btn");
    const selection = wrapper.get('[data-adapttable-part="group-select"]');
    expect(selection.attributes("role")).toBe("checkbox");
    await selection.trigger("click");
    await settle();
    expect(selection.attributes("aria-checked")).toBe("true");
  });

  it("renders prepared body slots in order, including virtual pads and uncovered extra-row spans", async () => {
    const base = preparedModel();
    const first = base.rows[0];
    if (!first) throw new Error("Missing row");
    const model: DesktopTableModel<Row> = {
      ...base,
      bodySlots: [
        { kind: "virtualPad", key: "pad-top", height: 80, colSpan: 3 },
        {
          kind: "extra",
          key: "notice",
          extraKind: "fullWidth",
          colSpan: 3,
          coveredSlots: new Set([1]),
          render: () => "Prepared notice",
        },
        { kind: "row", key: first.key, wiring: first },
        { kind: "virtualPad", key: "pad-bottom", height: 120, colSpan: 3 },
      ],
    };
    const wrapper = host(
      defineComponent(() => () => QuasarDesktop({ model, slots: controls }))
    );
    await settle();
    const body = wrapper.findAll("tbody > tr");
    expect(body.map((row) => row.attributes("data-adapttable-part"))).toEqual([
      "virtual-spacer",
      "full-width-row",
      "row",
      "virtual-spacer",
    ]);
    expect(body[0]?.get("td").attributes("style")).toContain("height: 80px");
    expect(
      body[1]?.findAll("td").map((cell) => cell.attributes("colspan"))
    ).toEqual(["1", "1"]);
    expect(body[1]?.text()).toBe("Prepared notice");
    expect(body[2]?.text()).toContain("Bea");
  });

  it("keeps controlled selection rejected until the host accepts it", async () => {
    const selected = ref<string[]>([]);
    const accept = ref(false);
    const changed = vi.fn((next: string[]) => {
      if (accept.value) selected.value = next;
    });
    const wrapper = host(
      defineComponent(
        () => () =>
          h(DataTable<Row>, {
            data: rows,
            columns,
            rowKey: (row: Row) => row.id,
            urlSync: false,
            forceMobile: false,
            selectable: true,
            selectedIds: selected.value,
            "onUpdate:selectedIds": changed,
          })
      )
    );
    await settle();
    const checkbox = wrapper.get('tbody [role="checkbox"]');
    await checkbox.trigger("click");
    await settle();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenLastCalledWith(["b"]);
    expect(checkbox.attributes("aria-checked")).toBe("false");
    accept.value = true;
    await checkbox.trigger("click");
    await settle();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(checkbox.attributes("aria-checked")).toBe("true");
  });

  it("renders real grouped column headers and delegates collapse to the binding", async () => {
    const wrapper = host(DataTable<Row>, {
      props: {
        data: rows,
        columns: [{ header: "Identity", children: columns }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: false,
        collapsibleColumnGroups: true,
      },
    });
    await settle();
    const group = wrapper.get('[data-adapttable-part="header-group-cell"]');
    expect(group.element.tagName).toBe("TH");
    expect(group.attributes("colspan")).toBe("2");
    expect(group.text()).toContain("Identity");
    const toggle = wrapper.get('[data-adapttable-part="column-group-toggle"]');
    expect(toggle.element.tagName).toBe("BUTTON");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    await toggle.trigger("click");
    await settle();
    expect(
      wrapper
        .get('[data-adapttable-part="column-group-toggle"]')
        .attributes("aria-expanded")
    ).toBe("false");
  });

  it("uses the shared group feature fill with real Quasar disclosure controls", async () => {
    const wrapper = host(DataTable<Row>, {
      props: {
        data: rows,
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [grouping("score")],
      },
    });
    await settle();
    const toggle = wrapper.get('[data-adapttable-part="group-toggle"]');
    expect(toggle.element.tagName).toBe("BUTTON");
    expect(toggle.classes()).toContain("q-btn");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    await toggle.trigger("click");
    await settle();
    expect(toggle.attributes("aria-expanded")).toBe("false");
  });

  it("uses native Quasar menu controls for host-owned row actions", async () => {
    const action = vi.fn();
    const wrapper = host(DataTable<Row>, {
      props: {
        data: rows,
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: false,
        rowActionsLayout: "menu",
        features: [
          rowActions<Row>([{ key: "open", label: "Open", onClick: action }]),
        ],
      },
    });
    await settle();
    const trigger = wrapper.get('[data-adapttable-part="row-actions-trigger"]');
    await trigger.trigger("click");
    await settle();
    const menu = document.querySelector(
      '[data-adapttable-part="row-actions-menu"]'
    );
    expect(menu).not.toBeNull();
    const button = menu?.querySelector("button");
    expect(button).toBeInstanceOf(HTMLButtonElement);
    button?.click();
    await settle();
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith(rows[0]);
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("bounds non-finite loading dimensions without constructing an unbounded placeholder grid", async () => {
    const wrapper = host(
      defineComponent(
        () => () =>
          quasarLoading({
            rows: Number.POSITIVE_INFINITY,
            columns: Number.NaN,
            mobile: false,
            classNames: {},
          })
      )
    );
    await settle();
    expect(
      wrapper.findAll('[data-adapttable-part="loading-row"]')
    ).toHaveLength(0);
    expect(
      wrapper.findAll('[data-adapttable-part="loading-header-cell"]')
    ).toHaveLength(1);
    expect(
      wrapper
        .get('[data-adapttable-part="loading-table"]')
        .attributes("aria-hidden")
    ).toBe("true");
  });

  it("uses genuine decorative skeletons and announced status in both layouts", async () => {
    const wrapper = host(DataTable<Row>, {
      props: {
        data: [],
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: false,
        isLoading: true,
        skeletonRows: 2,
        classNames: {
          loadingCell: "loading-cell-paint",
          loadingLine: "loading-line-paint",
        },
      },
    });
    await settle();
    expect(
      wrapper.findAll('[data-adapttable-part="loading-row"]')
    ).toHaveLength(2);
    expect(
      wrapper.get('[data-adapttable-part="loading-cell"]').classes()
    ).toContain("loading-cell-paint");
    expect(
      wrapper.get('[data-adapttable-part="loading-line"]').classes()
    ).toContain("q-skeleton");
    expect(
      wrapper
        .get('[data-adapttable-part="loading-table"]')
        .attributes("aria-hidden")
    ).toBe("true");
    await wrapper.setProps({ forceMobile: true });
    await settle();
    expect(
      wrapper.findAll('[data-adapttable-part="loading-card"]')
    ).toHaveLength(2);
  });

  it("allows complete headless use without mounting a kit table", async () => {
    let count = 0;
    const wrapper = mount(
      defineComponent({
        setup() {
          const shell = useDataTableShell<Row>({
            data: rows,
            columns,
            rowKey: (row) => row.id,
            urlSync: false,
          });
          return () => {
            count = shell.desktop.value.rows.length;
            return h("output", String(count));
          };
        },
      })
    );
    wrappers.push(wrapper);
    await settle();
    expect(count).toBe(2);
    expect(wrapper.find("table").exists()).toBe(false);
    expect(wrapper.findComponent(QCard).exists()).toBe(false);
  });
});
