import {
  type ColumnDef,
  type ColumnLayoutState,
  useColumnLayout,
} from "@adapttable/vue";
import {
  type ColumnMenuSlotProps,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { createApp, createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable } from "../src";
import { ColumnMenu, columnMenu } from "../src/column-menu";

interface Person {
  id: string;
  name: string;
  score: number;
}
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", renameable: true, sortable: true },
  { key: "id", header: "ID", lockVisibility: true },
  { key: "score", header: "Score", sortable: true },
];
const labels = resolveLabels(undefined);
const cleanups: (() => void)[] = [];
function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function node<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function settle() {
  await nextTick();
  await nextTick();
}
async function key(target: HTMLElement, name: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true })
  );
  await settle();
}
async function delay() {
  await new Promise((resolve) => setTimeout(resolve, 25));
  await settle();
}
async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}
function row(label: string) {
  const result = [
    ...document.querySelectorAll<HTMLElement>(part("column-menu-item")),
  ].find(
    (item) =>
      item.querySelector(part("column-menu-label"))?.textContent === label
  );
  if (!result) throw new Error(`Missing column ${label}`);
  return result;
}
function action(label: string) {
  const result = [
    ...document.querySelectorAll<HTMLButtonElement>(part("column-menu-action")),
  ].find((item) => item.textContent?.trim() === label);
  if (!result) throw new Error(`Missing action ${label}`);
  return result;
}
function fixture(
  overrides: Partial<ColumnMenuSlotProps<Person>> = {},
  controlled = false
) {
  const props = shallowRef(overrides);
  const accept = shallowRef(false);
  const state = shallowRef<ColumnLayoutState | undefined>(
    controlled ? { order: [], hidden: [], pinned: {}, widths: {} } : undefined
  );
  const change = vi.fn((next: ColumnLayoutState) => {
    if (accept.value) state.value = next;
  });
  const renamed = vi.fn();
  const autoSize = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      const layout = useColumnLayout(columns, () => ({
        columnLayout: state,
        onColumnLayoutChange: change,
        onColumnRename: renamed,
      }));
      return () =>
        h(ColumnMenu<Person>, {
          allColumns: columns,
          layout: layout.value,
          labels,
          onAutoSize: autoSize,
          onRenameColumn: layout.value.setName,
          ...props.value,
        });
    },
  }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return { host, props, state, accept, change, renamed, autoSize };
}
async function open(host: ParentNode) {
  await settle();
  const trigger = node<HTMLButtonElement>(host, part("column-menu-button"));
  trigger.focus();
  trigger.click();
  await delay();
  return trigger;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it("fills the existing column manager and header rename channels", () => {
  const feature = columnMenu();
  expect(feature.id).toBe("column-menu");
  expect(feature.renders?.map((fill) => fill.slot.id)).toEqual([
    "column-menu",
    "column-header-rename",
  ]);
});

it("opens a genuine RTL column dialog with native search and restores Escape focus", async () => {
  const f = fixture({
    dir: "rtl",
    classNames: {
      columnMenuButton: "host-trigger",
      columnMenuPanel: "host-panel",
      columnMenuSearch: "host-search",
    },
  });
  const trigger = await open(f.host);
  expect(trigger.classList.contains("v-btn")).toBe(true);
  const panel = node(document, part("column-menu-panel"));
  expect(panel.classList.contains("v-card")).toBe(true);
  expect(panel.classList.contains("host-panel")).toBe(true);
  expect(panel.getAttribute("dir")).toBe("rtl");
  expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  expect(document.querySelectorAll(`[id="${panel.id}"]`)).toHaveLength(1);
  const search = node<HTMLInputElement>(
    panel,
    `${part("column-menu-search")} input`
  );
  expect(search.autofocus).toBe(true);
  search.focus();
  expect(search.closest(".v-text-field")).not.toBeNull();
  expect(
    panel.querySelectorAll(`${part("column-menu-grip")} .v-icon`)
  ).toHaveLength(3);
  await key(search, "Escape");
  expect(document.querySelector(part("column-menu-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

it("preserves rejected visibility requests and then accepts the same native button activation", async () => {
  const f = fixture({}, true);
  await open(f.host);
  const visibility = node<HTMLButtonElement>(
    row("Name"),
    part("column-menu-visibility")
  );
  visibility.click();
  await settle();
  expect(f.change).toHaveBeenCalledTimes(1);
  expect(f.change).toHaveBeenLastCalledWith(
    expect.objectContaining({ hidden: ["name"] })
  );
  expect(visibility.getAttribute("aria-pressed")).toBe("true");
  f.accept.value = true;
  visibility.click();
  await settle();
  expect(visibility.getAttribute("aria-pressed")).toBe("false");
  expect(
    node<HTMLButtonElement>(row("ID"), part("column-menu-visibility")).disabled
  ).toBe(true);
  node<HTMLButtonElement>(row("Score"), part("column-menu-pin")).click();
  await settle();
  expect(f.state.value?.pinned.score).toBeDefined();
});

it("uses shared search, localized rename validation and real input label targets", async () => {
  const f = fixture();
  await open(f.host);
  const search = node<HTMLInputElement>(
    document,
    `${part("column-menu-search")} input`
  );
  await write(search, "Name");
  expect(document.querySelectorAll(part("column-menu-item"))).toHaveLength(1);
  node<HTMLButtonElement>(row("Name"), part("column-menu-more")).click();
  await settle();
  action(labels.renameColumn).click();
  await settle();
  const input = node<HTMLInputElement>(
    document,
    `${part("column-rename-input")} input`
  );
  expect(document.activeElement).toBe(input);
  const label = node<HTMLLabelElement>(document, part("column-rename-label"));
  expect(label.htmlFor).toBe(input.id);
  await write(input, "  ");
  await key(input, "Enter");
  expect(node(document, part("column-rename-error")).textContent).toBe(
    labels.columnNameRequired
  );
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.closest(".v-input--error")).not.toBeNull();
  await write(input, "  Display name  ");
  await key(input, "Enter");
  expect(f.renamed).toHaveBeenCalledExactlyOnceWith("name", "Display name");
  expect(document.querySelector(part("column-rename-input"))).toBeNull();
  expect(document.querySelector(part("column-menu-panel"))).not.toBeNull();
});

it("lets row submenu Escape retire its rename editor before the owned overlay", async () => {
  const f = fixture();
  const trigger = await open(f.host);
  node<HTMLButtonElement>(row("Name"), part("column-menu-more")).click();
  await settle();
  action(labels.renameColumn).click();
  await settle();
  const input = node<HTMLInputElement>(
    document,
    `${part("column-rename-input")} input`
  );
  await write(input, "Draft");
  await key(input, "Escape");
  expect(f.renamed).not.toHaveBeenCalled();
  expect(document.querySelector(part("column-rename-input"))).toBeNull();
  expect(document.querySelector(part("column-menu-panel"))).not.toBeNull();
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement))
    throw new Error("Missing submenu focus");
  await key(focused, "Escape");
  expect(document.querySelector(part("column-menu-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("renders the real feature through DataTable and supports direct header rename", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Person>, {
        data: [{ id: "a", name: "Ada", score: 2 }],
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [columnMenu()],
      }),
  }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  await settle();
  const rename = node<HTMLButtonElement>(host, part("header-rename-button"));
  expect(rename.classList.contains("v-btn")).toBe(true);
  rename.click();
  await settle();
  const input = node<HTMLInputElement>(
    host,
    `${part("header-rename-input")} input`
  );
  expect(document.activeElement).toBe(input);
  await write(input, "Person");
  await key(input, "Enter");
  expect(node(host, '[data-column-key="name"]').textContent).toContain(
    "Person"
  );
});

it("server-renders a closed column manager without creating a portal", async () => {
  const app = createSSRApp({
    render: () =>
      h(DataTable<Person>, {
        data: [{ id: "a", name: "Ada", score: 2 }],
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [columnMenu()],
      }),
  }).use(vuetify());
  const html = await renderToString(app);
  expect(html).toContain('data-adapttable-part="column-menu-button"');
  expect(html).toContain("v-btn");
  expect(html).not.toContain('data-adapttable-part="column-menu-panel"');
});

it("paints controlled plugin choices with a genuine nested VSelect", async () => {
  const selected = shallowRef("sum");
  const accept = shallowRef(false);
  const changed = vi.fn((value: string) => {
    if (accept.value) selected.value = value;
  });
  const featureHost: NonNullable<ColumnMenuSlotProps<Person>["featureHost"]> = {
    filterTypes: [],
    filterExtends: [],
    editors: new Map(),
    aggregators: new Map(),
    writers: [],
    panels: [],
    commands: [],
    contextMenuItems: [],
    columnMenuActions: [
      () => ({
        kind: "choice",
        id: "aggregate",
        label: "Aggregate",
        value: selected.value,
        disabled: false,
        options: [
          { value: "sum", label: "Sum" },
          { value: "avg", label: "Average" },
        ],
        onChange: changed,
      }),
    ],
  };
  const f = fixture({ featureHost });
  await open(f.host);
  node<HTMLButtonElement>(row("Score"), part("column-menu-more")).click();
  await settle();
  const input = node<HTMLInputElement>(
    document,
    `${part("column-menu-choice-select")} input:not([type=hidden])`
  );
  expect(input.closest(".v-select")).not.toBeNull();
  input.focus();
  await key(input, "Enter");
  await delay();
  const option = () =>
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.trim() === "Average"
    );
  const first = option();
  if (!first) throw new Error("Missing Average option");
  first.click();
  await settle();
  expect(changed).toHaveBeenCalledExactlyOnceWith("avg");
  expect(
    node(document, part("column-menu-choice-select")).textContent
  ).toContain("Sum");
  accept.value = true;
  input.focus();
  await key(input, "Enter");
  await delay();
  const second = option();
  if (!second) throw new Error("Missing Average option");
  second.click();
  await settle();
  expect(selected.value).toBe("avg");
  expect(
    node(document, part("column-menu-choice-select")).textContent
  ).toContain("Average");
  expect(document.querySelector(part("column-menu-panel"))).not.toBeNull();
});

it("forwards RTL grip keys and bulk auto-size/reset actions to the existing layout", async () => {
  const f = fixture({ dir: "rtl" });
  await open(f.host);
  const grip = node<HTMLButtonElement>(row("Name"), part("column-menu-grip"));
  grip.focus();
  await key(grip, "ArrowLeft");
  expect(
    [...document.querySelectorAll(part("column-menu-label"))].map(
      (item) => item.textContent
    )
  ).toEqual(["ID", "Name", "Score"]);
  expect(f.change).toHaveBeenLastCalledWith(
    expect.objectContaining({ order: ["id", "name", "score"] })
  );
  node<HTMLButtonElement>(document, part("column-menu-auto-size")).click();
  await settle();
  expect(f.autoSize).toHaveBeenCalledOnce();
  node<HTMLButtonElement>(row("Name"), part("column-menu-pin")).click();
  await settle();
  expect(row("Name").getAttribute("data-pinned")).toBe("start");
  node<HTMLButtonElement>(document, part("column-menu-reset")).click();
  await settle();
  expect(row("Name").hasAttribute("data-pinned")).toBe(false);
});
