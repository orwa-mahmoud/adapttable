import { MenuItem } from "ant-design-vue";
import { expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { AntdContextSurface } from "../src/actions/AntdContextSurface";
import { mount, node } from "./mount";

async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 35));
  await nextTick();
}

function key(target: Element, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

it("closes only an unconsumed Escape from its own current menu session", async () => {
  const close = vi.fn();
  const at = shallowRef({ x: 10, y: 20 });
  const container = document.createElement("section");
  document.body.append(container);
  const view = mount(() =>
    h(AntdContextSurface, {
      at: at.value,
      anchorRef: { current: null },
      label: "Row actions",
      onClose: close,
      container,
      children: [h(MenuItem, { key: "inspect" }, { default: () => "Inspect" })],
    })
  );
  await tick();
  const menu = node<HTMLElement>(
    container,
    '[data-adapttable-part="context-menu"]'
  );
  const item = node<HTMLElement>(menu, '[role="menuitem"]');

  // An Escape already handled below the menu, or owned by an IME, stays there.
  const handled = (event: Event) => event.preventDefault();
  item.addEventListener("keydown", handled, { once: true });
  key(item, { key: "Escape" });
  key(item, { key: "Escape", keyCode: 27, which: 27, isComposing: true });
  const nested = document.createElement("ul");
  nested.setAttribute("role", "menu");
  const nestedItem = document.createElement("li");
  nested.append(nestedItem);
  menu.append(nested);
  key(nestedItem, { key: "Escape" });
  nested.remove();
  await tick();
  expect(close).not.toHaveBeenCalled();

  const escape = key(item, { key: "Escape" });
  await tick();
  expect(escape.defaultPrevented).toBe(true);
  expect(close).toHaveBeenCalledTimes(1);
  // A rejected close keeps the same menu open.
  expect(
    container.querySelector('[data-adapttable-part="context-menu"]')
  ).not.toBeNull();

  // A new position starts a new session; the previous one no longer closes.
  at.value = { x: 30, y: 40 };
  await tick();
  const replaced = node<HTMLElement>(
    container,
    '[data-adapttable-part="context-menu"] [role="menuitem"]'
  );
  key(replaced, { key: "Escape" });
  await tick();
  expect(close).toHaveBeenCalledTimes(2);
  view.unmount();
  container.remove();
});

it("focuses the first enabled item when the menu opens", async () => {
  const view = mount(() =>
    h(AntdContextSurface, {
      at: { x: 1, y: 2 },
      anchorRef: { current: null },
      label: "Actions",
      onClose: vi.fn(),
      children: [
        h(
          MenuItem,
          { key: "off", disabled: true },
          { default: () => "Unavailable" }
        ),
        h(MenuItem, { key: "on" }, { default: () => "Inspect" }),
      ],
    })
  );
  await tick();
  const items = [
    ...document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="context-menu"] [role="menuitem"]'
    ),
  ];
  expect(items).toHaveLength(2);
  expect(items[0]?.getAttribute("aria-disabled")).toBe("true");
  expect(document.activeElement).toBe(items[1]);
  view.unmount();
});

it("leaves focus where it is when the page already moved it into another control", async () => {
  const other = document.createElement("input");
  document.body.append(other);
  other.focus();
  const view = mount(() =>
    h(AntdContextSurface, {
      at: { x: 1, y: 2 },
      anchorRef: { current: null },
      label: "Actions",
      onClose: vi.fn(),
      children: [h(MenuItem, { key: "on" }, { default: () => "Inspect" })],
    })
  );
  await tick();
  expect(document.activeElement).toBe(other);
  view.unmount();
  other.remove();
});
