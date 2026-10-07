import type {
  FilterDef,
  FilterFormSource,
  QueryFilterGroup,
} from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import {
  computed,
  createApp,
  createSSRApp,
  h,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify";
import { VLocaleProvider } from "vuetify/components/VLocaleProvider";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { provideClassNames } from "../src/classNamesContext";
import { VuetifyChecklistFilter } from "../src/filters/VuetifyChecklistFilter";
import VuetifyFilterField from "../src/filters/VuetifyFilterField.vue";
import VuetifyFilterHeaderControl from "../src/filters/VuetifyFilterHeaderControl.vue";
import VuetifyFilterHeaderRow from "../src/filters/VuetifyFilterHeaderRow.vue";
import { VuetifyFilterTree } from "../src/filters/VuetifyFilterTree";

interface Person {
  name: string;
  age: number;
  active: boolean;
  date: string;
}
const people: readonly Person[] = [
  { name: "Ada", age: 20, active: true, date: "2026-10-01" },
  { name: "Ada", age: 30, active: true, date: "2026-10-02" },
  { name: "Grace", age: 40, active: false, date: "2026-10-03" },
];
const labels = resolveLabels(undefined);
const cleanups: (() => void)[] = [];
function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      provideClassNames(() => ({
        filterField: "own-field",
        filterLabel: "own-label",
        filterInput: "own-input",
        filterSelect: "own-select",
        filterOperator: "own-operator",
        filterCheckbox: "own-checkbox",
      }));
      return render;
    },
  }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}
function bag(accept = true) {
  const extra = shallowRef<FilterFormSource<Person>["extra"]>({});
  const accepted = shallowRef(accept);
  const setExtra = vi.fn(
    (
      key: string,
      value: Parameters<FilterFormSource<Person>["setExtra"]>[1]
    ) => {
      if (accepted.value) extra.value = { ...extra.value, [key]: value };
    }
  );
  const setExtras = vi.fn((patch: FilterFormSource<Person>["extra"]) => {
    if (accepted.value) extra.value = { ...extra.value, ...patch };
  });
  const source = computed<FilterFormSource<Person>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
    allFilteredRows: people,
  }));
  return { extra, accepted, setExtra, setExtras, source };
}
function node<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
function part(name: string) {
  return `[data-adapttable-part="${name}"]`;
}
function button(root: ParentNode, label: string): HTMLButtonElement {
  const item = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) => item.textContent?.trim() === label
  );
  if (!item) throw new Error(`Missing button ${label}`);
  return item;
}
async function settle() {
  await nextTick();
  await nextTick();
}
async function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
}
async function write(input: HTMLInputElement, value: string) {
  await settle();
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}
async function option(input: HTMLInputElement, label: string) {
  await settle();
  input.focus();
  expect(document.activeElement).toBe(input);
  await key(input, "ArrowDown");
  const item = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim() === label);
  if (!item) throw new Error(`Missing real Vuetify option ${label}`);
  item.click();
  await settle();
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it.each([true, false])(
  "keeps the host authoritative for text filters, accepted=%s",
  async (accept) => {
    const state = bag(accept);
    const tick = shallowRef(0);
    const host = mount(() =>
      h("section", { title: String(tick.value) }, [
        h(VuetifyFilterField<Person>, {
          def: { key: "name", type: "text", label: "Person" },
          source: state.source.value,
          labels,
        }),
      ])
    );
    const input = node<HTMLInputElement>(host, `${part("filter-input")} input`);
    expect(input.getAttribute("aria-label")).toBe("Person");
    expect(
      node(host, part("filter-input")).classList.contains("own-input")
    ).toBe(true);
    expect(
      node(host, part("filter-operator")).classList.contains("v-select")
    ).toBe(true);
    input.focus();
    await write(input, "Grace");
    expect(state.setExtras).toHaveBeenCalledTimes(1);
    expect(input.value).toBe(accept ? "Grace" : "");
    tick.value++;
    await settle();
    expect(node(host, `${part("filter-input")} input`)).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe(accept ? "Grace" : "");
  }
);

it("uses real select option activation for boolean and single-choice fields", async () => {
  const state = bag();
  const def = shallowRef<FilterDef<Person>>({
    key: "active",
    type: "boolean",
    label: "Active",
  });
  const host = mount(() =>
    h(VuetifyFilterField<Person>, {
      def: def.value,
      source: state.source.value,
      labels,
    })
  );
  await option(
    node(host, `${part("filter-select")} input:not([type=hidden])`),
    labels.boolTrue
  );
  expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("active", "true");
  def.value = {
    key: "name",
    type: "select",
    options: [
      { value: "Ada", label: "Ada" },
      { value: "Grace", label: "Grace" },
    ],
  };
  await settle();
  await option(
    node(host, `${part("filter-select")} input:not([type=hidden])`),
    "Grace"
  );
  expect(state.extra.value.name).toBe("Grace");
});

