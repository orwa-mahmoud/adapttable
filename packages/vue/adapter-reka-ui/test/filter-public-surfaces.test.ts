import type { FilterDef, FilterFormSource, TableSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { afterEach, expect, it, vi } from "vitest";
import { computed, createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { ChecklistFilter, filters, FilterTreeBuilder } from "../src/filters";
import { FilterHeaderControl, headerFilters } from "../src/header-filters";

interface Row {
  id: string;
  name: string;
  amount: number;
}
const rows = [
  { id: "a", name: "Ada", amount: 2 },
  { id: "b", name: "Grace", amount: 3 },
];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
async function input(target: HTMLInputElement, value: string) {
  target.value = value;
  target.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
function form() {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const accept = shallowRef(true);
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    if (accept.value) extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn<FilterFormSource<Row>["setExtras"]>((patch) => {
    if (accept.value) extra.value = { ...extra.value, ...patch };
  });
  return {
    extra,
    accept,
    setExtra,
    setExtras,
    source: computed<FilterFormSource<Row>>(() => ({
      extra: extra.value,
      setExtra,
      setExtras,
      allFilteredRows: rows,
    })),
  };
}
const choices = [
  { value: "Ada", label: "Ada" },
  { value: "Grace", label: "Grace" },
];
it.each<FilterDef<Row>>([
  { key: "name", type: "text" },
  { key: "name", type: "select", options: choices },
  { key: "amount", type: "numberRange" },
  { key: "name", type: "multiSelect", options: choices },
])(
  "keeps the $type compact native target while direction changes and forwards its actual control event",
  async (def) => {
    const state = form();
    const dir = shallowRef<"ltr" | "rtl" | undefined>("rtl");
    const host = mount(() =>
      h(FilterHeaderControl<Row>, {
        def,
        source: state.source.value,
        labels: resolveLabels(undefined),
        dir: dir.value,
        className: "consumer-inline",
      })
    );
    await flush();
    const target = element<HTMLElement>("input,button", host);
    target.focus();
    for (const value of ["ltr", "rtl", undefined] as const) {
      dir.value = value;
      await flush();
      expect(element("input,button", host)).toBe(target);
      expect(document.activeElement).toBe(target);
      expect(target.getAttribute("dir")).toBe(
        value ?? (def.type === "select" ? "ltr" : null)
      );
    }
    expect(state.setExtra).not.toHaveBeenCalled();
    expect(state.setExtras).not.toHaveBeenCalled();
    if (target instanceof HTMLInputElement)
      await input(target, def.type === "numberRange" ? "2" : "Ada");
    else {
      await key(target, "ArrowDown");
      const option = element<HTMLElement>(
        def.type === "multiSelect"
          ? '[role="menuitemcheckbox"]'
          : '[role="option"]'
      );
      option.focus();
      if (def.type === "select") await key(option, "End");
      await key(document.activeElement as HTMLElement, "Enter");
      if (def.type === "multiSelect") {
        expect(document.querySelector('[role="menu"]')).not.toBeNull();
        await key(element('[role="menu"]'), "Escape");
        expect(document.activeElement).toBe(target);
      }
    }
    expect(
      state.setExtra.mock.calls.length + state.setExtras.mock.calls.length
    ).toBeGreaterThan(0);
  }
);
it("searches and selects a genuine checklist with counts and rejects a controlled toggle", async () => {
  const state = form();
  const host = mount(() =>
    h(ChecklistFilter<Row>, {
      def: { key: "name", type: "multiSelect", options: choices },
      source: state.source.value,
      classNames: {
        filterChecklistSearch: "consumer-check-search",
        filterCheckbox: "consumer-check-label",
        filterChecklistCount: "consumer-count",
      },
    })
  );
  await flush();
  expect(host.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
  const first = element<HTMLButtonElement>('[role="checkbox"]', host);
  state.accept.value = false;
  first.click();
  await flush();
  expect(first.getAttribute("aria-checked")).toBe("false");
  expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
  state.accept.value = true;
  const search = element<HTMLInputElement>(
    part("filter-checklist-search"),
    host
  );
  await input(search, "Grace");
  expect(host.querySelectorAll('[role="checkbox"]')).toHaveLength(1);
  expect(element(part("filter-checklist-count"), host).textContent).toBe("1");
  element<HTMLButtonElement>('[role="checkbox"]', host).click();
  await flush();
  expect(state.extra.value.name).toEqual(["Grace"]);
  await input(search, "");
  const buttons = [
    ...host.querySelectorAll<HTMLButtonElement>(
      'button:not([role="checkbox"])'
    ),
  ];
  expect(buttons.length).toBeGreaterThanOrEqual(2);
  buttons[0]?.click();
  await flush();
  expect(state.extra.value.name).toEqual(["Grace", "Ada"]);
  buttons[1]?.click();
  await flush();
  expect(state.extra.value.name).toBeUndefined();
});
it("drives recursive filter groups through Collapsible, Select and input controls", async () => {
  const tree =
    shallowRef<Parameters<NonNullable<TableSource<Row>["setFilterTree"]>>[0]>();
  const changed = vi.fn((value: typeof tree.value) => {
    tree.value = value;
  });
  const host = mount(() =>
    h(FilterTreeBuilder<Row>, {
      defs: [
        { key: "name", type: "text" },
        { key: "amount", type: "numberRange" },
      ],
      source: { filterTree: tree.value, setFilterTree: changed },
    })
  );
  await flush();
  const summary = element<HTMLButtonElement>(part("filter-tree-summary"), host);
  summary.click();
  await flush();
  expect(summary.getAttribute("aria-expanded")).toBe("true");
  const addGroup = element<HTMLButtonElement>(
    `${part("filter-tree-actions")} button:nth-child(2)`,
    host
  );
  addGroup.click();
  await flush();
  const groups = host.querySelectorAll(part("filter-tree-group"));
  element<HTMLButtonElement>(
    `${part("filter-tree-actions")} button:first-child`,
    groups[1]
  ).click();
  await flush();
  expect(host.querySelectorAll(part("filter-tree-condition"))).toHaveLength(1);
  await input(element<HTMLInputElement>("input", host), "Ada");
  expect(JSON.stringify(tree.value)).toContain("Ada");
  const combinator = element<HTMLElement>(part("filter-operator"), host);
  await key(combinator, "ArrowDown");
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].at(-1);
  if (!option) throw new Error("Missing operator");
  option.focus();
  await key(option, "Enter");
  expect(changed).toHaveBeenCalled();
  element<HTMLButtonElement>(part("filter-tree-remove"), host).click();
  await flush();
  expect(host.querySelectorAll(part("filter-tree-condition"))).toHaveLength(0);
  summary.click();
  await flush();
  expect(summary.getAttribute("aria-expanded")).toBe("false");
});
it("filters the actual table through header popovers, then clears the visible filter chips", async () => {
  const host = mount(() =>
    h(DataTable<Row>, {
      data: rows,
      columns: [{ key: "name" }, { key: "amount" }],
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      features: [
        filters<Row>([{ key: "name", type: "text" }], { tree: true }),
        headerFilters(),
      ],
      classNames: { filterHeaderTrigger: "consumer-header-trigger" },
    })
  );
  await flush();
  const trigger = element<HTMLButtonElement>(
    part("filter-header-trigger"),
    host
  );
  trigger.focus();
  trigger.click();
  await flush();
  const popup = element(part("filter-header-cell"));
  expect(host.contains(popup)).toBe(false);
  const field = element<HTMLInputElement>('input[type="text"]', popup);
  await input(field, "Ada");
  expect(host.querySelectorAll("tbody tr[data-row-id]")).toHaveLength(1);
  await key(field, "Escape");
  expect(document.activeElement).toBe(trigger);
  expect(host.querySelector(part("chip"))).not.toBeNull();
  const remove = element<HTMLButtonElement>(`${part("chip")} button`, host);
  remove.click();
  await flush();
  expect(host.querySelectorAll("tbody tr[data-row-id]")).toHaveLength(2);
  element<HTMLButtonElement>(part("filters-button"), host).click();
  await flush();
  expect(document.querySelector(part("filter-tree"))).not.toBeNull();
  element<HTMLButtonElement>(part("filters-clear")).click();
  await flush();
  element<HTMLButtonElement>(part("filters-done")).click();
  await flush();
  expect(document.querySelector(part("filters-popover"))).toBeNull();
});
