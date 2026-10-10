import { aggregate, resolveLabels } from "@adapttable/core";
import { slotRender } from "@adapttable/core/binding";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { toVueAttrs } from "../src/attrs";
import {
  cellSpan,
  pinnedSummaryRows,
  rowAppearance,
} from "../src/features/headlessFactories";
import { rowDetail } from "../src/features/rowDetail";
import { extendFeature } from "../src/features/tableFeature";
import { GroupRowChrome } from "../src/grouping/groupRowChrome";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import type { TableBodySlot } from "../src/layout/tableModels";
import {
  groupingPanel,
  GroupingPanelChrome,
  groupingPanelControlKey,
  type GroupingPanelProps,
  type GroupingPanelSlots,
} from "../src/specialized/groupingPanel";
import {
  rowReorder,
  RowReorderChrome,
  rowReorderControlKey,
  type RowReorderControlSlots,
} from "../src/specialized/rowReorder";
import {
  virtualize,
  windowBodyColumns,
  windowBodySlots,
} from "../src/specialized/virtualize";
import { useDataTableShell } from "../src/useDataTableShell";
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Fixture missing");
  return value;
}
const rows = [
  { id: "a", team: "Core", amount: 5 },
  { id: "b", team: "Other", amount: 9 },
];
type Row = (typeof rows)[number];
const columns = [
  { key: "team", header: "Team", groupable: true },
  { key: "amount", header: "Amount", aggregatable: true },
];
function render(draw: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render: draw });
  app.mount(root);
  cleanups.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
