import { type ColumnLayoutState, useColumnLayout } from "@adapttable/vue";
import {
  ColumnHeaderRenameChrome,
  ColumnMenuChrome,
  type ColumnMenuSlotProps,
  type ColumnMenuSlots,
  managedOverlayPanel,
  type ManagedOverlayPanelProps,
  resolveLabels,
  useColumnMenu,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QCard, QInput, QMenu, QSelect, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { ColumnMenu, columnMenu } from "../src/column-menu";
import { quasarColumnMenuSlots } from "../src/columns/controls";
import { QuasarColumnPanel } from "../src/columns/QuasarColumnPanel";
import { columnDefinitions, type ColumnRow } from "./columnMenuFixture";

const wrappers: ReturnType<typeof mount>[] = [];
const additions: HTMLElement[] = [];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 45));
  await nextTick();
};
function element<T extends HTMLElement = HTMLElement>(
  name: string,
  root: ParentNode = document.body
): T {
  const target = root.querySelector<T>(part(name));
  if (!target) throw new Error(`Missing ${name}`);
  return target;
}
async function click(name: string, root: ParentNode = document.body) {
  const target = element(name, root);
  target.focus();
  target.click();
  await settle();
}
async function key(target: HTMLElement, value: string) {
  let keyCode = 40;
  if (value === "Escape") keyCode = 27;
  else if (value === "Enter") keyCode = 13;
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      keyCode,
      bubbles: true,
      cancelable: true,
    })
  );
  await nextTick();
  const release = target.isConnected ? target : document.activeElement;
  release?.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: value,
      keyCode,
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
}
async function text(name: string, value: string) {
  const input = element<HTMLInputElement>(name);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}
function row(name: string) {
  const target = [
    ...document.body.querySelectorAll<HTMLElement>(part("column-menu-item")),
  ].find(
    (item) =>
      item.querySelector(part("column-menu-label"))?.textContent === name
  );
  if (!target) throw new Error(`Missing row ${name}`);
  return target;
}
function fixture(
  options: {
    accept?: boolean;
    host?: NonNullable<ColumnMenuSlotProps<ColumnRow>["featureHost"]>;
    slots?: ColumnMenuSlots;
  } = {}
) {
  const live = shallowRef(true);
  const dir = shallowRef<"rtl" | "ltr">("rtl");
  const state = shallowRef<ColumnLayoutState>({
    order: [],
    hidden: [],
    pinned: {},
    widths: {},
    names: {},
  });
  const changed = vi.fn((next: ColumnLayoutState) => {
    if (options.accept !== false) state.value = next;
  });
  const autosize = vi.fn();
  const renamed = vi.fn();
  const Owner = defineComponent({
    setup() {
      const layout = useColumnLayout(columnDefinitions, () => ({
        columnLayout: state,
        onColumnLayoutChange: changed,
        onColumnRename: renamed,
      }));
      const props = () => ({
        allColumns: columnDefinitions,
        layout: layout.value,
        labels: resolveLabels(undefined),
        onAutoSize: autosize,
        onRenameColumn: layout.value.setName,
        dir: dir.value,
        featureHost: options.host,
      });
      if (options.slots) {
        const slots = options.slots;
        const model = useColumnMenu(props);
        return () => h(ColumnMenuChrome, { model, slots });
      }
      return () => h(ColumnMenu<ColumnRow>, props());
    },
  });
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(KeepAlive, {}, { default: () => (live.value ? h(Owner) : null) })
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  return { wrapper, live, dir, state, changed, autosize, renamed };
}
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  for (const addition of additions.splice(0)) addition.remove();
  await settle();
});

