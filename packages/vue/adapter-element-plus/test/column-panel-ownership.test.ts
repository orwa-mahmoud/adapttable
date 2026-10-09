import type { ManagedOverlayPanelProps } from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { h, nextTick, shallowRef, type VNode } from "vue";

import { ElementColumnMenuPanel } from "../src/columns/ElementColumnMenuPanel";
import { mount, node } from "./mount";

async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}

it.each(["inside", "outside"])(
  "preserves %s focus acquired before the native enter transition finishes",
  async (destination) => {
    const anchor = document.createElement("button");
    const outside = document.createElement("button");
    document.body.append(anchor, outside);
    anchor.focus();
    const control: ManagedOverlayPanelProps = {
      attrs: { "data-adapttable-part": "column-menu-panel" },
      anchor,
      open: true,
      isCurrent: () => true,
      onClose: vi.fn(),
      content: h("div", [
        h("input", { "data-adapttable-part": "column-menu-search" }),
        h("button", "Move column"),
      ]),
    };
    const vnode = h(ElementColumnMenuPanel, { control });
    const view = mount(() => vnode);
    try {
      await tick();
      const panel = node<HTMLElement>(
        document.body,
        '[data-adapttable-part="column-menu-panel"]'
      );
      const afterEnter = vnode.component?.subTree.props
        ?.onAfterEnter as () => void;
      afterEnter();
      expect(document.activeElement).toBe(panel.querySelector("input"));
      const target =
        destination === "inside"
          ? node<HTMLButtonElement>(panel, "button")
          : outside;
      target.focus();
      afterEnter();
      expect(document.activeElement).toBe(target);
    } finally {
      view.unmount();
      anchor.remove();
      outside.remove();
    }
  }
);

it("focuses an input-free panel and ignores consumed or composing Escape events", async () => {
  const anchor = document.createElement("button");
  document.body.append(anchor);
  const close = vi.fn();
  const control: ManagedOverlayPanelProps = {
    attrs: {
      "data-adapttable-part": "column-menu-panel",
      "aria-label": "Columns",
      dir: "ltr",
    },
    anchor,
    open: true,
    isCurrent: () => true,
    onClose: close,
    content: h("p", "No columns available"),
  };
  const vnode = h(ElementColumnMenuPanel, { control });
  const view = mount(() => vnode);
  await tick();
  const panel = node<HTMLElement>(
    document.body,
    '[data-adapttable-part="column-menu-panel"]'
  );
  const afterEnter = vnode.component?.subTree.props?.onAfterEnter as () => void;
  afterEnter();
  expect(document.activeElement).toBe(panel);
  for (const key of ["ArrowDown", "Escape"]) {
    const event = new KeyboardEvent("keydown", {
      key,
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });
    panel.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }
  const prevented = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  prevented.preventDefault();
  panel.dispatchEvent(prevented);
  expect(close).not.toHaveBeenCalled();
  panel.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
  expect(close).toHaveBeenCalledExactlyOnceWith("escape");
  expect(document.activeElement).toBe(panel);
  view.unmount();
  anchor.remove();
});

it("retires retained close/focus callbacks when a panel loses its session or anchor", async () => {
  const anchor = document.createElement("button");
  document.body.append(anchor);
  const close = vi.fn();
  let current = true;
  const control = shallowRef<ManagedOverlayPanelProps>({
    attrs: { "data-adapttable-part": "column-menu-panel" },
    anchor,
    open: true,
    isCurrent: () => current,
    onClose: close,
    content: h("p", "Details"),
  });
  let latest: VNode | undefined;
  const view = mount(() => {
    latest = h(ElementColumnMenuPanel, { control: control.value });
    return latest;
  });
  await tick();
  const panel = node<HTMLElement>(
    document.body,
    '[data-adapttable-part="column-menu-panel"]'
  );
  const afterEnter = latest?.component?.subTree.props
    ?.onAfterEnter as () => void;
  anchor.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  expect(close).toHaveBeenCalledExactlyOnceWith("escape");
  close.mockClear();
  anchor.focus();
  current = false;
  afterEnter();
  panel.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  expect(close).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(anchor);
  control.value = { ...control.value };
  await tick();
  expect(
    document.querySelector('[data-adapttable-part="column-menu-panel"]')
  ).toBeNull();
  current = true;
  control.value = { ...control.value, anchor: null };
  await tick();
  expect(
    document.querySelector('[data-adapttable-part="column-menu-panel"]')
  ).toBeNull();
  control.value = { ...control.value, anchor, open: false };
  await tick();
  anchor.focus();
  afterEnter();
  expect(document.activeElement).toBe(anchor);
  expect(close).not.toHaveBeenCalled();
  view.unmount();
  anchor.remove();
});