it.each(["numberRange", "dateRange"] as const)(
  "preserves the shared %s operator and native input types",
  async (type) => {
    const state = bag();
    const host = mount(() =>
      h(VuetifyFilterField<Person>, {
        def: { key: type === "numberRange" ? "age" : "date", type },
        source: state.source.value,
        labels,
      })
    );
    await option(
      node(host, `${part("filter-operator")} input:not([type=hidden])`),
      labels.opBetween
    );
    const fields = host.querySelectorAll<HTMLInputElement>(
      `${part("filter-input")} input`
    );
    expect(fields).toHaveLength(2);
    expect(fields[0]?.type).toBe(type === "numberRange" ? "number" : "date");
    await write(fields[0]!, type === "numberRange" ? "20" : "2026-10-01");
    await write(fields[1]!, type === "numberRange" ? "40" : "2026-10-03");
    expect(state.setExtras.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fields[0]?.value).toBe(type === "numberRange" ? "20" : "2026-10-01");
  }
);

it("labels real multi-select checkboxes and respects rejected native activation", async () => {
  const state = bag(false);
  const host = mount(() =>
    h(VuetifyFilterField<Person>, {
      def: {
        key: "name",
        type: "multiSelect",
        options: [
          { value: "Ada", label: "Ada" },
          { value: "Grace", label: "Grace" },
        ],
      },
      source: state.source.value,
      labels,
    })
  );
  const label = node<HTMLLabelElement>(host, part("filter-checkbox"));
  const checkbox = node<HTMLInputElement>(label, 'input[type="checkbox"]');
  expect(label.tagName).toBe("LABEL");
  expect(label.textContent).toContain("Ada");
  expect(checkbox.closest(".v-checkbox-btn")).not.toBeNull();
  label.click();
  await settle();
  expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
  expect(checkbox.checked).toBe(false);
  state.accepted.value = true;
  label.click();
  await settle();
  expect(checkbox.checked).toBe(true);
  expect(state.extra.value.name).toEqual(["Ada"]);
});

it("uses binding checklist facets, search, selection and count chips", async () => {
  const state = bag();
  const host = mount(() =>
    h(VuetifyChecklistFilter<Person>, {
      def: { key: "name", type: "checklist" },
      source: state.source.value,
      labels,
    })
  );
  const counts = host.querySelectorAll(part("filter-checklist-count"));
  expect([...counts].map((item) => item.textContent)).toEqual(["2", "1"]);
  expect(counts[0]?.classList.contains("v-chip")).toBe(true);
  await write(node(host, `${part("filter-checklist-search")} input`), "grace");
  expect(host.querySelectorAll(part("filter-checkbox"))).toHaveLength(1);
  const selectAll = [
    ...host.querySelectorAll<HTMLButtonElement>("button"),
  ].find((item) => item.textContent?.trim() === labels.selectAll)!;
  expect(selectAll.classList.contains("v-btn")).toBe(true);
  selectAll.click();
  await settle();
  expect(state.extra.value.name).toEqual(["Grace"]);
  await write(
    node(host, `${part("filter-checklist-search")} input`),
    "missing"
  );
  expect(node(host, '[role="status"]').textContent).toBe(
    labels.checklistNoValues
  );
});

it("routes nested tree edits through the binding and uses accessible Vuetify disclosure", async () => {
  const tree = shallowRef<QueryFilterGroup>();
  const writeTree = vi.fn((value: QueryFilterGroup | undefined) => {
    tree.value = value;
  });
  const host = mount(() =>
    h(VuetifyFilterTree<Person>, {
      defs: [{ key: "name", type: "text", label: "Person" }],
      source: { filterTree: tree.value, setFilterTree: writeTree },
      defaultExpanded: true,
    })
  );
  const title = node<HTMLButtonElement>(host, part("filter-tree-summary"));
  expect(title.tagName).toBe("BUTTON");
  expect(title.classList.contains("v-expansion-panel-title")).toBe(true);
  expect(title.getAttribute("aria-expanded")).toBe("true");
  button(host, labels.filterAddGroup).click();
  await settle();
  const nested = host.querySelectorAll(part("filter-tree-group"))[1];
  if (!nested) throw new Error("Missing nested filter group");
  button(nested, labels.filterAddCondition).click();
  await settle();
  expect(tree.value?.conditions).toHaveLength(1);
  const input = node<HTMLInputElement>(host, `${part("filter-input")} input`);
  const label = node<HTMLLabelElement>(
    input.closest(part("filter-field"))!,
    "label"
  );
  expect(label.htmlFor).toBe(input.id);
  expect(input.labels?.[0]).toBe(label);
  await write(input, "Grace");
  expect(JSON.stringify(tree.value)).toContain("Grace");
  button(host, labels.filterRemoveCondition).click();
  await settle();
  expect(JSON.stringify(tree.value)).not.toContain("Grace");
  title.click();
  await settle();
  expect(title.getAttribute("aria-expanded")).toBe("false");
});

