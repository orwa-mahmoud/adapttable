import type {
  FilterDef,
  FilterFormSource,
  QueryFilterGroup,
} from "@adapttable/vue";
import {
  defaultFilterRegistry,
  type FilterHeaderRowProps,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { BasicFilterField } from "../src/filters/BasicFilterField";
import { FilterField } from "../src/filters/FilterField";
import { FilterHeaderControl } from "../src/filters/FilterHeaderControl";
import { FilterHeaderRow } from "../src/filters/FilterHeaderRow";
import { FilterPopover } from "../src/filters/FilterPopover";
import { FilterTree } from "../src/filters/FilterTree";
import { HeaderFilter } from "../src/filters/HeaderFilter";
import { headerFilters } from "../src/header-filters";

interface Row {
  id: string;
  name: string;
  score: number;
  active: boolean;
}
const data: Row[] = [
  { id: "a", name: "Ada", score: 12, active: true },
  { id: "b", name: "Bea", score: 25, active: false },
];
const labels = resolveLabels({});
const options = [
  { value: "Ada", label: "Ada" },
  { value: "Bea", label: "Bea" },
];
const cleanups: (() => void)[] = [];
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
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
  );
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.unstubAllGlobals();
});
function mount(render: () => VNode) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(root);
  cleanups.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
function get<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
const part = (value: string) => `[data-adapttable-part="${value}"]`;
async function input(element: HTMLInputElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}
async function select(element: HTMLSelectElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event("change", { bubbles: true }));
  await nextTick();
}
async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
function source(initial: FilterFormSource<Row>["extra"] = {}, accept = true) {
  const extra = shallowRef(initial);
  const setExtra = vi.fn((key: string, value: unknown) => {
    if (accept)
      extra.value = {
        ...extra.value,
        [key]: value as FilterFormSource<Row>["extra"][string],
      };
  });
  const setExtras = vi.fn((values: FilterFormSource<Row>["extra"]) => {
    if (accept) extra.value = { ...extra.value, ...values };
  });
  const read = (): FilterFormSource<Row> => ({
    extra: extra.value,
    setExtra,
    setExtras,
    allFilteredRows: data,
  });
  return { extra, setExtra, setExtras, read };
}

