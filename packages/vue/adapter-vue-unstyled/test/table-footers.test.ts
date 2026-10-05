import {
  aggregate,
  type ColumnDef,
  type ColumnInput,
  type SummaryRowFn,
  useFrontendData,
} from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";

import { DataTable, type DataTableProps, type DataTableSlots } from "../src";
import { cellSpan } from "../src/cell-span";
import { grouping } from "../src/grouping";
import { pinnedSummaryRows } from "../src/pinned-summary-rows";
import { rowActions } from "../src/row-actions";
import { rowDetail } from "../src/row-detail";
import { rowReorder } from "../src/row-reorder";
import { virtualize } from "../src/virtualize";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Row {
  id: string;
  team: string;
  name: string;
  amount: number;
}
const data: readonly Row[] = [
  { id: "a", team: "Alpha", name: "Ada", amount: 10 },
  { id: "b", team: "Alpha", name: "Bea", amount: 20 },
  { id: "c", team: "Beta", name: "Cora", amount: 30 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", width: 120 },
  { key: "team", width: 100 },
  { key: "amount", width: 80, mobileLabel: "Total amount" },
];
const summaryRow = aggregate<Row>({ amount: "sum" });
const defaults: DataTableProps<Row> = {
  data,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  paginationMode: "paged",
  searchDebounceMs: 0,
};
function mount(
  overrides: Partial<DataTableProps<Row>> = {},
  slots: DataTableSlots<Row> = {}
) {
  const props = shallowRef({ ...defaults, ...overrides });
  return { ...mountNative(() => h(DataTable<Row>, props.value, slots)), props };
}
function summary(root: ParentNode) {
  return find(root, part("summary"));
}
function values(root: ParentNode) {
  return [...root.querySelectorAll(part("summary-cell"))].map(
    (cell) => cell.textContent
  );
}

describe("column and custom footers", () => {
  it.each([false, true])(
    "keeps conditional summary values empty on the native surface (mobile=%s)",
    async (forceMobile) => {
      const visible = shallowRef(false);
      const { host } = mount({
        forceMobile,
        summaryRow: () => ({
          name: visible.value && h("b", "Ready"),
          amount: [
            false,
            [true, 0, "", visible.value && h("strong", " total")],
          ],
        }),
      });
      const surface = () =>
        find(host, part(forceMobile ? "summary-card" : "summary"));
      const value = (key: string) =>
        forceMobile
          ? find(surface(), `[data-column-key="${key}"] dd`).textContent
          : find(surface(), `[data-column-key="${key}"]`).textContent;
      expect(value("name")).toBe("");
      expect(value("amount")).toBe("0");
      expect(surface().textContent).not.toMatch(/false|true/);
      visible.value = true;
      await tick();
      expect(value("name")).toBe("Ready");
      expect(value("amount")).toBe("0 total");
    }
  );

  it("is absent by default and honors all summary classes on their semantic elements", async () => {
    const { host, props } = mount();
    expect(host.querySelector(part("summary"))).toBeNull();
    props.value = {
      ...props.value,
      summaryRow,
      selectable: true,
      features: [
        rowActions<Row>([{ key: "open", label: "Open", onClick: vi.fn() }]),
        rowReorder<Row>(vi.fn()),
        rowDetail<Row>((row) => row.name),
      ],
      classNames: {
        summary: "sum",
        summaryRow: "sum-row",
        summaryCell: "sum-cell",
      },
    };
    await tick();
    const footer = summary(host);
    expect(footer.tagName).toBe("TFOOT");
    expect(footer.className).toBe("sum");
    expect(find(footer, part("summary-row")).className).toBe("sum-row");
    expect(values(footer)).toEqual(["", "", "", "", "60", ""]);
    expect(
      [...footer.querySelectorAll("td")].every(
        (cell) => cell.className === "sum-cell"
      )
    ).toBe(true);
    expect(
      footer.querySelector("button,input,[tabindex],[aria-selected]")
    ).toBeNull();
    expect(footer.querySelectorAll("td")).toHaveLength(
      find(host, "tbody tr").querySelectorAll("td").length
    );
  });

  it("totals the current filtered page and reactively changes the mapper without changing rows", async () => {
    const factor = shallowRef(1);
    const mapper: SummaryRowFn<Row> = (rows) => ({
      amount: rows.reduce((sum, row) => sum + row.amount, 0) * factor.value,
    });
    const { host, props } = mount({
      summaryRow: mapper,
      defaults: { limit: 1 },
    });
    expect(values(summary(host))).toEqual(["", "", "10"]);
    find(host, part("page-next")).click();
    await tick();
    expect(values(summary(host))).toEqual(["", "", "20"]);
    await write(find<HTMLInputElement>(host, 'input[type="search"]'), "Alpha");
    expect(values(summary(host))).toEqual(["", "", "10"]);
    factor.value = 2;
    await tick();
    expect(values(summary(host))).toEqual(["", "", "20"]);
    props.value = {
      ...props.value,
      summaryRow: () => ({ name: "Replacement", amount: 7 }),
    };
    await tick();
    expect(values(summary(host))).toEqual(["Replacement", "", "7"]);
    props.value = { ...props.value, summaryRow: undefined };
    await tick();
    expect(host.querySelector(part("summary"))).toBeNull();
  });

  it("lets a host explicitly supply an all-row summary and respects external source replacement", async () => {
    const sourceRows = shallowRef(data.slice(0, 1));
    const total = shallowRef(200);
    const { host } = mountNative(() =>
      h(
        defineComponent({
          setup() {
            const source = useFrontendData<Row>({
              data: sourceRows,
              columns,
              getRowId: (row) => row.id,
              urlSync: false,
            });
            return () =>
              h(DataTable<Row>, {
                ...defaults,
                source: { ...source.value, total: total.value },
                summaryRow,
              });
          },
        })
      )
    );
    expect(values(summary(host))).toEqual(["", "", "10"]);
    sourceRows.value = data.slice(1);
    await tick();
    expect(values(summary(host))).toEqual(["", "", "50"]);
    total.value = 300;
    await tick();
    expect(values(summary(host))).toEqual(["", "", "50"]);
    const all = mount({
      defaults: { limit: 1 },
      summaryRow: () => summaryRow(data),
    });
    expect(values(summary(all.host))).toEqual(["", "", "60"]);
  });

  it("keeps grouped summaries over the filtered group source and excludes pinned host summary rows", async () => {
    const { host } = mount({
      summaryRow,
      defaults: { limit: 1 },
      features: [
        grouping<Row>("team"),
        pinnedSummaryRows<Row>({
          top: [{ id: "summary", team: "", name: "Pinned", amount: 1000 }],
        }),
      ],
    });
    expect(values(summary(host))).toEqual(["", "", "60"]);
    find(host, part("group-toggle")).click();
    await tick();
    expect(values(summary(host))).toEqual(["", "", "60"]);
    await write(find<HTMLInputElement>(host, 'input[type="search"]'), "Alpha");
    expect(values(summary(host))).toEqual(["", "", "30"]);
  });

  it.each(["ltr", "rtl"] as const)(
    "shares effective grouped columns, widths, order and pinning in %s",
    async (dir) => {
      const grouped: readonly ColumnInput<Row>[] = [
        { header: "Person", children: columns.slice(0, 2) },
        columns[2]!,
      ];
      const { host, props } = mount({
        columns: grouped,
        summaryRow,
        dir,
        selectable: true,
        columnWidths: { amount: 190 },
        defaultColumnLayout: {
          order: ["amount", "name", "team"],
          hidden: ["team"],
          pinned: { amount: "start", name: "end" },
        },
        features: [cellSpan<Row>(() => ({ colSpan: 2 }))],
      });
      const footer = summary(host);
      expect(
        [...footer.querySelectorAll("td[data-column-key]")].map((cell) =>
          cell.getAttribute("data-column-key")
        )
      ).toEqual(["amount", "name"]);
      const amount = find<HTMLElement>(footer, '[data-column-key="amount"]');
      expect(amount.style.width).toBe("190px");
      expect(amount.style.position).toBe("sticky");
      expect(amount.style.insetInlineStart).toBe("0px");
      expect(amount.getAttribute("data-pinned")).toBe("start");
      expect(amount.hasAttribute("colspan")).toBe(false);
      expect(
        find<HTMLElement>(footer, '[data-column-key="name"]').style
          .insetInlineEnd
      ).toBe("0px");
      props.value = { ...props.value, columnWidths: { amount: 230 } };
      await tick();
      expect(
        find<HTMLElement>(summary(host), '[data-column-key="amount"]').style
          .width
      ).toBe("230px");
    }
  );

  it("keeps a collapsed group's chosen leaf and hides footers of collapsed-away columns", async () => {
    const grouped: readonly ColumnInput<Row>[] = [
      {
        header: "Invoice",
        collapsedKey: "name",
        children: columns,
      },
    ];
    const { host } = mount({
      columns: grouped,
      summaryRow,
      collapsibleColumnGroups: true,
    });
    expect(values(summary(host))).toEqual(["", "", "60"]);
    find(host, part("column-group-toggle")).click();
    await tick();
    expect(summary(host).querySelectorAll("td")).toHaveLength(1);
    expect(
      summary(host).querySelector('[data-column-key="amount"]')
    ).toBeNull();
    find(host, part("column-group-toggle")).click();
    await tick();
    expect(values(summary(host))).toEqual(["", "", "60"]);
  });

  it("adds and removes slot-only footers without changing table props", async () => {
    const enabled = shallowRef(false);
    const { host } = mountNative(() =>
      h(
        DataTable<Row>,
        defaults,
        enabled.value
          ? {
              footer: ({ column }: { column: ColumnDef<Row> }) =>
                column.key === "amount" ? "Provided" : null,
              tableFooter: () => "Notes",
            }
          : {}
      )
    );
    expect(host.querySelector(part("summary"))).toBeNull();
    enabled.value = true;
    await tick();
    expect(values(summary(host))).toEqual(["", "", "Provided"]);
    expect(find(host, part("table-footer")).textContent).toBe("Notes");
    enabled.value = false;
    await tick();
    expect(host.querySelector(part("summary"))).toBeNull();
    expect(host.querySelector(part("table-footer"))).toBeNull();
  });

  it("sums all source rows while virtual footer columns and spacers follow the body window", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      }
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.adapttablePart === "scroll-box" ? 240 : 48;
      }
    );
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 240,
      left: 0,
      right: 400,
      width: 400,
      height: 240,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const data = Array.from({ length: 80 }, (_, index) => ({
      id: String(index),
      name: `Invoice ${index}`,
      team: "A",
      amount: 1,
    }));
    const columns: readonly ColumnDef<Row>[] = [
      { key: "amount", width: 120 },
      ...Array.from({ length: 30 }, (_, index) => ({
        key: `metric-${index}`,
        width: 120,
        accessor: (row: Row) => row.amount,
      })),
    ];
    const { host } = mount({
      data,
      columns,
      summaryRow,
      defaults: { limit: 80 },
      paginationMode: "infinite",
      defaultColumnLayout: { pinned: { amount: "start" } },
      features: [
        virtualize({
          maxHeight: 240,
          estimateRowSize: 48,
          virtualOverscan: 1,
          virtualizeColumns: true,
        }),
      ],
    });
    await tick();
    expect(host.querySelectorAll("tbody [data-row-id]").length).toBeLessThan(
      20
    );
    const footer = summary(host);
    expect(find(footer, '[data-column-key="amount"]').textContent).toBe("80");
    const footerKeys = [...footer.querySelectorAll("[data-column-key]")].map(
      (cell) => cell.getAttribute("data-column-key")
    );
    expect(footerKeys.length).toBeLessThan(columns.length);
    expect(footerKeys).toEqual(
      [...host.querySelectorAll("thead [data-column-key]")].map((cell) =>
        cell.getAttribute("data-column-key")
      )
    );
    const footerEnd = find<HTMLElement>(footer, part("column-spacer-end"));
    const bodyEnd = find<HTMLElement>(
      host,
      `tbody ${part("column-spacer-end")}`
    );
    expect(footerEnd.style.width).toBe(bodyEnd.style.width);
    expect(Number.parseFloat(footerEnd.style.width)).toBeGreaterThan(0);
  });

  it("preserves VNodes, component footers, explicit empty slot results and column precedence", async () => {
    const fallback = vi.fn(({ column }: { column: ColumnDef<Row> }) =>
      column.key === "team" ? null : h("i", "fallback")
    );
    const Count = defineComponent({
      props: { value: Number },
      setup: (props) => () => h("strong", `Total ${props.value}`),
    });
    const { host, props } = mount(
      {
        columns: [
          columns[0]!,
          columns[1]!,
          {
            ...columns[2]!,
            footer: {
              component: Count,
              props: (context) => ({ value: context.value }),
            },
          },
        ],
        summaryRow: () => ({ name: h("b", "Host"), amount: 60 }),
      },
      { footer: fallback }
    );
    expect(values(summary(host))).toEqual(["fallback", "", "Total 60"]);
    expect(
      fallback.mock.calls.some(([context]) => context.column.key === "amount")
    ).toBe(false);
    props.value = {
      ...props.value,
      columns,
      summaryRow: () => ({ amount: [h("b", "Total"), " ", h("span", "60")] }),
    };
    await tick();
    const nodes = mount({
      summaryRow: () => ({ amount: [h("b", "Total"), " ", h("span", "60")] }),
    });
    expect(find(summary(nodes.host), "b").textContent).toBe("Total");
    expect(find(summary(nodes.host), "span").textContent).toBe("60");
  });

  it("draws a column-footer-only row and keeps free tableFooter content separate from paging", async () => {
    const { host } = mount(
      {
        columns: [
          { key: "name", footer: () => h("strong", "Prepared") },
          ...columns.slice(1),
        ],
        classNames: { tableFooter: "custom-footer" },
      },
      {
        tableFooter: () => h("p", "Reviewed today"),
      }
    );
    expect(values(summary(host))).toEqual(["Prepared", "", ""]);
    const custom = find(host, part("table-footer"));
    expect(custom.className).toBe("custom-footer");
    expect(custom.textContent).toBe("Reviewed today");
    expect(custom.closest("table")).toBeNull();
    expect(
      custom.compareDocumentPosition(find(host, part("footer"))) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    const slotOnly = mount(
      {},
      { footer: ({ column }) => (column.key === "name" ? "Slot only" : null) }
    );
    expect(values(summary(slotOnly.host))).toEqual(["Slot only", "", ""]);
    const empty = mount({ data: [] }, { tableFooter: () => "Still useful" });
    expect(find(empty.host, part("table-footer")).textContent).toBe(
      "Still useful"
    );
    await tick();
  });

  it("uses labeled mobile fields for populated values and independent column footers, with no row controls", async () => {
    const { host, props } = mount({
      summaryRow,
      forceMobile: true,
      selectable: true,
      classNames: {
        card: "card",
        summaryCard: "summary-card",
        cardRow: "field",
        cardLabel: "caption",
        cardValue: "value",
      },
    });
    const card = find(host, part("summary-card"));
    expect(card.classList.contains("card")).toBe(true);
    expect(card.classList.contains("summary-card")).toBe(true);
    expect(card.getAttribute("role")).toBe("listitem");
    expect(card.querySelectorAll("dt")).toHaveLength(1);
    expect(find(card, "dt").textContent).toBe("Total amount");
    expect(find(card, "dd").textContent).toBe("60");
    expect(find(card, "dt").className).toBe("caption");
    expect(find(card, "dd").className).toBe("value");
    expect(
      card.querySelector("button,input,[tabindex],[aria-selected]")
    ).toBeNull();
    props.value = {
      ...props.value,
      summaryRow: undefined,
      columns: [{ key: "name", footer: () => "Verified" }, ...columns.slice(1)],
    };
    await tick();
    expect(find(host, part("summary-card")).textContent).toContain("Verified");
    const hiddenFooter = vi.fn(() => "Desktop only");
    props.value = {
      ...props.value,
      columns: [
        { key: "name", hideOnMobile: true, footer: hiddenFooter },
        ...columns.slice(1),
      ],
    };
    await tick();
    expect(host.querySelector(part("summary-card"))).toBeNull();
    expect(hiddenFooter).not.toHaveBeenCalled();
    props.value = { ...props.value, forceMobile: false };
    await tick();
    expect(values(summary(host))).toEqual(["", "Desktop only", "", ""]);
    props.value = { ...props.value, forceMobile: true, columns };
    await tick();
    expect(host.querySelector(part("summary-card"))).toBeNull();
  });
});