it("preserves header multi menu semantics, RTL, classes and rejected option requests", async () => {
  const state = bag(false);
  const host = mount(() =>
    h(VuetifyFilterHeaderControl<Person>, {
      def: {
        key: "name",
        type: "multiSelect",
        options: [
          { value: "Ada", label: "Ada" },
          { value: "Grace", label: "Grace" },
        ],
      },
      source: state.source.value,
      labels,
      dir: "rtl",
      className: "host-header-input",
      menuClassName: "host-header-menu",
    })
  );
  const input = node<HTMLInputElement>(
    host,
    `${part("filter-header-input")} input`
  );
  await option(input, "Grace");
  expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Grace"]);
  const list = node(document, part("filter-header-menu"));
  expect(list.getAttribute("role")).toBe("listbox");
  expect(list.getAttribute("dir")).toBe("rtl");
  expect(
    node(host, part("filter-header-input")).classList.contains(
      "v-locale--is-rtl"
    )
  ).toBe(true);
  expect(list.classList.contains("host-header-menu")).toBe(true);
  expect(node(host, part("filter-header-input")).textContent).not.toContain(
    "Grace"
  );
  state.accepted.value = true;
  await option(input, "Ada");
  expect(state.extra.value.name).toEqual(["Ada"]);
  await key(input, "Escape");
  expect(host.querySelector(".v-select--active-menu")).toBeNull();
});

it("keeps header row pads, pin geometry, range fields and binding-owned updates", async () => {
  const state = bag();
  const host = mount(() =>
    h("table", [
      h("thead", [
        h(VuetifyFilterHeaderRow<Person>, {
          columns: [{ key: "name" }, { key: "age" }],
          defs: [
            { key: "name", type: "text" },
            { key: "age", type: "numberRange" },
          ],
          source: state.source.value,
          labels,
          dir: "rtl",
          selection: true,
          showActions: true,
          stickyAttr: true,
          pinSide: (key) => (key === "name" ? "start" : undefined),
          cellStyle: () => ({
            position: "sticky" as const,
            insetInlineStart: "12px",
          }),
        }),
      ]),
    ])
  );
  const row = node(host, part("filter-header-row"));
  expect(row.getAttribute("dir")).toBe("rtl");
  expect(row.querySelectorAll("th")).toHaveLength(2);
  expect(row.querySelectorAll("td")).toHaveLength(2);
  const cell = node<HTMLTableCellElement>(row, '[data-column-key="name"]');
  expect(cell.style.insetInlineStart).toBe("12px");
  await write(node(cell, "input"), "Grace");
  expect(state.setExtras).toHaveBeenCalledTimes(1);
  expect(
    node<HTMLInputElement>(row, '[data-column-key="age"] input').type
  ).toBe("number");
});

it("hydrates filter fields and an open tree without host writes or missing native labels", async () => {
  const state = bag();
  const setFilterTree = vi.fn();
  const render = () =>
    h("main", [
      h(VuetifyFilterField<Person>, {
        def: { key: "name", type: "text" },
        source: state.source.value,
        labels,
      }),
      h(VuetifyFilterTree<Person>, {
        defs: [{ key: "name", type: "text" }],
        source: {
          filterTree: {
            combinator: "and",
            conditions: [{ key: "name", op: "contains", value: "Ada" }],
          },
          setFilterTree,
        },
        defaultExpanded: true,
      }),
    ]);
  const server = createSSRApp({ render }).use(vuetify());
  const html = await renderToString(server);
  expect(html).toContain("v-text-field");
  expect(html).toContain("filter-tree-summary");
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  const error = vi.spyOn(console, "error");
  const client = createSSRApp({ render }).use(vuetify());
  client.mount(host);
  await settle();
  cleanups.push(() => {
    client.unmount();
    host.remove();
  });
  expect(error).not.toHaveBeenCalled();
  expect(state.setExtra).not.toHaveBeenCalled();
  expect(setFilterTree).not.toHaveBeenCalled();
});

it.each([undefined, "ltr"] as const)(
  "inherits Vuetify locale unless compact direction is explicit: %s",
  async (dir) => {
    const state = bag();
    const direction = shallowRef<"ltr" | "rtl" | undefined>(dir);
    const host = mount(() =>
      h(VLocaleProvider, { rtl: true }, () =>
        h(VuetifyFilterHeaderControl<Person>, {
          def: {
            key: "name",
            type: "select",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: state.source.value,
          labels,
          dir: direction.value,
        })
      )
    );
    await settle();
    expect(
      node(host, part("filter-header-input")).classList.contains(
        dir === "ltr" ? "v-locale--is-ltr" : "v-locale--is-rtl"
      )
    ).toBe(true);
    const input = node<HTMLInputElement>(host, "input:not([type=hidden])");
    input.focus();
    direction.value = dir === undefined ? "ltr" : undefined;
    await settle();
    expect(node(host, "input:not([type=hidden])")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(
      node(host, part("filter-header-input")).classList.contains(
        dir === undefined ? "v-locale--is-ltr" : "v-locale--is-rtl"
      )
    ).toBe(true);
  }
);
