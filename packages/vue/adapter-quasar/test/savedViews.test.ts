import type { SavedView, SavedViewsStore } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QBadge, QCard, QInput, QMenu, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import QuasarInput from "../src/controls/QuasarInput.vue";
import { savedViews, SavedViewsPanel } from "../src/saved-views";
import { quasarSavedViewsPanelSlots } from "../src/views/controls";

const labels = resolveLabels(undefined);
const initial: readonly SavedView[] = [
  { name: "First", search: "q=first", isDefault: true },
  { name: "Second", search: "q=second" },
  { name: "Team", search: "q=team", readOnly: true },
];
const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement = HTMLElement>(
  name: string,
  root: ParentNode = document.body
): T {
  const target = root.querySelector<T>(part(name));
  if (!target) throw new Error(`Missing ${name}`);
  return target;
}
async function click(target: HTMLElement) {
  target.focus();
  target.click();
  await settle();
}
async function write(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}
async function key(target: HTMLElement, value: string, composing = false) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
      isComposing: composing,
    })
  );
  await settle();
}
function row(name: string): HTMLElement {
  const target = [
    ...document.body.querySelectorAll<HTMLElement>(part("saved-view-row")),
  ].find((item) => item.querySelector("button")?.textContent === name);
  if (!target) throw new Error(`Missing ${name}`);
  return target;
}
function action(root: ParentNode, label: string): HTMLButtonElement {
  const target = [...root.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.getAttribute("aria-label") === label
  );
  if (!target) throw new Error(`Missing ${label}`);
  return target;
}
function menuFixture() {
  let stored = [...initial];
  const list = vi.fn(() => Promise.resolve(stored));
  const save = vi.fn((view: SavedView) => {
    stored = [...stored.filter((item) => item.name !== view.name), view];
    return Promise.resolve();
  });
  const remove = vi.fn((name: string) => {
    stored = stored.filter((item) => item.name !== name);
    return Promise.resolve();
  });
  const store: SavedViewsStore = { list, save, remove };
  const live = shallowRef(true);
  const dir = shallowRef<"rtl" | "ltr">("rtl");
  const features = [
    savedViews({ storageKey: "quasar-views", storage: null, store }),
  ];
  const Owner = defineComponent(
    () => () =>
      h(DataTable<{ id: string }>, {
        data: [{ id: "a" }],
        columns: [{ key: "id" }],
        rowKey: (row) => row.id,
        forceMobile: false,
        urlSync: false,
        dir: dir.value,
        features,
      })
  );
  const wrapper = mount(
    defineComponent(
      () => () => h(KeepAlive, {}, () => (live.value ? h(Owner) : null))
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  return { wrapper, list, save, remove, live, dir };
}
function panelFixture() {
  const views = shallowRef(initial);
  const onApply = vi.fn(),
    onRename = vi.fn(),
    onMove = vi.fn(),
    onSetDefault = vi.fn(),
    onRemove = vi.fn();
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(SavedViewsPanel, {
          views: views.value,
          onApply,
          onRename,
          onMove,
          onSetDefault,
          onRemove,
          footer: h("span", "Owned by your app"),
          classNames: {
            viewsPanel: "custom-panel",
            viewsRow: "custom-row",
            viewsInput: "custom-input",
          },
        })
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  return { wrapper, views, onApply, onRename, onMove, onSetDefault, onRemove };
}

it("uses a native dialog, stable disclosure ARIA, host storage and readonly protection", async () => {
  const f = menuFixture();
  await settle();
  const trigger = element("views-button");
  await click(trigger);
  const panel = element("views-panel");
  expect(f.list).toHaveBeenCalledTimes(1);
  expect(f.wrapper.findComponent(QMenu).exists()).toBe(true);
  expect(f.wrapper.findComponent(QCard).exists()).toBe(true);
  expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  expect(panel.getAttribute("role")).toBe("dialog");
  expect(document.activeElement).toBe(element("views-item", panel));
  f.dir.value = "ltr";
  await settle();
  expect(element("views-panel")).toBe(panel);
  expect(panel.dir).toBe("ltr");
  const input = element<HTMLInputElement>("views-input", panel);
  await write(input, "Team");
  expect(element<HTMLButtonElement>("views-save", panel).disabled).toBe(true);
  await write(input, "  New view  ");
  await key(input, "Enter", true);
  expect(f.save).not.toHaveBeenCalled();
  await key(input, "Enter");
  expect(f.save).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ name: "New view" })
  );
  expect(input.value).toBe("");
  expect(element("views-panel")).toBe(panel);
  await key(input, "Escape");
  expect(document.body.querySelector(part("views-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("retires the portal and rejects retained native input events after reactivation", async () => {
  const f = menuFixture();
  await settle();
  await click(element("views-button"));
  const input = element<HTMLInputElement>("views-input");
  await write(input, "Retained draft");
  const vendor = f.wrapper
    .findAllComponents(QInput)
    .find((control) => control.props("modelValue") === "Retained draft");
  if (!vendor) throw new Error("Missing native saved-view input");
  const field = f.wrapper
    .findAllComponents(QuasarInput)
    .find((control) => control.props("control").value === "Retained draft");
  if (!field) throw new Error("Missing acquired input control");
  const staleChange = field.props("control").onChange;
  f.live.value = false;
  await settle();
  expect(document.body.querySelector(part("views-panel"))).toBeNull();
  vendor.vm.$emit("update:modelValue", "Obsolete");
  staleChange("Obsolete callback");
  f.live.value = true;
  await settle();
  expect(element("views-button").getAttribute("aria-expanded")).toBe("false");
  vendor.vm.$emit("update:modelValue", "Obsolete again");
  staleChange("Obsolete callback after reactivation");
  await click(element("views-button"));
  expect(element<HTMLInputElement>("views-input").value).toBe("Retained draft");
  expect(f.save).not.toHaveBeenCalled();
});

it("renders the empty native management panel without optional footer content", () => {
  const wrapper = mount(SavedViewsPanel, {
    props: {
      views: [],
      onApply: () => undefined,
      onRename: () => undefined,
      onMove: () => undefined,
      onSetDefault: () => undefined,
      onRemove: () => undefined,
    },
    global: { plugins: [Quasar] },
  });
  wrappers.push(wrapper);
  expect(wrapper.findComponent(QCard).exists()).toBe(true);
  expect(wrapper.findAll(part("saved-view-row"))).toHaveLength(0);
  expect(wrapper.find(part("saved-views-footer")).exists()).toBe(false);
  expect(wrapper.text()).toContain(labels.savedViews);
});

it("applies a saved view and returns focus to its visible native trigger", async () => {
  menuFixture();
  await settle();
  const trigger = element("views-button");
  await click(trigger);
  await click(element("views-item"));
  expect(document.body.querySelector(part("views-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("renders native management surfaces and requests changes without mutating a controlled list", async () => {
  const f = panelFixture();
  await settle();
  expect(element("saved-views-panel").tagName).toBe("SECTION");
  expect(element("saved-views-panel").classList.contains("custom-panel")).toBe(
    true
  );
  expect(f.wrapper.findComponent(QBadge).exists()).toBe(true);
  expect(element("saved-views-footer").textContent).toBe("Owned by your app");
  const second = row("Second");
  await click(action(second, labels.moveViewUp));
  await click(action(second, labels.setDefaultView));
  await click(action(second, labels.deleteView));
  expect(f.onMove).toHaveBeenCalledExactlyOnceWith("Second", -1);
  expect(f.onSetDefault).toHaveBeenCalledExactlyOnceWith("Second");
  expect(f.onRemove).toHaveBeenCalledExactlyOnceWith("Second");
  expect(f.wrapper.findAll(part("saved-view-row"))).toHaveLength(3);
  const team = row("Team");
  const controls = [
    ...team.querySelectorAll<HTMLButtonElement>(
      `${part("saved-view-controls")} button`
    ),
  ];
  expect(controls.every((button) => button.disabled)).toBe(true);
  controls.forEach((button) => button.click());
  expect(f.onRename).not.toHaveBeenCalled();
  const apply = team.querySelector<HTMLButtonElement>("button");
  if (!apply) throw new Error("Missing apply control");
  await click(apply);
  expect(f.onApply).toHaveBeenCalledExactlyOnceWith("Team");
});

it("owns a native rename input through composition, cancel, controlled submit and row removal", async () => {
  const f = panelFixture();
  await settle();
  await click(action(row("Second"), labels.renameView));
  const input = element<HTMLInputElement>("saved-view-rename-input");
  expect(document.activeElement).toBe(input);
  expect(input.classList.contains("custom-input")).toBe(true);
  await write(input, "  Renamed  ");
  await key(input, "Enter", true);
  expect(f.onRename).not.toHaveBeenCalled();
  await key(input, "Enter");
  expect(f.onRename).toHaveBeenCalledExactlyOnceWith("Second", "  Renamed  ");
  expect(row("Second")).toBeDefined();
  await click(action(row("Second"), labels.renameView));
  await write(element("saved-view-rename-input"), "Discarded");
  await key(element("saved-view-rename-input"), "Escape");
  expect(f.onRename).toHaveBeenCalledTimes(1);
  await click(action(row("Second"), labels.renameView));
  f.views.value = initial.filter((view) => view.name !== "Second");
  await settle();
  expect(
    document.body.querySelector(part("saved-view-rename-input"))
  ).toBeNull();
});

it("reconciles rejected input presentation and retires exact native ref owners", async () => {
  const slots = quasarSavedViewsPanelSlots(() => ({}));
  const first = vi.fn(),
    second = vi.fn(),
    changed = vi.fn();
  const owner = shallowRef(first),
    value = shallowRef("First");
  const wrapper = mount(
    defineComponent(
      () => () =>
        slots.Input({
          label: "View name",
          value: value.value,
          onChange: changed,
          ref: owner.value,
          onCommit: () => undefined,
          onCancel: () => undefined,
        })
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  await settle();
  const input = element<HTMLInputElement>("saved-view-rename-input");
  expect(first).toHaveBeenCalledExactlyOnceWith(input);
  await write(input, "Rejected");
  expect(changed).toHaveBeenCalledExactlyOnceWith("Rejected");
  expect(input.value).toBe("First");
  value.value = "Accepted";
  await settle();
  expect(element("saved-view-rename-input")).toBe(input);
  expect(first).toHaveBeenCalledTimes(1);
  owner.value = second;
  await settle();
  expect(first.mock.calls).toEqual([[input], [null]]);
  expect(second).toHaveBeenCalledExactlyOnceWith(input);
  wrapper.unmount();
  wrappers.pop();
  expect(second.mock.calls).toEqual([[input], [null]]);
});
