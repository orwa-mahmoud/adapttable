import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import { DataTable } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { contextMenu } from "../src/context-menu";
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
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(
  target: HTMLElement,
  key: string,
  options: KeyboardEventInit = {}
) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
  await flush();
}
function mount() {
  const selected = vi.fn();
  const disabled = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<{ id: string; name: string }>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        dir: "rtl",
        features: [
          cellNavigation(),
          contextMenu<{ id: string; name: string }>({
            items: () => [
              {
                key: "disabled",
                label: "Unavailable",
                disabled: true,
                onSelect: disabled,
              },
              {
                key: "custom",
                label: "Inspect row",
                separatorBefore: true,
                onSelect: selected,
              },
            ],
          }),
        ],
        classNames: {
          contextMenu: "consumer-context",
          contextMenuItem: "consumer-context-item",
        },
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return { host, selected, disabled, stop: () => app.unmount() };
}
it("uses actual Reka menu items, semantic disabled navigation, portal and return focus", async () => {
  const { host, selected, disabled } = mount();
  await flush();
  const cell = element<HTMLElement>('[data-adapttable-part="cell"]');
  cell.focus();
  await key(cell, "F10", { shiftKey: true });
  const menu = element('[data-adapttable-part="context-menu"]');
  expect(host.contains(menu)).toBe(false);
  expect(menu.getAttribute("role")).toBe("menu");
  expect(menu.classList.contains("consumer-context")).toBe(true);
  expect(menu.getAttribute("dir")).toBe("rtl");
  const disabledItem = [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((item) => item.textContent === "Unavailable")!;
  expect(disabledItem.getAttribute("aria-disabled")).toBe("true");
  disabledItem.click();
  await flush();
  expect(disabled).not.toHaveBeenCalled();
  await key(menu, "End");
  expect(document.activeElement?.textContent).toBe("Inspect row");
  await key(document.activeElement as HTMLElement, "Enter");
  expect(selected).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
  expect(document.activeElement).toBe(cell);
});
it("dismisses the real portal with Escape and outside pointer, and retires on disposal", async () => {
  const { stop } = mount();
  await flush();
  const cell = element<HTMLElement>('[data-adapttable-part="cell"]');
  cell.focus();
  cell.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 30,
      clientY: 45,
    })
  );
  await flush();
  const anchor = element('[data-adapttable-part="context-menu-anchor"]');
  expect(anchor.style.left).toBe("30px");
  expect(anchor.style.top).toBe("45px");
  expect(anchor.querySelector('[data-state="open"]')).not.toBeNull();
  await key(element('[data-adapttable-part="context-menu"]'), "Escape");
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
  expect(document.activeElement).toBe(cell);
  await key(cell, "ContextMenu");
  document.body.dispatchEvent(
    new MouseEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
  );
  await flush();
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
  await key(cell, "ContextMenu");
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).not.toBeNull();
  stop();
  stops.pop();
  await flush();
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
});