it("uses real QMenu/QCard/QInput and preserves the native dialog ref and trigger ARIA across direction and layout writes", async () => {
  const refs = vi.fn();
  const controls: ColumnMenuSlots = {
    ...quasarColumnMenuSlots,
    Panel: managedOverlayPanel((control) =>
      h(QuasarColumnPanel, {
        control: { ...control, attrs: { ...control.attrs, ref: refs } },
      })
    ),
  };
  const f = fixture({ slots: controls });
  await settle();
  const trigger = element<HTMLButtonElement>("column-menu-button");
  expect(trigger.tagName).toBe("BUTTON");
  expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
  await key(trigger, "ArrowDown");
  const panel = element("column-menu-panel");
  expect(f.wrapper.findComponent(QMenu).exists()).toBe(true);
  expect(f.wrapper.findComponent(QCard).exists()).toBe(true);
  expect(f.wrapper.findComponent(QInput).exists()).toBe(true);
  expect(panel.getAttribute("role")).toBe("dialog");
  expect(document.body.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  expect(refs).toHaveBeenCalledExactlyOnceWith(panel);
  expect(document.activeElement).toBe(element("column-menu-search"));
  for (const direction of ["ltr", "rtl"] as const) {
    f.dir.value = direction;
    await settle();
    expect(element("column-menu-panel")).toBe(panel);
    expect(panel.dir).toBe(direction);
  }
  await click("column-menu-visibility", row("Name"));
  expect(f.state.value.hidden).toEqual(["name"]);
  await click("column-menu-pin", row("Name"));
  expect(f.state.value.pinned.name).toBe("start");
  expect(refs).toHaveBeenCalledTimes(1);
  await key(element("column-menu-search"), "Escape");
  expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
  expect(refs.mock.calls).toEqual([[panel], [null]]);
  expect(document.activeElement).toBe(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
});

it("keeps controlled layout writes authoritative and uses binding rename validation and trimming", async () => {
  const f = fixture({ accept: false });
  await click("column-menu-button");
  await click("column-menu-visibility", row("Name"));
  expect(f.changed).toHaveBeenCalledTimes(1);
  expect(f.state.value.hidden).toEqual([]);
  expect(
    element("column-menu-visibility", row("Name")).getAttribute("aria-pressed")
  ).toBe("true");
  await click("column-menu-more", row("Name"));
  const rename = [
    ...row("Name").querySelectorAll<HTMLButtonElement>(
      part("column-menu-action")
    ),
  ].find((button) => button.textContent?.includes("Rename"));
  expect(rename).toBeDefined();
  if (!rename) throw new Error("Missing rename action");
  rename.focus();
  rename.click();
  await settle();
  expect(document.activeElement).toBe(element("column-rename-input"));
  await text("column-rename-input", "   ");
  await key(element("column-rename-input"), "Enter");
  expect(element("column-rename-error").getAttribute("role")).toBe("alert");
  await text("column-rename-input", "  New name  ");
  await key(element("column-rename-input"), "Enter");
  expect(f.changed.mock.calls.at(-1)?.[0].names).toEqual({ name: "New name" });
  expect(f.renamed).toHaveBeenCalledExactlyOnceWith("name", "New name");
  expect(row("Name")).toBeDefined();
  expect(document.body.querySelector(part("column-rename-form"))).toBeNull();
});

it("gives the native choice first Escape, the submenu second, and the panel third", async () => {
  const value = shallowRef("sum");
  const changed = vi.fn();
  const host: NonNullable<ColumnMenuSlotProps<ColumnRow>["featureHost"]> = {
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
        value: value.value,
        disabled: false,
        options: [
          { value: "sum", label: "Sum" },
          { value: "avg", label: "Average" },
        ],
        onChange: changed,
      }),
    ],
  };
  const f = fixture({ host });
  await click("column-menu-button");
  const trigger = element("column-menu-button");
  await click("column-menu-more", row("Name"));
  const more = element("column-menu-more", row("Name"));
  const choice = element<HTMLInputElement>("column-menu-choice-select");
  expect(document.body.querySelector("label label")).toBeNull();
  const select = f.wrapper.getComponent(QSelect);
  select.vm.toggleOption({ value: "avg", label: "Average" });
  await settle();
  expect(changed).toHaveBeenCalledExactlyOnceWith("avg");
  expect(select.props("modelValue")).toBe("sum");
  select.vm.showPopup();
  await settle();
  choice.focus();
  expect(choice.getAttribute("aria-expanded")).toBe("true");
  await key(choice, "Escape");
  expect(choice.getAttribute("aria-expanded")).toBe("false");
  expect(
    document.body.querySelector(part("column-menu-submenu"))
  ).not.toBeNull();
  await key(choice, "Escape");
  expect(document.body.querySelector(part("column-menu-submenu"))).toBeNull();
  expect(document.body.querySelector(part("column-menu-panel"))).not.toBeNull();
  expect(document.activeElement).toBe(more);
  await key(more, "Escape");
  expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
  const requests = changed.mock.calls.length;
  select.vm.$emit("update:modelValue", "avg");
  await settle();
  expect(changed).toHaveBeenCalledTimes(requests);
});

