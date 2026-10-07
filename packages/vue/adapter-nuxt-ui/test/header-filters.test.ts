import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import {
  provideDataTableClassNames,
  resolveLabels,
} from "@adapttable/vue/adapter";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, expect, it, vi } from "vitest";
import {
  computed,
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { DataTable } from "../src";
import { filters } from "../src/filters";
import {
  FilterHeaderControl,
  FilterHeaderRow,
  headerFilters,
  NuxtHeaderFilter,
} from "../src/header-filters";

interface Row {
  id: string;
  name: string;
  amount: number;
  active: boolean;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", amount: 2, active: true },
  { id: "b", name: "Bea", amount: 3, active: false },
];
const labels = resolveLabels(undefined);
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const stops: (() => void)[] = [];
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};
afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await settle();
});
function mount(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    setup() {
      provideDataTableClassNames(() => ({
        filterHeaderInput: "input-hook",
        filterHeaderTrigger: "trigger-hook",
      }));
      return () => h(UApp, { dir: "rtl", toaster: null }, render);
    },
  }).use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
function find<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string
): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}
function key(node: HTMLElement, value: string) {
  node.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
}
function bag(accept = true) {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const setExtra = vi.fn(
    (key: string, value: Parameters<FilterFormSource<Row>["setExtra"]>[1]) => {
      if (accept) extra.value = { ...extra.value, [key]: value };
    }
  );
  const setExtras = vi.fn(
    (patch: Parameters<FilterFormSource<Row>["setExtras"]>[0]) => {
      if (accept) extra.value = { ...extra.value, ...patch };
    }
  );
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
    allFilteredRows: rows,
  }));
  return { extra, setExtra, setExtras, source };
}
async function choose(trigger: HTMLElement, label: string) {
  trigger.focus();
  key(trigger, "ArrowDown");
  await settle();
  const option = Array.from(
    document.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((node) => node.textContent?.trim() === label);
  if (!option) throw new Error(`Missing option ${label}`);
  option.focus();
  key(option, "Enter");
  await settle();
  return option;
}

it("filters the genuine table through the anchored header surface and restores its real trigger", async () => {
  const root = mount(() =>
    h(DataTable<Row>, {
      data: rows,
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      searchable: false,
      dir: "rtl",
      features: [
        filters<Row>([{ key: "name", type: "text" }]),
        headerFilters(),
      ],
    })
  );
  await settle();
  const trigger = find<HTMLButtonElement>(root, part("filter-header-trigger"));
  trigger.focus();
  trigger.click();
  await settle();
  const panel = find(document, part("filter-header-popover"));
  expect(panel.getAttribute("role")).toBe("dialog");
  expect(panel.getAttribute("dir")).toBe("rtl");
  const input = find<HTMLInputElement>(panel, "input");
  input.value = "Ada";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(find(root, "tbody").textContent).toContain("Ada");
  expect(find(root, "tbody").textContent).not.toContain("Bea");
  key(input, "Escape");
  await settle();
  expect(document.querySelector(part("filter-header-popover"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
  trigger.click();
  await settle();
  trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
  trigger.focus();
  await settle();
  expect(document.querySelector(part("filter-header-popover"))).not.toBeNull();
  trigger.click();
  await settle();
  expect(document.querySelector(part("filter-header-popover"))).toBeNull();
});

it("keeps nested Select Escape vendor-owned and closes after an accepted single choice", async () => {
  const state = bag();
  const closeOnSelect = shallowRef(false);
  const root = mount(() =>
    h(NuxtHeaderFilter<Row>, {
      def: {
        key: "name",
        type: "select",
        options: [
          { value: "Ada", label: "Ada" },
          { value: "Bea", label: "Bea" },
        ],
      },
      source: state.source.value,
      labels,
      dir: "rtl",
      closeOnSelect: closeOnSelect.value,
    })
  );
  await settle();
  const trigger = find<HTMLButtonElement>(root, part("filter-header-trigger"));
  trigger.focus();
  trigger.click();
  await settle();
  const select = find<HTMLButtonElement>(
    document,
    `${part("filter-header-popover")} [role="combobox"]`
  );
  select.focus();
  key(select, "ArrowDown");
  await settle();
  key(find(document, '[role="listbox"]'), "Escape");
  await settle();
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.querySelector(part("filter-header-popover"))).not.toBeNull();
  key(select, "Escape");
  await settle();
  expect(document.activeElement).toBe(trigger);
  closeOnSelect.value = true;
  await settle();
  trigger.click();
  await settle();
  await choose(
    find(document, `${part("filter-header-popover")} [role="combobox"]`),
    "Ada"
  );
  expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", "Ada");
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

it.each(["text", "select", "boolean", "numberRange", "dateRange"] as const)(
  "renders the compact %s control on the actual Nuxt input target",
  async (type) => {
    const state = bag();
    const def: FilterDef<Row> = {
      key: "name",
      type,
      options: [{ value: "Ada", label: "Ada" }],
    };
    const root = mount(() =>
      h(FilterHeaderControl<Row>, {
        def,
        source: state.source.value,
        labels,
        dir: "rtl",
        className: "compact-hook",
      })
    );
    await settle();
    if (type === "select" || type === "boolean") {
      const select = find<HTMLButtonElement>(root, '[role="combobox"]');
      expect(select.classList.contains("compact-hook")).toBe(true);
      expect(select.getAttribute("dir")).toBe("rtl");
      await choose(select, type === "select" ? "Ada" : labels.boolTrue);
    } else {
      const input = find<HTMLInputElement>(root, "input");
      expect(input.getAttribute("data-slot")).toBe("base");
      if (type === "text")
        expect(input.classList.contains("compact-hook")).toBe(true);
      input.value = type === "dateRange" ? "2026-10-01" : "2";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await settle();
    }
    expect(
      state.setExtra.mock.calls.length + state.setExtras.mock.calls.length
    ).toBe(1);
  }
);

it.each([false, true])(
  "keeps compact multi-select controlled across cached retirement (accept=%s)",
  async (accept) => {
    const state = bag(accept);
    const visible = shallowRef(true);
    const Child = defineComponent({
      setup: () => () =>
        h(FilterHeaderControl<Row>, {
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: state.source.value,
          labels,
          menuClassName: "menu-hook",
        }),
    });
    const root = mount(() =>
      h(KeepAlive, null, () => (visible.value ? h(Child) : null))
    );
    await settle();
    const trigger = find<HTMLButtonElement>(root, '[role="combobox"]');
    const option = await choose(trigger, "Ada");
    expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
    expect(option.getAttribute("data-state")).toBe(
      accept ? "checked" : "unchecked"
    );
    expect(
      find(document, part("filter-header-menu")).classList.contains("menu-hook")
    ).toBe(true);
    visible.value = false;
    await settle();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    key(option, "Enter");
    await settle();
    expect(state.setExtra).toHaveBeenCalledTimes(1);
    visible.value = true;
    await settle();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    const restored = find<HTMLButtonElement>(root, '[role="combobox"]');
    expect(restored).not.toBe(trigger);
    key(option, "Enter");
    await settle();
    expect(state.setExtra).toHaveBeenCalledTimes(1);
    expect(state.extra.value.name).toEqual(accept ? ["Ada"] : undefined);
  }
);

it("keeps compact header row structure and public classes on the native control", async () => {
  const state = bag();
  const root = mount(() =>
    h("table", null, [
      h("thead", null, [
        h(FilterHeaderRow<Row>, {
          columns: [{ key: "name" }],
          defs: [{ key: "name", type: "text" }],
          source: state.source.value,
          labels,
          enabled: true,
          dir: "rtl",
          classNames: { filterHeaderInput: "row-input-hook" },
        }),
      ]),
    ])
  );
  await settle();
  expect(find(root, "tr").getAttribute("dir")).toBe("rtl");
  expect(find(root, "input").classList.contains("row-input-hook")).toBe(true);
});

it("retires stale header controls when their definition and source are replaced", async () => {
  const first = bag(),
    second = bag();
  const revision = shallowRef(0);
  const root = mount(() =>
    h(NuxtHeaderFilter<Row>, {
      def:
        revision.value === 0
          ? { key: "name", type: "text" }
          : { key: "amount", type: "text" },
      source: revision.value === 0 ? first.source.value : second.source.value,
      labels,
    })
  );
  await settle();
  const trigger = find<HTMLButtonElement>(root, part("filter-header-trigger"));
  trigger.click();
  await settle();
  const previous = find<HTMLInputElement>(
    document,
    `${part("filter-header-popover")} input`
  );
  revision.value = 1;
  await settle();
  expect(document.querySelector(part("filter-header-popover"))).toBeNull();
  previous.value = "stale";
  previous.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(first.setExtras).not.toHaveBeenCalled();
  expect(second.setExtras).not.toHaveBeenCalled();
  trigger.click();
  await settle();
  const current = find<HTMLInputElement>(
    document,
    `${part("filter-header-popover")} input`
  );
  expect(current).not.toBe(previous);
  key(previous, "Escape");
  await settle();
  expect(document.querySelector(part("filter-header-popover"))).not.toBeNull();
  current.value = "2";
  current.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(second.setExtras).toHaveBeenCalledTimes(1);
  expect(first.setExtras).not.toHaveBeenCalled();
});
