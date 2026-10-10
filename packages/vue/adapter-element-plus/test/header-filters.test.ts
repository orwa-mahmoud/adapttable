import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { ElConfigProvider } from "element-plus";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
  shallowRef,
} from "vue";

import DataTable from "../src/DataTable.vue";
import { filters } from "../src/filters";
import { fullscreen } from "../src/fullscreen";
import {
  FilterHeaderControl,
  FilterHeaderRow,
  headerFilters,
} from "../src/header-filters";
import { mount, node } from "./mount";

interface Row {
  name: string;
  active: boolean;
  amount: number;
}
const labels = resolveLabels(undefined);
const data: Row[] = [
  { name: "Ada", active: true, amount: 2 },
  { name: "Grace", active: false, amount: 5 },
];
const base = {
  data,
  columns: [{ key: "name", header: "Name" }],
  rowKey: (row: Row) => row.name,
  urlSync: false,
  forceMobile: false,
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
function escape(input: HTMLElement) {
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
}
function form() {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  let accept = true;
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    if (accept) extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn((patch: FilterFormSource<Row>["extra"]) => {
    if (accept) extra.value = { ...extra.value, ...patch };
  });
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
  }));
  return {
    extra,
    source,
    setExtra,
    setExtras,
    reject: () => {
      accept = false;
    },
  };
}
async function choose(root: ParentNode, label: string) {
  node<HTMLInputElement>(root, 'input[role="combobox"]').click();
  await tick();
  const option = [
    ...root.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim() === label);
  if (!option) throw new Error(`Missing option ${label}`);
  option.click();
  await tick();
}
const restores: (() => void)[] = [];
afterEach(() =>
  restores
    .splice(0)
    .reverse()
    .forEach((restore) => restore())
);
function property(target: object, key: string, descriptor: PropertyDescriptor) {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { ...descriptor, configurable: true });
  restores.push(() => {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  });
}