describe("shadcn filter fields", () => {
  it("uses real input/operator targets, labels, hooks, RTL, and accepted host state", async () => {
    const state = source();
    const root = mount(() =>
      h(BasicFilterField<Row>, {
        def: { key: "name", type: "text", label: "Person" },
        source: state.read(),
        labels,
        dir: "rtl",
        classNames: {
          filterField: "field-hook",
          filterInput: "input-hook",
          filterOperator: "operator-hook",
        },
      })
    );
    expect(
      get(root, part("filter-field")).classList.contains("field-hook")
    ).toBe(true);
    const value = get<HTMLInputElement>(root, "input");
    expect(value.dataset.slot).toBe("input");
    expect(value.dir).toBe("rtl");
    expect(value.getAttribute("aria-label")).toBe("Person");
    expect(value.classList.contains("input-hook")).toBe(true);
    const operator = get<HTMLSelectElement>(root, "select");
    expect(operator.dataset.slot).toBe("native-select");
    expect(operator.dir).toBe("rtl");
    expect(operator.classList.contains("operator-hook")).toBe(true);
    expect(operator.parentElement?.classList.contains("operator-hook")).toBe(
      false
    );
    await input(value, "Ada");
    expect(state.extra.value.name).toBe("Ada");
    expect(value.value).toBe("Ada");
    await select(operator, "eq");
    expect(state.extra.value.nameOp).toBe("eq");
  });

  it("reconciles rejected text and select requests", async () => {
    const state = source({ name: "Ada" }, false);
    const root = mount(() =>
      h(BasicFilterField<Row>, {
        def: { key: "name", type: "select", options },
        source: state.read(),
        labels,
      })
    );
    const choice = get<HTMLSelectElement>(root, "select");
    await select(choice, "Bea");
    expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", "Bea");
    expect(choice.value).toBe("Ada");
    const text = mount(() =>
      h(BasicFilterField<Row>, {
        def: { key: "name", type: "text" },
        source: state.read(),
        labels,
      })
    );
    const value = get<HTMLInputElement>(text, "input");
    await input(value, "Bea");
    expect(value.value).toBe("Ada");
  });

  it("renders and clears boolean choices", async () => {
    const state = source();
    const root = mount(() =>
      h(BasicFilterField<Row>, {
        def: { key: "active", type: "boolean" },
        source: state.read(),
        labels,
      })
    );
    const choice = get<HTMLSelectElement>(root, "select");
    await select(choice, "true");
    expect(state.extra.value.active).toBe("true");
    await select(choice, "false");
    expect(state.extra.value.active).toBe("false");
    await select(choice, "");
    expect(state.extra.value.active).toBeUndefined();
  });

  it.each(["numberRange", "dateRange"] as const)(
    "renders binding-owned %s bounds and unary operators",
    async (type) => {
      const state = source({ scoreOp: "between" });
      const root = mount(() =>
        h(BasicFilterField<Row>, {
          def: { key: "score", type },
          source: state.read(),
          labels,
        })
      );
      const fields = root.querySelectorAll<HTMLInputElement>("input");
      expect(fields).toHaveLength(2);
      expect(fields[0]?.type).toBe(type === "numberRange" ? "number" : "date");
      await input(
        get(root, "input"),
        type === "numberRange" ? "3" : "2026-01-01"
      );
      expect(state.setExtras).toHaveBeenCalled();
      await select(get(root, "select"), type === "numberRange" ? "" : "empty");
      expect(root.querySelector("input")).toBeNull();
    }
  );

  it("keeps multi-choice checkbox state controlled, with one request per click", async () => {
    const state = source({ name: ["Ada"] }, false);
    const root = mount(() =>
      h(BasicFilterField<Row>, {
        def: { key: "name", type: "multiSelect", options },
        source: state.read(),
        labels,
        classNames: {
          filterCheckbox: "checkbox-hook",
          filterCheckboxGroup: "group-hook",
        },
      })
    );
    const choices = root.querySelectorAll<HTMLButtonElement>("[role=checkbox]");
    expect(choices).toHaveLength(2);
    expect(
      get(root, part("filter-checkbox-group")).classList.contains("group-hook")
    ).toBe(true);
    expect(
      get(root, part("filter-checkbox")).classList.contains("checkbox-hook")
    ).toBe(true);
    choices[1]?.click();
    await nextTick();
    expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", [
      "Ada",
      "Bea",
    ]);
    expect(choices[1]?.getAttribute("aria-checked")).toBe("false");
  });

  it("dispatches checklist fields and preserves query, counts, and select-all behavior", async () => {
    const state = source();
    const root = mount(() =>
      h(FilterField<Row>, {
        def: { key: "name", type: "checklist" },
        source: state.read(),
        labels,
      })
    );
    expect(root.querySelectorAll("[role=checkbox]")).toHaveLength(2);
    expect(get(root, part("filter-checklist-count")).textContent).toBe("1");
    await input(get(root, "input[type=search]"), "Ada");
    expect(root.querySelectorAll("[role=checkbox]")).toHaveLength(1);
    const all = [...root.querySelectorAll("button")].find(
      (button) => button.textContent === labels.selectAll
    );
    expect(all).toBeDefined();
    all?.click();
    await nextTick();
    expect(state.setExtra).toHaveBeenCalledWith("name", ["Ada"]);
  });

  it("accepts asynchronously loaded options through the field model", async () => {
    let resolve: ((value: typeof options) => void) | undefined;
    const pending = new Promise<typeof options>((done) => {
      resolve = done;
    });
    const state = source();
    const def: FilterDef<Row> = {
      key: "name",
      type: "select",
      options: () => pending,
    };
    const root = mount(() =>
      h(BasicFilterField<Row>, { def, source: state.read(), labels })
    );
    await nextTick();
    expect(get(root, part("filter-field")).getAttribute("aria-busy")).toBe(
      "true"
    );
    if (!resolve) throw new Error("Missing pending loader resolver");
    resolve(options);
    await settle();
    expect(get<HTMLSelectElement>(root, "select").options).toHaveLength(3);
    expect(get(root, part("filter-field")).hasAttribute("aria-busy")).toBe(
      false
    );
  });

  it("uses the binding-owned custom renderer and retires its callbacks with its scope", async () => {
    const state = source();
    const text = defaultFilterRegistry.get("text");
    if (!text) throw new Error("Missing built-in text filter");
    const stale: (() => void)[] = [];
    const custom = {
      ...text,
      type: "custom",
      render: <TRow>(props: {
        source: FilterFormSource<TRow>;
        def: FilterDef<TRow>;
      }) => {
        stale.push(() => props.source.setExtra(props.def.key, "custom"));
        return "Custom field";
      },
    };
    const registry = {
      get: (type: string) =>
        type === "custom" ? custom : defaultFilterRegistry.get(type),
      has: (type: string) =>
        type === "custom" || defaultFilterRegistry.has(type),
      types: () => [...defaultFilterRegistry.types(), "custom"],
    };
    const visible = shallowRef(true);
    const root = mount(() =>
      visible.value
        ? h(FilterField<Row>, {
            def: { key: "name", type: "custom" },
            source: state.read(),
            labels,
            registry,
          })
        : h("span")
    );
    expect(root.textContent).toBe("Custom field");
    stale.at(-1)?.();
    expect(state.setExtra).toHaveBeenCalledWith("name", "custom");
    await nextTick();
    visible.value = false;
    await nextTick();
    state.setExtra.mockClear();
    stale.forEach((action) => action());
    expect(state.setExtra).not.toHaveBeenCalled();
  });

  it("renders SSR fields with no browser targets", async () => {
    const state = source();
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(FilterField<Row>, {
            def: { key: "name", type: "text" },
            source: state.read(),
            labels,
          }),
      })
    );
    expect(html).toContain('data-slot="input"');
    expect(html).toContain('data-slot="native-select"');
  });
});