const controls: GroupingPanelSlots = {
  Surface: ({ children, label, mobile, ...attrs }) =>
    h(
      "div",
      {
        ...toVueAttrs(attrs),
        role: "group",
        "aria-label": label,
        "data-mobile": mobile ? "" : undefined,
      },
      [children]
    ),
  DropZone: (props) =>
    h(
      "span",
      {
        ...toVueAttrs({ ...props.dropProps }),
        "data-adapttable-part": props["data-adapttable-part"],
      },
      props.empty ? props.label : ""
    ),
  Chip: (props) =>
    h("span", { "data-adapttable-part": props["data-adapttable-part"] }, [
      h(
        "button",
        {
          ...toVueAttrs({ ...props.keyboardProps }),
          ...toVueAttrs({ ...props.dragProps }),
        },
        props.label
      ),
      h(
        "button",
        { "aria-label": props.removeLabel, onClick: props.onRemove },
        "Remove"
      ),
    ]),
  Select: (props) =>
    h(
      "select",
      {
        "aria-label": props.label,
        value: props.value,
        disabled: props.disabled,
        "data-adapttable-part": props["data-adapttable-part"],
        onChange: (event: Event) => {
          if (event.target instanceof HTMLSelectElement)
            props.onChange(event.target.value);
        },
      },
      [
        h("option", { value: "" }, props.label),
        ...props.options.map((option) =>
          h("option", { value: option.value }, option.label)
        ),
      ]
    ),
  RemoveZone: (props) =>
    h(
      "span",
      {
        ...toVueAttrs({ ...props.dropProps }),
        "data-adapttable-part": props["data-adapttable-part"],
      },
      props.label
    ),
  AggregationItem: (props) =>
    h("span", { "data-adapttable-part": props["data-adapttable-part"] }, [
      props.label,
      props.readOnly ? props.readOnlyLabel : null,
      props.children,
    ]),
  AggregationRemove: (props) =>
    h(
      "button",
      {
        "aria-label": props.label,
        "data-adapttable-part": props["data-adapttable-part"],
        onClick: props.onRemove,
      },
      "Remove"
    ),
  AggregationPicker: (props) =>
    h(
      "div",
      { "data-adapttable-part": props["data-adapttable-part"] },
      props.options.map((option) =>
        h("input", {
          type: "checkbox",
          "aria-label": option.label,
          checked: option.checked,
          disabled: props.disabled,
          onChange: (event: Event) => {
            if (event.target instanceof HTMLInputElement)
              props.onToggle(option.value, event.target.checked);
          },
        })
      )
    ),
  AggregationRestore: (props) =>
    h(
      "button",
      { onClick: props.onRestore, disabled: props.disabled },
      props.label
    ),
};
function click(root: ParentNode, selector: string) {
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(selector);
  button.click();
}
function change(root: ParentNode, selector: string, value: string) {
  const select = root.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(selector);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
async function settle() {
  await nextTick();
  await nextTick();
}
describe("shared grouping Chrome controls", () => {
  it("owns grouping initialization, aggregation reconciliation, focus and host callbacks", async () => {
    const scope = effectScope();
    cleanups.push(() => scope.stop());
    const feature = extendFeature(
      groupingPanel<Row>(["team"], {
        groupAggregates: aggregate<Row>({ amount: "sum" }),
      }),
      [
        slotRender(groupingPanelControlKey<Row>(), (props) =>
          GroupingPanelChrome({ ...props, slots: controls })
        ),
      ]
    );
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          columns,
          rowKey: (row) => row.id,
          features: [feature],
          urlSync: false,
        })
      )
    );
    const root = render(() => shell.renderGroupingPanel());
    await settle();
    expect(shell.groupingPanel.value?.state.groupBy).toEqual(["team"]);
    expect(
      root.querySelector(
        '[data-adapttable-part="grouping-aggregation-operation"]'
      )
    ).not.toBeNull();
    change(
      root,
      '[data-adapttable-part="grouping-aggregation-operation"]',
      "count"
    );
    await settle();
    expect(shell.groupingPanel.value?.state.aggregateOverrides.amount).toBe(
      "count"
    );
    click(root, '[data-adapttable-part="grouping-aggregation-remove"]');
    await settle();
    expect(shell.groupingPanel.value?.state.aggregations.items).toHaveLength(0);
    const picker = required(
      root.querySelector<HTMLInputElement>('input[aria-label="Amount"]') ??
        undefined
    );
    picker.checked = true;
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    picker.checked = false;
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    const restore = [...root.querySelectorAll("button")].find(
      (button) =>
        button.textContent ===
        shell.table.labels.value.groupingRestoreAggregations
    );
    required(restore).click();
    await settle();
    expect(shell.groupingPanel.value?.state.aggregations.atDefaults).toBe(true);
    change(root, '[data-adapttable-part="grouping-add"]', "amount");
    await settle();
    expect(shell.groupingPanel.value?.state.groupBy).toEqual([
      "team",
      "amount",
    ]);
    click(root, '[data-adapttable-part="grouping-chip"] button:last-child');
    await settle();
    expect(shell.groupingPanel.value?.state.groupBy).toEqual(["amount"]);
    const stale = required(shell.groupingPanel.value).state;
    scope.stop();
    stale.add("team");
    expect(shell.source.value.groupBy).toBe("amount");
  });
  it("renders drag boundaries and read-only aggregations in both directions without fallback controls", async () => {
    const scope = effectScope();
    cleanups.push(() => scope.stop());
    const feature = extendFeature(groupingPanel<Row>(["team", "amount"]), [
      slotRender(groupingPanelControlKey<Row>(), () => null),
    ]);
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          columns,
          rowKey: (row) => row.id,
          features: [feature],
          urlSync: false,
        })
      )
    );
    const input = shallowRef<GroupingPanelProps<Row>>(
      required(shell.groupingPanel.value)
    );
    const captured = {
      ...controls,
      AggregationItem: vi.fn(controls.AggregationItem),
      DropZone: vi.fn(controls.DropZone),
    };
    const root = render(() =>
      GroupingPanelChrome({ ...input.value, slots: captured })
    );
    input.value = {
      ...input.value,
      state: {
        ...input.value.state,
        drag: { key: "team", source: "chip", overIndex: 1, overRemove: true },
      },
    };
    await settle();
    expect(
      root.querySelector('[data-adapttable-part="grouping-remove-zone"]')
    ).not.toBeNull();
    input.value = {
      ...input.value,
      mobile: true,
      state: {
        ...input.value.state,
        drag: undefined,
        aggregations: {
          ...input.value.state.aggregations,
          items: [
            {
              columnKey: "missing",
              editable: false,
              origin: "host",
              operations: [],
            },
          ],
        },
      },
    };
    await settle();
    expect(
      root.querySelector('[data-adapttable-part="grouping-drop-zone"]')
    ).toBeNull();
    expect(captured.AggregationItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ readOnly: true, label: "missing" })
    );
    input.value = {
      ...input.value,
      mobile: false,
      state: {
        ...input.value.state,
        groupBy: [],
        drag: { key: "amount", source: "header", overIndex: 0 },
      },
    };
    await settle();
    expect(
      root.querySelector('[data-adapttable-part="grouping-drop-zone"]')
        ?.textContent
    ).toBe(shell.table.labels.value.groupingDropColumns);
  });
});
const tableControls: TableChromeSlots<Row> = {
  ColumnGroupToggle: ({ onToggle, cell }) =>
    h(
      "button",
      {
        onClick: () => {
          if (cell.id) onToggle(cell.id);
        },
      },
      "Toggle"
    ),
  SortButton: ({ attrs, content }) => h("button", attrs, [content]),
  SelectionCheckbox: ({ attrs }) => h("input", { ...attrs, type: "checkbox" }),
  RowDetailToggle: ({ attrs }) => h("button", attrs, "Details"),
  TreeToggle: ({ attrs }) => h("button", attrs, "Tree"),
  GroupRow: (props) =>
    GroupRowChrome({
      ...props,
      slots: {
        Button: ({ attrs, content }) => h("button", attrs, [content]),
        Checkbox: ({ attrs }) => h("input", { ...attrs, type: "checkbox" }),
      },
    }),
};
describe("shared virtualized structure", () => {
  it("keeps horizontal windows, pinned columns and grouped headers aligned", () => {
    const scope = effectScope();
    cleanups.push(() => scope.stop());
    const many = Array.from({ length: 30 }, (_, index) => ({
      key: `c${index}`,
      header: `Column ${index}`,
      group: [index < 15 ? "First" : "Last"],
    }));
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          rowKey: (row) => row.id,
          columns: many,
          features: [virtualize(false)],
          urlSync: false,
        })
      )
    );
    const original = shell.bodyProjection.value.desktop;
    const window = windowBodyColumns(original, {
      enabled: true,
      viewport: { start: 1600, width: 320 },
      widths: { c0: 80 },
      pinnedKeys: new Set(["c0"]),
      collapsible: true,
    });
    expect(window.headers.map((header) => header.key)).toContain("c0");
    expect(window.headers.length).toBeLessThan(30);
    expect(window.columnSpacers?.start).toBeGreaterThan(0);
    expect(window.headerPlan?.length).toBeGreaterThan(1);
    const root = render(() =>
      DesktopTableChrome({ model: window, slots: tableControls })
    );
    expect(
      root.querySelectorAll('[data-adapttable-part="column-spacer-start"]')
    ).toHaveLength(3);
    expect(
      windowBodyColumns(original, {
        enabled: false,
        viewport: { start: 0, width: 400 },
      })
    ).toBe(original);
  });
  it("retains complete spans and structural group/detail boundaries", () => {
    const scope = effectScope();
    cleanups.push(() => scope.stop());
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          rowKey: (row) => row.id,
          columns,
          features: [cellSpan<Row>(() => ({ colSpan: 2 })), virtualize(false)],
          urlSync: false,
        })
      )
    );
    const original = shell.bodyProjection.value.desktop;
    expect(
      windowBodyColumns(original, {
        enabled: true,
        viewport: { start: 0, width: 40 },
      })
    ).toBe(original);
    const detail = { expanded: true, toggleAttrs: {}, render: () => "Details" };
    const row = { ...required(original.rows[0]), detail };
    const slots: TableBodySlot<Row>[] = [
      { kind: "row", key: "a", wiring: row },
      { kind: "extra", key: "note", extraKind: "fullWidth", colSpan: 2 },
    ];
    const callbacks: ((node: Element | null) => void)[] = [];
    const window = windowBodySlots(
      slots,
      { enabled: true, indices: [0, 1], paddingTop: 0, paddingBottom: 2 },
      2,
      () => {
        const callback = vi.fn();
        callbacks.push(callback);
        return callback;
      }
    );
    render(() =>
      DesktopTableChrome({
        model: { ...original, bodySlots: window },
        slots: tableControls,
      })
    );
    expect(
      callbacks.some((callback) =>
        vi.mocked(callback).mock.calls.some(([node]) => node?.tagName === "TR")
      )
    ).toBe(true);
    render(() =>
      MobileCardsChrome({
        model: { ...shell.bodyProjection.value.mobile, bodySlots: window },
        slots: tableControls,
      })
    );
  });
  it("mounts real row windows, switches mobile geometry and disposes listeners", async () => {
    class Observer {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    }
    vi.stubGlobal("ResizeObserver", Observer);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(240);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      width: 400,
      height: 56,
      bottom: 56,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const mobile = shallowRef(false);
    const enabled = shallowRef(true);
    const values = Array.from({ length: 100 }, (_, index) => ({
      id: String(index),
      team: "Core",
      amount: index,
    }));
    let shell: ReturnType<typeof useDataTableShell<Row>> | undefined;
    const root = document.createElement("div");
    document.body.append(root);
    const app = createApp(
      defineComponent({
        setup() {
          shell = useDataTableShell(() => ({
            data: values,
            columns,
            rowKey: (row: Row) => row.id,
            forceMobile: mobile,
            defaults: { limit: 100 },
            paginationMode: "infinite",
            urlSync: false,
            features: enabled.value
              ? [
                  virtualize({ maxHeight: 240, virtualizeColumns: true }),
                  rowAppearance<Row>({ rowHeight: 48 }),
                  rowDetail<Row>(() => h("p", "Panel")),
                  pinnedSummaryRows<Row>({ bottom: [rows[0]!] }),
                ]
              : [],
          }));
          return () =>
            h(
              "div",
              {
                ref: (value) => {
                  if (value instanceof HTMLElement)
                    shell?.setSurface({
                      rootElement: () => value,
                      scrollElement: () => value.querySelector("div"),
                    });
                },
              },
              [
                h("div", { "data-adapttable-part": "scroll-box" }, [
                  mobile.value
                    ? MobileCardsChrome({
                        model: required(shell).mobile.value,
                        slots: tableControls,
                      })
                    : DesktopTableChrome({
                        model: required(shell).desktop.value,
                        slots: tableControls,
                      }),
                ]),
              ]
            );
        },
      })
    );
    app.mount(root);
    cleanups.push(() => {
      app.unmount();
      root.remove();
    });
    await settle();
    expect(root.querySelectorAll("tbody [data-row-id]").length).toBeLessThan(
      20
    );
    expect(required(shell).bodyWindow.value?.logicalRows).toHaveLength(100);
    expect(required(shell).desktop.value.rows.length).toBeLessThan(20);
    required(shell).bodyWindow.value?.scrollToRow("missing");
    mobile.value = true;
    await settle();
    expect(root.querySelector('[data-adapttable-part="cards"]')).not.toBeNull();
    enabled.value = false;
    await settle();
    expect(required(shell).bodyWindow.value).toBeUndefined();
  });
});
describe("neutral row move menu binding", () => {
  it("routes cross-group confirmation to the host and keeps the destination menu locked until resolution", () => {
    const scope = effectScope();
    cleanups.push(() => scope.stop());
    const moved = vi.fn();
    const menus: Parameters<RowReorderControlSlots["Menu"]>[0][] = [];
    const handles: Parameters<RowReorderControlSlots["Handle"]>[0][] = [];
    const buttons: Parameters<RowReorderControlSlots["Button"]>[0][] = [];
    const slots: RowReorderControlSlots = {
      Handle: (props) => {
        handles.push(props);
        return null;
      },
      Button: (props) => {
        buttons.push(props);
        return null;
      },
      Menu: (props) => {
        menus.push(props);
        return null;
      },
    };
    const panel = extendFeature(groupingPanel<Row>(["team"]), [
      slotRender(groupingPanelControlKey<Row>(), () => null),
    ]);
    const reorder = extendFeature(
      rowReorder<Row>(() => undefined, {
        movePolicy: "confirm",
        onGroupMove: moved,
      }),
      [
        slotRender(rowReorderControlKey<Row>(), (props) =>
          RowReorderChrome({ ...props, slots })
        ),
      ]
    );
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: rows,
          columns,
          rowKey: (row) => row.id,
          features: [panel, reorder],
          urlSync: false,
        })
      )
    );
    const draw = (mobile = false) => {
      const slot = shell.desktop.value.bodySlots?.find(
        (slot) => slot.kind === "row" && slot.wiring.key === "a"
      );
      if (slot?.kind !== "row") throw new Error("Row missing");
      slot.wiring.reorder?.(mobile);
    };
    draw();
    const menu = required(menus.at(-1));
    const target = required(menu.items.find((item) => !item.disabled));
    target.onSelect();
    draw();
    expect(required(menus.at(-1)).confirmation).toBeDefined();
    expect(required(handles.at(-1)).disabled).toBe(true);
    required(menus.at(-1)?.confirmation).onCancel();
    draw(true);
    expect(buttons).toHaveLength(2);
    target.onSelect();
    draw();
    required(menus.at(-1)?.confirmation).onConfirm();
    expect(moved).toHaveBeenCalledWith(
      rows[0],
      expect.any(Object),
      expect.any(Object),
      expect.any(Number)
    );
    const handle = required(handles.at(-1));
    const transfer = {
      effectAllowed: "uninitialized" as const,
      dropEffect: "none" as const,
      setData: vi.fn(),
      getData: vi.fn(() => "0"),
    };
    const event = {
      dataTransfer: transfer,
      clientY: 1,
      currentTarget: null,
      preventDefault: vi.fn(),
    };
    handle.dragProps.onDragStart(event);
    handle.dragProps.onDragEnd();
    handle.onKeyDown({
      key: "Escape",
      currentTarget: null,
      preventDefault: vi.fn(),
    });
    const attrs = required(shell.rowReorder.value).rowAttrs(
      "b",
      1,
      rows[1]!,
      0
    );
    (attrs.onDragover as (event: object) => void)({
      ...event,
      dataTransfer: null,
    });
    (attrs.onDrop as (event: object) => void)({ ...event, dataTransfer: null });
    (attrs.onDragover as (event: object) => void)(event);
    (attrs.onDrop as (event: object) => void)(event);
    expect(resolveLabels(undefined).confirmRowMoveTitle).toBeTruthy();
  });
});
