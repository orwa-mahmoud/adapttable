import type { ElementRef } from "@adapttable/vue";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import NuxtManagedPopover from "../src/controls/NuxtManagedPopover";
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};
it("delivers only the real semantic surface, replaces its owner and respects controlled close", async () => {
  const first = vi.fn(),
    second = vi.fn();
  const owner = shallowRef<ElementRef<HTMLElement>>(first);
  const open = shallowRef(true);
  const current = shallowRef(true);
  const close = vi.fn();
  const root = document.createElement("div"),
    anchor = document.createElement("button"),
    container = document.createElement("section");
  document.body.append(root, anchor, container);
  const app = createApp({
    render: () =>
      h(UApp, { toaster: null }, () =>
        h(NuxtManagedPopover, {
          control: {
            attrs: {
              id: "managed-surface",
              role: "dialog",
              "data-adapttable-part": "column-menu-panel",
              "aria-label": "Columns",
              ref: owner.value,
            },
            content: h("span", "Content"),
            anchor,
            container,
            open: open.value,
            isCurrent: () => current.value,
            onClose: close,
          },
        })
      ),
  }).use(ui);
  try {
    app.mount(root);
    await settle();
    const panel = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(panel).toBeInstanceOf(HTMLElement);
    expect(panel?.getAttribute("role")).toBe("dialog");
    expect(first.mock.calls).toEqual([[panel]]);
    expect(panel?.getAttribute("data-adapttable-part")).toBe(
      "column-menu-panel"
    );
    expect(panel?.getAttribute("data-slot")).toBe("content");
    expect(panel?.hasAttribute("data-reka-popper-content-wrapper")).toBe(false);
    expect(panel?.id).toMatch(/^reka-popover-content-/);
    owner.value = second;
    await settle();
    expect(first.mock.calls).toEqual([[panel], [null]]);
    expect(second.mock.calls).toEqual([[panel]]);
    expect(container.querySelector('[role="dialog"]')).toBe(panel);
    panel?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(close).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="dialog"]')).toBe(panel);
    expect(close).toHaveBeenLastCalledWith("escape");
    expect(second.mock.calls).toEqual([[panel]]);
    open.value = false;
    await settle();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(second.mock.calls).toEqual([[panel], [null]]);
    expect(document.activeElement).toBe(anchor);
    open.value = true;
    await settle();
    const reopened = container.querySelector<HTMLElement>('[role="dialog"]');
    expect(reopened).toBeInstanceOf(HTMLElement);
    expect(reopened).not.toBe(panel);
    expect(second.mock.calls).toEqual([[panel], [null], [reopened]]);
    panel?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(close).toHaveBeenCalledTimes(1);
    current.value = false;
    await settle();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(second.mock.calls.at(-1)).toEqual([null]);
  } finally {
    current.value = false;
    app.unmount();
    root.remove();
    anchor.remove();
    container.remove();
  }
});

it("retires cached surfaces and never calls a disposed owner from old nodes", async () => {
  const visible = shallowRef(true);
  const owner = vi.fn();
  const close = vi.fn();
  const root = document.createElement("div");
  const anchor = document.createElement("button");
  const container = document.createElement("section");
  document.body.append(root, anchor, container);
  const Child = defineComponent({
    setup: () => () =>
      h(NuxtManagedPopover, {
        control: {
          attrs: {
            role: "dialog",
            "data-adapttable-part": "column-menu-panel",
            ref: owner,
          },
          anchor,
          container,
          content: h("button", "Content"),
          open: true,
          isCurrent: () => true,
          onClose: close,
        },
      }),
  });
  const app = createApp({
    render: () =>
      h(UApp, { toaster: null }, () =>
        h(KeepAlive, null, () => (visible.value ? h(Child) : null))
      ),
  }).use(ui);
  try {
    app.mount(root);
    await settle();
    const first = container.querySelector('[role="dialog"]');
    expect(first).not.toBeNull();
    expect(owner.mock.calls).toEqual([[first]]);
    visible.value = false;
    await settle();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(owner.mock.calls).toEqual([[first], [null]]);
    first?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(close).not.toHaveBeenCalled();
    visible.value = true;
    await settle();
    const next = container.querySelector('[role="dialog"]');
    expect(next).not.toBeNull();
    expect(next).not.toBe(first);
    expect(owner.mock.calls).toEqual([[first], [null], [next]]);
    app.unmount();
    await settle();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(owner.mock.calls).toEqual([[first], [null], [next], [null]]);
    next?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(close).not.toHaveBeenCalled();
  } finally {
    if (root.hasChildNodes()) app.unmount();
    root.remove();
    anchor.remove();
    container.remove();
  }
});