describe("shadcn advanced filter tree", () => {
  it("composes disclosure, nested groups and condition actions through the shared model", async () => {
    const tree = shallowRef<QueryFilterGroup | undefined>();
    const setFilterTree = vi.fn((value: QueryFilterGroup | undefined) => {
      tree.value = value;
    });
    const root = mount(() =>
      h(FilterTree<Row>, {
        defs: [
          { key: "name", type: "text" },
          { key: "score", type: "numberRange" },
        ],
        source: { filterTree: tree.value, setFilterTree },
        classNames: {
          filterTreeSummary: "tree-toggle",
          filterTreeGroup: "tree-group",
        },
      })
    );
    const toggle = get<HTMLButtonElement>(root, part("filter-tree-summary"));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    await nextTick();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.classList.contains("tree-toggle")).toBe(true);
    const add = () =>
      [...root.querySelectorAll("button")].find(
        (button) => button.textContent === labels.filterAddCondition
      );
    add()?.click();
    await nextTick();
    expect(tree.value?.conditions).toHaveLength(1);
    await input(get(root, "input"), "Ada");
    expect(tree.value?.conditions[0]).toMatchObject({
      key: "name",
      value: "Ada",
    });
    const group = [...root.querySelectorAll("button")].find(
      (button) => button.textContent === labels.filterAddGroup
    );
    group?.click();
    await nextTick();
    expect(root.querySelectorAll(part("filter-tree-group"))).toHaveLength(2);
    get<HTMLButtonElement>(root, part("filter-tree-remove")).click();
    await nextTick();
    expect(tree.value?.conditions).toHaveLength(1);
    toggle.click();
    await nextTick();
    expect(root.querySelector(part("filter-tree-group"))).toBeNull();
    toggle.click();
    await nextTick();
    expect(root.querySelector(part("filter-tree-group"))).not.toBeNull();
  });

  it("does not render an empty definition list and supports SSR", async () => {
    const source = { setFilterTree: vi.fn() };
    const empty = await renderToString(
      createSSRApp({ render: () => h(FilterTree<Row>, { defs: [], source }) })
    );
    expect(empty).not.toContain("filter-tree-summary");
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(FilterTree<Row>, {
            defs: [{ key: "active", type: "boolean" }],
            source: {
              ...source,
              filterTree: {
                combinator: "and",
                conditions: [{ key: "active", op: "eq", value: true }],
              },
            },
            defaultExpanded: true,
          }),
      })
    );
    expect(html).toContain('data-slot="native-select"');
    expect(html).toContain('aria-expanded="true"');
  });
});