describe("Element Plus header filters", () => {
  it("keeps native search attrs and host styling while rejected writes remain controlled", async () => {
    const state = form();
    const { root } = mount(() =>
      h(FilterHeaderControl<Row>, {
        def: { key: "name", type: "text", label: "Name" },
        source: state.source.value,
        labels,
        className: "compact",
        id: "name-filter",
        "data-consumer": "yes",
      })
    );
    await tick();
    const input = node<HTMLInputElement>(
      root,
      `input${part("filter-header-input")}`
    );
    expect(input.type).toBe("search");
    expect(input.id).toBe("name-filter");
    expect(input.getAttribute("data-consumer")).toBe("yes");
    expect(input.closest(".el-input")?.classList.contains("compact")).toBe(
      true
    );
    await write(input, "Ada");
    expect(state.extra.value.name).toBe("Ada");
    state.reject();
    await write(input, "reject");
    expect(input.value).toBe("Ada");
    expect(state.setExtras).toHaveBeenCalledTimes(2);
  });

  it("uses actual single and boolean selects with the binding's serialized values", async () => {
    const state = form();
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "select",
      options: [{ value: "Ada", label: "Ada" }],
    });
    const { root } = mount(() =>
      h(FilterHeaderControl<Row>, {
        def: def.value,
        source: state.source.value,
        labels,
        className: "choice",
      })
    );
    await tick();
    expect(
      node(root, part("filter-header-input")).classList.contains("el-select")
    ).toBe(true);
    await choose(root, "Ada");
    expect(state.extra.value.name).toEqual(["Ada"]);
    def.value = { key: "active", type: "boolean" };
    await tick();
    await choose(root, labels.boolFalse);
    expect(state.extra.value.active).toBe("false");
    expect(
      node(root, part("filter-header-input")).classList.contains("choice")
    ).toBe(true);
  });

  it("keeps the range marker on the pair and both inputs controlled", async () => {
    const state = form();
    state.extra.value = { amountMin: 2, amountMax: 5, amountOp: "between" };
    const { root } = mount(() =>
      h(FilterHeaderControl<Row>, {
        def: { key: "amount", type: "numberRange" },
        source: state.source.value,
        labels,
        className: "pair",
      })
    );
    await tick();
    const pair = node(root, part("filter-header-input"));
    expect(pair.tagName).toBe("SPAN");
    expect(pair.classList.contains("pair")).toBe(true);
    const inputs = pair.querySelectorAll<HTMLInputElement>("input");
    expect(inputs).toHaveLength(2);
    expect(pair.querySelectorAll(".el-input")).toHaveLength(2);
    await write(inputs[0]!, "0");
    await write(inputs[1]!, "9");
    expect(state.extra.value.amountMin).toBe("0");
    expect(state.extra.value.amountMax).toBe("9");
    state.reject();
    await write(inputs[1]!, "100");
    expect(inputs[1]!.value).toBe("9");
    expect(pair.querySelector(part("filter-header-input"))).toBeNull();
  });

  it("aligns the compact row with prepared columns and auxiliary spacers", async () => {
    const state = form();
    const { root } = mount(() =>
      h("table", [
        h("thead", [
          h(FilterHeaderRow<Row>, {
            columns: [{ key: "amount" }, { key: "name" }],
            defs: [{ key: "name", type: "text" }],
            source: state.source.value,
            labels,
            selection: true,
            showActions: true,
            columnSpacers: { start: 40, end: 90 },
            classNames: {
              filterHeaderRow: "row",
              filterHeaderCell: "cell",
              filterHeaderInput: "field",
            },
          }),
        ]),
      ])
    );
    await tick();
    const row = node(root, part("filter-header-row"));
    expect(row.tagName).toBe("TR");
    expect(row.children).toHaveLength(6);
    expect(row.classList.contains("row")).toBe(true);
    const cell = node(row, '[data-column-key="name"]');
    expect(cell.classList.contains("cell")).toBe(true);
    expect(node(cell, ".el-input").classList.contains("field")).toBe(true);
    await write(node<HTMLInputElement>(cell, "input"), "Grace");
    expect(state.extra.value.name).toBe("Grace");
    expect(node(row, '[data-column-key="amount"]').children).toHaveLength(0);
  });

  it("uses the kit funnel, respects provider stacking, and restores trigger focus after Escape", async () => {
    const { root } = mount(() =>
      h(
        ElConfigProvider,
        { zIndex: 8000 },
        {
          default: () =>
            h(DataTable<Row>, {
              ...base,
              features: [
                filters<Row>([{ key: "name", type: "text" }]),
                headerFilters(),
              ],
              classNames: {
                filterHeaderTrigger: "funnel",
                filterHeaderInput: "inline",
              },
              dir: "rtl",
            }),
        }
      )
    );
    await tick();
    const trigger = node<HTMLButtonElement>(
      root,
      part("filter-header-trigger")
    );
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.classList.contains("el-button")).toBe(true);
    expect(trigger.classList.contains("funnel")).toBe(true);
    expect(root.querySelector(".inline")).toBeNull();
    trigger.click();
    await tick();
    const surface = node<HTMLElement>(document, part("filter-header-cell"));
    const dialog = surface.closest<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(Number(dialog!.style.zIndex)).toBeGreaterThanOrEqual(8000);
    expect(surface.getAttribute("dir")).toBe("rtl");
    const input = node<HTMLInputElement>(
      surface,
      'input[data-adapttable-part="filter-input"]'
    );
    await write(input, "Ada");
    await vi.waitFor(() =>
      expect(root.querySelectorAll("tbody tr")).toHaveLength(1)
    );
    input.focus();
    escape(input);
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("moves an open header popup with the binding-owned fullscreen container", async () => {
    const platform: { current: Element | null } = { current: null };
    property(document, "fullscreenEnabled", { value: true });
    property(document, "fullscreenElement", { get: () => platform.current });
    property(HTMLElement.prototype, "requestFullscreen", {
      value: function (this: HTMLElement) {
        platform.current = this;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
    property(document, "exitFullscreen", {
      value: () => {
        platform.current = null;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          filters<Row>([{ key: "name", type: "text" }]),
          headerFilters(),
          fullscreen(),
        ],
      })
    );
    await tick();
    node<HTMLButtonElement>(root, part("filter-header-trigger")).click();
    await tick();
    const table = node<HTMLElement>(root, part("root"));
    const panel = () => node(document, part("filter-header-cell"));
    expect(table.contains(panel())).toBe(false);
    node<HTMLButtonElement>(root, part("fullscreen-toggle")).click();
    await tick();
    expect(table.contains(panel())).toBe(true);
    node<HTMLButtonElement>(root, part("fullscreen-toggle")).click();
    await tick();
    expect(table.contains(panel())).toBe(false);
  });

  it("dismisses the compact multiselect with Escape and deactivation without stale writes", async () => {
    const state = form();
    const shown = ref(true);
    const Child = defineComponent(
      () => () =>
        h(FilterHeaderControl<Row>, {
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: state.source.value,
          labels,
          className: "multi",
          menuClassName: "menu",
        })
    );
    const { root } = mount(() =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("div")) })
    );
    await tick();
    const trigger = node<HTMLButtonElement>(root, part("filter-header-input"));
    trigger.click();
    await tick();
    const menu = node<HTMLElement>(document, part("filter-header-menu"));
    expect(root.contains(menu)).toBe(false);
    const input = node<HTMLInputElement>(menu, "input");
    input.click();
    await tick();
    expect(state.extra.value.name).toEqual(["Ada"]);
    input.focus();
    escape(input);
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await tick();
    shown.value = false;
    await tick();
    const count = state.setExtra.mock.calls.length;
    input.click();
    await tick();
    expect(state.setExtra).toHaveBeenCalledTimes(count);
    shown.value = true;
    await tick();
    expect(
      node(root, part("filter-header-input")).getAttribute("aria-expanded")
    ).toBe("false");
  });
  it("preserves an open multiselect across source snapshots and rejects stale definition writes", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const source = shallowRef<FilterFormSource<Row>>({
      extra: {},
      setExtra: first,
      setExtras: vi.fn(),
    });
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "multiSelect",
      options: [{ value: "Ada", label: "Ada" }],
    });
    const { root } = mount(() =>
      h(FilterHeaderControl<Row>, {
        def: def.value,
        source: source.value,
        labels,
      })
    );
    await tick();
    node<HTMLButtonElement>(root, part("filter-header-input")).click();
    await tick();
    const oldInput = node<HTMLInputElement>(
      document,
      `${part("filter-header-menu")} input`
    );
    source.value = {
      extra: { name: ["Ada"] },
      setExtra: second,
      setExtras: vi.fn(),
    };
    await tick();
    expect(
      node(root, part("filter-header-input")).getAttribute("aria-expanded")
    ).toBe("true");
    expect(oldInput.checked).toBe(true);
    oldInput.click();
    await tick();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith("name", undefined);
    def.value = {
      key: "active",
      type: "multiSelect",
      options: [{ value: "true", label: "Active" }],
    };
    await tick();
    expect(
      node(root, part("filter-header-input")).getAttribute("aria-expanded")
    ).toBe("false");
    oldInput.click();
    await tick();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("closes only the nested choice first, then the header popup, and removes disabled fills", async () => {
    const enabled = ref(true);
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          filters<Row>([
            {
              key: "name",
              type: "select",
              options: [{ value: "Ada", label: "Ada" }],
            },
          ]),
          ...(enabled.value ? [headerFilters()] : []),
        ],
      })
    );
    await tick();
    const trigger = node<HTMLButtonElement>(
      root,
      part("filter-header-trigger")
    );
    trigger.click();
    await tick();
    const input = node<HTMLInputElement>(
      document,
      `${part("filter-header-cell")} input[role="combobox"]`
    );
    input.click();
    await tick();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    escape(input);
    await tick();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    escape(input);
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await tick();
    enabled.value = false;
    await tick();
    expect(root.querySelector(part("filter-header-trigger"))).toBeNull();
    expect(document.querySelector(part("filter-header-cell"))).toBeNull();
  });
  it("dismisses compact choices from their focused trigger without swallowing closed Escape", async () => {
    const state = form();
    const parentKey = vi.fn();
    const { root } = mount(() =>
      h("section", { onKeydown: parentKey }, [
        h(FilterHeaderControl<Row>, {
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: state.source.value,
          labels,
        }),
      ])
    );
    await tick();
    const trigger = node<HTMLButtonElement>(root, part("filter-header-input"));
    trigger.focus();
    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    escape(trigger);
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(parentKey).not.toHaveBeenCalled();
    escape(trigger);
    await tick();
    expect(parentKey).toHaveBeenCalledTimes(1);
  });
});
