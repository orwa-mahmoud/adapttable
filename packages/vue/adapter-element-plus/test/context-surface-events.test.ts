import { ElDropdownItem, ElDropdownMenu } from "element-plus";
import { expect, it, vi } from "vitest";
import { h, isVNode, nextTick, shallowRef, type VNode } from "vue";

import { ElementContextSurface } from "../src/actions/ElementContextSurface";
import { mount, node } from "./mount";

async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 35));
  await nextTick();
}

function menuVNode(vnode: VNode): VNode | undefined {
  if (vnode.type === ElDropdownMenu) return vnode;
  if (vnode.component) {
    const result = menuVNode(vnode.component.subTree);
    if (result) return result;
  }
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      if (!isVNode(child)) continue;
      const result = menuVNode(child);
      if (result) return result;
    }
  }
  return undefined;
}

function ownedEvent<T extends Event>(
  event: T,
  target: EventTarget | null,
  currentTarget: EventTarget | null
): T {
  Object.defineProperties(event, {
    target: { value: target },
    currentTarget: { value: currentTarget },
  });
  return event;
}

it("closes only an unconsumed Escape from its own current menu session", async () => {
  const close = vi.fn();
  const at = shallowRef({ x: 10, y: 20 });
  const container = document.createElement("section");
  document.body.append(container);
  let current: VNode | undefined;
  const view = mount(() => {
    current = h(ElementContextSurface, {
      at: at.value,
      anchorRef: { current: null },
      label: "Row actions",
      onClose: close,
      container,
      children: [h(ElDropdownItem, null, { default: () => "Inspect" })],
    });
    return current;
  });
  await tick();
  const menu = node<HTMLElement>(
    container,
    '[data-adapttable-part="context-menu"]'
  );
  const item = node<HTMLElement>(menu, '[role="menuitem"]');
  if (!current) throw new Error("Missing rendered surface");
  const native = menuVNode(current);
  if (!native) throw new Error("Missing native menu vnode");
  const keydown = native.props?.onKeydown as (event: KeyboardEvent) => void;
  const events = [
    ownedEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true }),
      item,
      menu
    ),
    ownedEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        isComposing: true,
        cancelable: true,
      }),
      item,
      menu
    ),
    ownedEvent(
      new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
      document.createTextNode("label"),
      menu
    ),
  ];
  const prevented = ownedEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    item,
    menu
  );
  prevented.preventDefault();
  keydown(prevented);
  for (const event of events) {
    keydown(event);
    expect(event.defaultPrevented).toBe(false);
  }
  const nested = document.createElement("div");
  nested.setAttribute("role", "menu");
  menu.append(nested);
  const nestedEscape = ownedEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    nested,
    menu
  );
  keydown(nestedEscape);
  expect(nestedEscape.defaultPrevented).toBe(false);
  nested.remove();
  await tick();
  expect(close).not.toHaveBeenCalled();
  const escape = ownedEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    item,
    menu
  );
  keydown(escape);
  await tick();
  expect(escape.defaultPrevented).toBe(true);
  expect(close).toHaveBeenCalledTimes(1);
  expect(
    container.querySelector('[data-adapttable-part="context-menu"]')
  ).not.toBeNull();
  at.value = { x: 30, y: 40 };
  await tick();
  const stale = ownedEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    item,
    menu
  );
  keydown(stale);
  expect(stale.defaultPrevented).toBe(false);
  expect(close).toHaveBeenCalledTimes(1);
  view.unmount();
  container.remove();
});

it("focuses the first enabled native item only when the menu itself receives focus", async () => {
  const vnode = h(ElementContextSurface, {
    at: { x: 1, y: 2 },
    anchorRef: { current: null },
    label: "Actions",
    onClose: vi.fn(),
    children: [
      h(ElDropdownItem, { disabled: true }, { default: () => "Unavailable" }),
      h(ElDropdownItem, null, { default: () => "Inspect" }),
    ],
  });
  const view = mount(() => vnode);
  await tick();
  const menu = node<HTMLElement>(
    document.body,
    '[data-adapttable-part="context-menu"]'
  );
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const focus = vi.spyOn(items[1]!, "focus");
  const native = menuVNode(vnode);
  if (!native) throw new Error("Missing native menu vnode");
  const onFocus = native.props?.onFocus as (event: FocusEvent) => void;
  onFocus(ownedEvent(new FocusEvent("focus"), items[1]!, menu));
  onFocus(ownedEvent(new FocusEvent("focus"), null, null));
  expect(focus).not.toHaveBeenCalled();
  onFocus(ownedEvent(new FocusEvent("focus"), menu, menu));
  expect(focus).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(items[1]);
  view.unmount();
  onFocus(ownedEvent(new FocusEvent("focus"), menu, menu));
  expect(focus).toHaveBeenCalledTimes(1);
});