describe("shadcn compact and popover header filters", () => {
  it("renders compact search, selection, range, and RTL on actual controls", async () => {
    const state = source({ scoreOp: "between" });
    const defs: FilterDef<Row>[] = [
      { key: "name", type: "text" },
      { key: "name", type: "select", options },
      { key: "score", type: "numberRange" },
    ];
    const root = mount(() =>
      h(
        "div",
        defs.map((def, index) =>
          h(FilterHeaderControl<Row>, {
            key: index,
            def,
            source: state.read(),
            labels,
            dir: "rtl",
            className: "compact-hook",
          })
        )
      )
    );
    expect(root.querySelectorAll("input")).toHaveLength(3);
    expect(get<HTMLInputElement>(root, "input").dir).toBe("rtl");
    expect(get(root, "select").classList.contains("compact-hook")).toBe(true);
    await input(get(root, "input[type=search]"), "Ada");
    expect(state.extra.value.name).toBe("Ada");
  });

  it("renders binding header-row spacers and classes without filters on unconfigured columns", () => {
    const state = source();
    const props: FilterHeaderRowProps<Row> = {
      columns: [
        { key: "name", header: "Name" },
        { key: "score", header: "Score" },
      ],
      defs: [{ key: "name", type: "text" }],
      source: state.read(),
      labels,
      selection: true,
      columnSpacers: { start: 10, end: 20 },
      dir: "rtl",
      classNames: {
        filterHeaderInput: "row-input",
        filterHeaderCell: "row-cell",
      },
    };
    const root = mount(() =>
      h("table", h("thead", h(FilterHeaderRow<Row>, props)))
    );
    expect(get(root, part("filter-header-row")).getAttribute("dir")).toBe(
      "rtl"
    );
    expect(root.querySelectorAll(part("filter-header-cell"))).toHaveLength(2);
    expect(get(root, "input").classList.contains("row-input")).toBe(true);
    expect(get<HTMLElement>(root, part("column-spacer-end")).style.width).toBe(
      "20px"
    );
  });

  it("opens a compact multi menu and closes it on Escape with focus restored", async () => {
    const state = source();
    const root = mount(() =>
      h(FilterHeaderControl<Row>, {
        def: { key: "name", type: "multiSelect", options },
        source: state.read(),
        labels,
        dir: "rtl",
        menuClassName: "multi-menu",
      })
    );
    const trigger = get<HTMLButtonElement>(root, "button");
    trigger.focus();
    trigger.click();
    await settle();
    const menu = get<HTMLElement>(document, part("filter-header-menu"));
    expect(menu.dir).toBe("rtl");
    expect(menu.classList.contains("multi-menu")).toBe(true);
    get<HTMLButtonElement>(menu, "[role=checkbox]").click();
    await nextTick();
    expect(state.extra.value.name).toEqual(["Ada"]);
    menu.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("retires a compact multi portal through KeepAlive without reopening or changing filters", async () => {
    const state = source({ name: ["Ada"] });
    const shown = shallowRef(true);
    const Host = defineComponent({
      setup: () => () =>
        h(FilterHeaderControl<Row>, {
          def: { key: "name", type: "multiSelect", options },
          source: state.read(),
          labels,
        }),
    });
    const root = mount(() =>
      h(KeepAlive, null, {
        default: () => (shown.value ? h(Host) : h("span", "Paused")),
      })
    );
    const trigger = get<HTMLButtonElement>(
      root,
      'button[data-adapttable-part="filter-header-input"]'
    );
    const focus = vi.spyOn(trigger, "focus");
    trigger.click();
    await settle();
    const menu = get<HTMLElement>(document.body, part("filter-header-menu"));
    const option = get<HTMLButtonElement>(menu, '[role="checkbox"]');
    option.focus();
    focus.mockClear();
    expect(document.activeElement).toBe(option);
    shown.value = false;
    await settle();
    expect(document.body.querySelector(part("filter-header-menu"))).toBeNull();
    expect(menu.isConnected).toBe(false);
    expect(menu.contains(document.activeElement)).toBe(false);
    expect(focus).not.toHaveBeenCalled();
    expect(root.textContent).toBe("Paused");
    option.click();
    trigger.click();
    await settle();
    expect(state.setExtra).not.toHaveBeenCalled();
    expect(state.extra.value.name).toEqual(["Ada"]);
    expect(document.body.querySelector(part("filter-header-menu"))).toBeNull();
    shown.value = true;
    await settle();
    expect(
      get(root, 'button[data-adapttable-part="filter-header-input"]')
    ).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.querySelector(part("filter-header-menu"))).toBeNull();
    trigger.click();
    await settle();
    const reopened = get<HTMLElement>(
      document.body,
      part("filter-header-menu")
    );
    expect(
      get(reopened, '[aria-label="Ada"]').getAttribute("aria-checked")
    ).toBe("true");
    get<HTMLButtonElement>(reopened, '[aria-label="Bea"]').click();
    await nextTick();
    expect(state.extra.value.name).toEqual(["Ada", "Bea"]);
    focus.mockClear();
    cleanups.splice(0).forEach((stop) => stop());
    await settle();
    expect(document.body.querySelector(part("filter-header-menu"))).toBeNull();
    expect(reopened.isConnected).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });
  it("opens the header field, dismisses Escape, restores focus, and reopens cleanly", async () => {
    const state = source();
    const root = mount(() =>
      h(HeaderFilter<Row>, {
        def: { key: "name", type: "text" },
        source: state.read(),
        labels,
        dir: "rtl",
        className: "header-trigger",
        classNames: { filterInput: "header-value" },
      })
    );
    const trigger = get<HTMLButtonElement>(root, part("filter-header-trigger"));
    trigger.focus();
    trigger.click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const panel = get<HTMLElement>(document, part("filters-popover"));
    expect(panel.dir).toBe("rtl");
    expect(panel.querySelector("input.header-value")).not.toBeNull();
    await input(get(panel, "input"), "Ada");
    expect(state.extra.value.name).toBe("Ada");
    panel.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click();
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("supports close-on-select and removes an open overlay when unmounted", async () => {
    const state = source();
    const visible = shallowRef(true);
    const root = mount(() =>
      visible.value
        ? h(HeaderFilter<Row>, {
            def: { key: "name", type: "select", options },
            source: state.read(),
            labels,
            closeOnSelect: true,
          })
        : h("span")
    );
    get<HTMLButtonElement>(root, "button").click();
    await settle();
    await select(get(document, `${part("filters-popover")} select`), "Ada");
    await settle();
    expect(get(root, "button").getAttribute("aria-expanded")).toBe("false");
    get<HTMLButtonElement>(root, "button").click();
    await settle();
    visible.value = false;
    await settle();
    expect(document.querySelector(part("filters-popover"))).toBeNull();
  });

  it("mounts the opt-in feature in the real DataTable and filters host rows", async () => {
    const root = mount(() =>
      h(DataTable<Row>, {
        data,
        columns: [{ key: "name", header: "Name", filter: { type: "text" } }],
        rowKey: (row) => row.id,
        features: [headerFilters()],
        urlSync: false,
        forceMobile: false,
      })
    );
    get<HTMLButtonElement>(root, part("filter-header-trigger")).click();
    await settle();
    await input(get(document, `${part("filters-popover")} input`), "Ada");
    await settle();
    expect(root.textContent).toContain("Ada");
    expect(root.querySelector("tbody")?.textContent).not.toContain("Bea");
  });

  it("dismisses only the nested multi popover on the first Escape", async () => {
    const state = source();
    const open = shallowRef(true);
    const close = vi.fn(() => {
      open.value = false;
    });
    mount(() =>
      h(FilterPopover, {
        open: open.value,
        anchor: null,
        label: "Outer",
        dir: "rtl",
        onClose: close,
        children: h(FilterHeaderControl<Row>, {
          def: { key: "name", type: "multiSelect", options },
          source: state.read(),
          labels,
          dir: "rtl",
        }),
      })
    );
    await settle();
    const outer = get<HTMLElement>(document, part("filters-popover"));
    get<HTMLButtonElement>(outer, "button").click();
    await settle();
    const inner = get<HTMLElement>(document, part("filter-header-menu"));
    inner.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(open.value).toBe(true);
    expect(close).not.toHaveBeenCalled();
    expect(document.querySelector(part("filter-header-menu"))).toBeNull();
    outer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(close).toHaveBeenCalledExactlyOnceWith("escape");
  });

  it("preserves the header filter generic accessor contract during SSR", async () => {
    const def: FilterDef<Row> = {
      key: "name",
      type: "checklist",
      getValue: (row) => row.name,
    };
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(HeaderFilter<Row>, {
            def,
            source: source().read(),
            labels,
            registry: defaultFilterRegistry,
          }),
      })
    );
    expect(html).toContain('data-adapttable-part="filter-header-trigger"');
    expect(html).toContain('aria-expanded="false"');
  });
});