it("retires portals and stale close callbacks under KeepAlive, then requires a fresh gesture", async () => {
  let last: ManagedOverlayPanelProps | undefined;
  const refs = vi.fn();
  const controls: ColumnMenuSlots = {
    ...quasarColumnMenuSlots,
    Panel: managedOverlayPanel((control) => {
      last = control;
      return h(QuasarColumnPanel, {
        control: { ...control, attrs: { ...control.attrs, ref: refs } },
      });
    }),
  };
  const f = fixture({ slots: controls });
  await click("column-menu-button");
  await text("column-menu-search", "name");
  const old = last;
  const panel = element("column-menu-panel");
  f.live.value = false;
  await settle();
  expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
  expect(refs.mock.calls).toEqual([[panel], [null]]);
  old?.onClose();
  f.live.value = true;
  await settle();
  expect(element("column-menu-button").getAttribute("aria-expanded")).toBe(
    "false"
  );
  await click("column-menu-button");
  expect(element<HTMLInputElement>("column-menu-search").value).toBe("name");
  old?.onClose();
  await settle();
  expect(document.body.querySelector(part("column-menu-panel"))).not.toBeNull();
});

it("keeps a rejected native close open and preserves outside focus after an accepted close", async () => {
  const anchor = document.createElement("button");
  const outside = document.createElement("button");
  document.body.append(anchor, outside);
  additions.push(anchor, outside);
  const open = shallowRef(true);
  const accept = shallowRef(false);
  const close = vi.fn(() => {
    if (accept.value) open.value = false;
  });
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(QuasarColumnPanel, {
          control: {
            attrs: {
              role: "dialog",
              "data-adapttable-part": "column-menu-panel",
            },
            anchor,
            open: open.value,
            isCurrent: () => true,
            onClose: close,
            content: h("button", { autofocus: true }, "inside"),
          },
        })
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  await settle();
  const panel = element("column-menu-panel");
  await key(panel, "Escape");
  expect(close).toHaveBeenCalledExactlyOnceWith("escape");
  expect(element("column-menu-panel")).toBe(panel);
  accept.value = true;
  outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  await settle();
  outside.focus();
  expect(close).toHaveBeenCalledTimes(2);
  expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
  expect(document.activeElement).toBe(outside);
});

it("installs the optional factory and direct header rename on the actual table", async () => {
  const wrapper = mount(DataTable<ColumnRow>, {
    props: {
      data: [{ id: 1, name: "Ada" }],
      columns: columnDefinitions,
      rowKey: (row) => String(row.id),
      forceMobile: false,
      urlSync: false,
      features: [columnMenu()],
    },
    attachTo: document.body,
    global: { plugins: [Quasar] },
  });
  wrappers.push(wrapper);
  await click("header-rename-button");
  const input = element<HTMLInputElement>("header-rename-input");
  expect(input.tagName).toBe("INPUT");
  await text("header-rename-input", "Display name");
  await key(input, "Enter");
  expect(wrapper.text()).toContain("Display name");
  expect(document.body.querySelector(part("header-rename-form"))).toBeNull();
  expect(wrapper.findComponent(ColumnHeaderRenameChrome).exists()).toBe(true);
});
