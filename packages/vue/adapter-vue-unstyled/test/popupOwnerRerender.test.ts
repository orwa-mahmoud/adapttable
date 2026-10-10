import { resolveLabels } from "@adapttable/core";
import {
  CONTEXT_MENU_CONTROL,
  ContextMenuChrome,
  type ContextMenuModel,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import {
  defineComponent,
  isVNode,
  nextTick,
  normalizeClass,
  shallowRef,
} from "vue";

import { contextMenu } from "../src/context-menu";

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
    { attachTo: document.body }
  );
  wrappers.push(wrapper);
  await settle();
  const first = wrapper.findComponent(ContextMenuChrome).props("slots");
  names.value = { contextMenuItem: "after-item", contextMenu: "after-menu" };
  direction.value = "rtl";
  await settle();
  const current = wrapper.findComponent(ContextMenuChrome).props("slots");
  if (!first || !current)
    throw new Error("Expected the kit to provide context-menu control slots.");
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
    { attachTo: document.body }
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
