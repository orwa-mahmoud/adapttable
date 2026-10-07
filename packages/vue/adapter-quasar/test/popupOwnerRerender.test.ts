import { resolveLabels } from "@adapttable/core";
import {
  CONTEXT_MENU_CONTROL,
  ContextMenuChrome,
  type ContextMenuModel,
  SIDE_PANEL_CONTROL,
  SidePanelChrome,
  type SidePanelControlModel,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import {
  defineComponent,
  isVNode,
  nextTick,
  normalizeClass,
  shallowRef,
} from "vue";

import { contextMenu } from "../src/context-menu";
import { sidePanel } from "../src/side-panel";

const wrappers: ReturnType<typeof mount>[] = [];
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));
const settle = async () => {
  await nextTick();
  await nextTick();
  await nextTick();
};

it("keeps Context Surface ownership and current presentation props through parent rerenders", async () => {
  const names = shallowRef({
    contextMenuItem: "before-item",
    contextMenu: "before-menu",
  });
  const direction = shallowRef<"ltr" | "rtl">("ltr");
  const close = vi.fn();
  const model = { at: null, items: [], close };
  const fill = contextMenu().renders!.find(
    (entry) => entry.slot.id === CONTEXT_MENU_CONTROL.id
  )!;
  const wrapper = mount(
    defineComponent(
      () => () =>
        fill.render({
          model,
          labels: resolveLabels({}),
          dir: direction.value,
          classNames: names.value,
        } as never)
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  await settle();
  const first = wrapper.findComponent(ContextMenuChrome).props("slots");
  names.value = { contextMenuItem: "after-item", contextMenu: "after-menu" };
  direction.value = "rtl";
  await settle();
  const current = wrapper.findComponent(ContextMenuChrome).props("slots");
  expect(current.Surface).toBe(first.Surface);
  expect(current.Item).toBe(first.Item);
  expect(current.Separator).toBe(first.Separator);
  const item = current.Item({
    item: { key: "one", label: "One", onSelect: vi.fn() },
    onSelect: vi.fn(),
  });
  expect(isVNode(item)).toBe(true);
  if (isVNode(item))
    expect(normalizeClass(item.props?.class)).toContain("after-item");
  expect(wrapper.findComponent(ContextMenuChrome).props("className")).toBe(
    "after-menu"
  );
});

it("completes an accepted SidePanel keyboard handoff during a class update", async () => {
  const panels = [
    { key: "one", label: "One", content: "First" },
    { key: "two", label: "Two", content: "Second" },
  ];
  const names = shallowRef({ sidePanelTab: "first-tab" });
  const changed = vi.fn((open: string | null) => {
    model.value = { ...model.value, open };
    names.value = { sidePanelTab: "second-tab" };
  });
  const model = shallowRef<SidePanelControlModel>({
    panels,
    open: "one",
    onOpenChange: changed,
  });
  const fill = sidePanel({
    panels,
    open: "one",
    onOpenChange: changed,
  }).renders!.find((entry) => entry.slot.id === SIDE_PANEL_CONTROL.id)!;
  const wrapper = mount(
    defineComponent(
      () => () =>
        fill.render({
          model: model.value,
          labels: resolveLabels({}),
          dir: "ltr",
          classNames: names.value,
        } as never)
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  await settle();
  const before = wrapper.findComponent(SidePanelChrome).props("slots")!;
  const first = wrapper.get('[role="tab"]');
  (first.element as HTMLElement).focus();
  await first.trigger("keydown", { key: "ArrowRight" });
  await settle();
  const tabs = wrapper.findAll('[role="tab"]');
  expect(changed).toHaveBeenCalledExactlyOnceWith("two");
  expect(document.activeElement).toBe(tabs[1]!.element);
  expect(tabs[1]!.classes()).toContain("second-tab");
  expect(wrapper.findComponent(SidePanelChrome).props("slots")!.Tab).toBe(
    before.Tab
  );
});

it("dispatches a native context command once after an ordinary presentation rerender", async () => {
  const names = shallowRef({ contextMenuItem: "first-item" });
  const selected = vi.fn();
  const close = vi.fn(() => {
    model.value = { ...model.value, at: null, items: [] };
  });
  const model = shallowRef<ContextMenuModel>({
    at: { x: 10, y: 20 },
    items: [{ key: "current", label: "Current action", onSelect: selected }],
    close,
  });
  const fill = contextMenu().renders!.find(
    (entry) => entry.slot.id === CONTEXT_MENU_CONTROL.id
  )!;
  const wrapper = mount(
    defineComponent(
      () => () =>
        fill.render({
          model: model.value,
          labels: resolveLabels({}),
          dir: "ltr",
          classNames: names.value,
        } as never)
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  await settle();
  names.value = { contextMenuItem: "latest-item" };
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const item = document.querySelector<HTMLElement>(
    '[data-adapttable-part="context-menu-item"]'
  );
  expect(item).not.toBeNull();
  expect(item!.classList.contains("latest-item")).toBe(true);
  item!.click();
  await settle();
  expect(close).toHaveBeenCalledTimes(1);
  expect(selected).toHaveBeenCalledTimes(1);
  expect(model.value.at).toBeNull();
});
