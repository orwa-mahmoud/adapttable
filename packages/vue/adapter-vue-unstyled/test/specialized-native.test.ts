import type { ColumnDef } from "@adapttable/vue";
import type { PivotRow } from "@adapttable/vue/pivot";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { groupingPanel } from "../src/grouping-panel";
import { pivot, PivotPanel, pivotTableModel } from "../src/pivot";
import { rowDetail } from "../src/row-detail";
import { rowReorder } from "../src/row-reorder";
import { pinnedSummaryRows } from "../src/rows";
import { virtualize } from "../src/virtualize";
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
});
function mount(component: ReturnType<typeof defineComponent>) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(component);
  app.mount(root);
  cleanups.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
async function settle() {
  await nextTick();
  await nextTick();
}
function node<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
const rows = [
  { id: "a", team: "Core", amount: 4 },
  { id: "b", team: "Ops", amount: 8 },
  { id: "c", team: "Core", amount: 6 },
];
type Row = (typeof rows)[number];
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", header: "Team", groupable: true },
  { key: "amount", header: "Amount", aggregatable: true },
];
const base = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  searchable: false,
  urlSync: false,
  forceMobile: false,
};
describe("native specialized controls", () => {
  it("uses native grouping controls with core add/remove/aggregation writes", async () => {
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(DataTable<Row>, { ...base, features: [groupingPanel<Row>()] }),
      })
    );
    await settle();
    const add = node<HTMLSelectElement>(
      root,
      '[data-adapttable-part="grouping-add"]'
    );
    add.value = "team";
    add.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(
      root.querySelectorAll('[data-adapttable-part="grouping-chip"]')
    ).toHaveLength(1);
    expect(
      root.querySelectorAll('[data-adapttable-part="group-row"]')
    ).toHaveLength(2);
    const checkbox = node<HTMLInputElement>(
      root,
      '[data-adapttable-part="grouping-aggregation-add"] input'
    );
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(
      root.querySelector(
        '[data-adapttable-part="grouping-aggregation-operation"]'
      )
    ).not.toBeNull();
    node<HTMLButtonElement>(
      root,
      '[data-adapttable-part="grouping-aggregation-remove"]'
    ).click();
    await settle();
    expect(
      root.querySelector(
        '[data-adapttable-part="grouping-aggregation-operation"]'
      )
    ).toBeNull();
    const remove = node<HTMLButtonElement>(
      root,
      '[data-adapttable-part="grouping-chip"] button:last-child'
    );
    remove.click();
    await settle();
    expect(
      root.querySelector('[data-adapttable-part="grouping-chip"]')
    ).toBeNull();
  });
  it("moves grouping chips with logical RTL keyboard directions and preserves localized labels", async () => {
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(DataTable<Row>, {
            ...base,
            dir: "rtl",
            features: [groupingPanel<Row>(["team", "amount"])],
          }),
      })
    );
    await settle();
    const first = node<HTMLButtonElement>(
      root,
      '[data-adapttable-part="grouping-chip"] button'
    );
    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    await settle();
    expect(
      root.querySelector('[data-adapttable-part="grouping-chip"]')?.textContent
    ).toContain("Amount");
  });
  it("keeps pivot config controlled until the host accepts the native event", async () => {
    const config = shallowRef({
      rows: [] as string[],
      columns: [] as string[],
      measures: [{ key: "amount", agg: "sum" as const }],
    });
    const changes = vi.fn();
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(PivotPanel, {
            config: config.value,
            fields: [
              { key: "team", label: "Team" },
              { key: "amount", label: "Amount" },
            ],
            onChange: changes,
          }),
      })
    );
    const select = node<HTMLSelectElement>(root, '[data-zone="rows"] select');
    select.value = "team";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(changes).toHaveBeenCalled();
    expect(config.value.rows).toEqual([]);
    expect(
      root.querySelector(
        '[data-zone="rows"] [data-adapttable-part="pivot-field"]'
      )
    ).toBeNull();
    config.value = changes.mock.calls[0]![0];
    await settle();
    expect(
      root.querySelector(
        '[data-zone="rows"] [data-adapttable-part="pivot-field"]'
      )?.textContent
    ).toContain("Team");
  });
  it("reorders loaded row identity through a callback and mobile bounds are real buttons", async () => {
    const changed = vi.fn();
    const mobile = shallowRef(false);
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(DataTable<Row>, {
            ...base,
            forceMobile: mobile.value,
            features: [rowReorder<Row>(changed)],
          }),
      })
    );
    await settle();
    const grip = node<HTMLButtonElement>(
      root,
      '[data-adapttable-part="row-reorder-handle"]'
    );
    for (const key of [" ", "ArrowDown", " "]) {
      grip.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      await settle();
    }
    expect(changed).toHaveBeenCalledWith(0, 1, rows[0]);
    expect(root.querySelector('[data-row-id="a"]')).not.toBeNull();
    mobile.value = true;
    await settle();
    expect(
      node<HTMLButtonElement>(root, '[data-adapttable-part="row-reorder-up"]')
        .disabled
    ).toBe(true);
    node<HTMLButtonElement>(
      root,
      '[data-adapttable-part="row-reorder-down"]'
    ).click();
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it("imports and renders specialized combinations without browser globals during SSR", async () => {
    const features = [
      groupingPanel<Row>(["team"]),
      rowReorder<Row>(() => undefined),
      virtualize({ maxHeight: 240, virtualizeColumns: true }),
      rowDetail<Row>((row) => h("p", `Details ${row.id}`)),
    ];
    const html = await renderToString(
      createSSRApp({ render: () => h(DataTable<Row>, { ...base, features }) })
    );
    expect(html).toContain('data-adapttable-part="grouping-panel"');
    expect(html).toContain('data-adapttable-part="row-reorder-handle"');
    expect(html).not.toContain("window is not defined");
  });
  it("renders pivot totals through the same native summary-row controls", async () => {
    const result = pivot(rows, {
      rows: ["team"],
      columns: [],
      measures: [{ key: "amount", agg: "sum" }],
    });
    const model = pivotTableModel(result);
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(DataTable<PivotRow>, {
            data: model.rows,
            columns: model.columns,
            rowKey: model.rowKey,
            features: [pinnedSummaryRows(model.pinnedRows ?? {})],
            forceMobile: false,
            searchable: false,
            urlSync: false,
          }),
      })
    );
    await settle();
    expect(root.textContent).toContain("Grand total");
    expect(root.textContent).toContain("18");
  });
});
describe("native virtualized body ownership", () => {
  it("windows desktop rows and variable detail pairs, then releases all observers", async () => {
    const observers = new Map<ResizeObserverCallback, string>();
    class Observer {
      readonly callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe() {
        observers.set(this.callback, new Error().stack ?? "");
      }
      unobserve() {
        observers.delete(this.callback);
      }
      disconnect() {
        observers.delete(this.callback);
      }
    }
    vi.stubGlobal("ResizeObserver", Observer);
    cleanups.push(() => vi.unstubAllGlobals());
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.adapttablePart === "scroll-box" ? 240 : 56;
      }
    );
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(640);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(640);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        let height = 56;
        if (this.dataset.adapttablePart === "detail-row") height = 140;
        else if (this.dataset.adapttablePart === "scroll-box") height = 240;
        return {
          top: 0,
          bottom: height,
          left: 0,
          right: 640,
          width: 640,
          height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      }
    );
    const enabled = shallowRef(true);
    const data = Array.from({ length: 120 }, (_, index) => ({
      id: `r${index}`,
      team: "Core",
      amount: index,
    }));
    const features = [
      virtualize({ maxHeight: 240, estimateRowSize: 56, virtualOverscan: 2 }),
      rowDetail<Row>((row) => h("p", `Detail ${row.id}`)),
    ];
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(DataTable<Row>, {
            ...base,
            data,
            defaults: { limit: 120 },
            paginationMode: "infinite",
            features: enabled.value ? features : [],
          }),
      })
    );
    await settle();
    const visible = root.querySelectorAll("tbody [data-row-id]");
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(20);
    node<HTMLButtonElement>(
      root,
      '[data-adapttable-part="expand-button"]'
    ).click();
    await settle();
    expect(root.textContent).toContain("Detail r0");
    expect(
      root.querySelector(
        'tbody > tr[data-adapttable-part="virtual-spacer"]:last-child'
      )
    ).not.toBeNull();
    enabled.value = false;
    await settle();
    expect(root.querySelectorAll("tbody [data-row-id]")).toHaveLength(120);
    expect([...observers.values()]).toEqual([]);
  });
});
describe("native specialized decisions", () => {
  it("uses native nested move choices and both confirmation outcomes", async () => {
    const moved = vi.fn();
    const features = [
      groupingPanel<Row>(["team"]),
      rowReorder<Row>(() => undefined, {
        movePolicy: "confirm",
        onGroupMove: moved,
      }),
    ];
    const root = mount(
      defineComponent({
        setup: () => () => h(DataTable<Row>, { ...base, features }),
      })
    );
    await settle();
    const menu = node<HTMLSelectElement>(
      root,
      '[data-row-id="a"] [data-adapttable-part="row-move-menu"] select'
    );
    const target = [...menu.options].find(
      (option) => option.value !== "" && !option.disabled
    );
    expect(target).toBeDefined();
    menu.value = target!.value;
    menu.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    const buttons = [
      ...root.querySelectorAll<HTMLButtonElement>(
        '[data-row-id="a"] [data-adapttable-part="row-move-menu"] button'
      ),
    ];
    buttons.find((button) => button.textContent === "Cancel")?.click();
    await settle();
    expect(moved).not.toHaveBeenCalled();
    menu.value = target!.value;
    menu.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    [
      ...root.querySelectorAll<HTMLButtonElement>(
        '[data-row-id="a"] [data-adapttable-part="row-move-menu"] button'
      ),
    ]
      .find((button) => button.textContent === "Move")
      ?.click();
    expect(moved).toHaveBeenCalledOnce();
    const grip = node<HTMLButtonElement>(
      root,
      '[data-row-id="a"] [data-adapttable-part="row-reorder-handle"]'
    );
    const drag = new Event("dragstart", { bubbles: true });
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(() => "0"),
      effectAllowed: "",
      dropEffect: "",
    };
    Object.defineProperty(drag, "dataTransfer", { value: dataTransfer });
    Object.defineProperty(drag, "clientY", { value: 0 });
    grip.dispatchEvent(drag);
    await settle();
    expect(grip.getAttribute("aria-pressed")).toBe("true");
    grip.dispatchEvent(new Event("dragend", { bubbles: true }));
    await settle();
    expect(grip.getAttribute("aria-pressed")).toBe("false");
  });
  it("changes and reorders pivot measures through native selects and buttons", () => {
    const changed = vi.fn();
    const config = {
      rows: ["team", "amount"],
      columns: [],
      measures: [{ key: "amount", agg: "sum" as const }],
    };
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(PivotPanel, {
            config,
            fields: [
              { key: "team", label: "Team" },
              { key: "amount", label: "Amount" },
            ],
            onChange: changed,
          }),
      })
    );
    const aggregation = node<HTMLSelectElement>(
      root,
      'select[aria-label="Aggregation"]'
    );
    aggregation.value = "avg";
    aggregation.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changed).toHaveBeenCalledWith(
      expect.objectContaining({ measures: [{ key: "amount", agg: "avg" }] })
    );
    node<HTMLButtonElement>(
      root,
      'button[aria-label="Move down: Team"]'
    ).click();
    node<HTMLButtonElement>(
      root,
      'button[aria-label="Move up: Amount"]'
    ).click();
    node<HTMLButtonElement>(
      root,
      'button[aria-label="Remove field: Team"]'
    ).click();
    expect(changed).toHaveBeenCalledTimes(4);
  });
});
