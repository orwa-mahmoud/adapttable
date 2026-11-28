import type { ManagedOverlayPanelProps } from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import { AntdColumnMenuPanel } from "../src/columns/AntdColumnMenuPanel";
import { mount, node } from "./mount";

async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}

it.each(["inside", "outside"])(
  "preserves %s focus acquired before the popover settles",
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
    const vnode = h(AntdColumnMenuPanel, { control });
    const view = mount(() => vnode);
    try {
      // Focus that leaves the opener before the panel mounts is never stolen.
      if (destination === "outside") outside.focus();
      await tick();
      const panel = node<HTMLElement>(
        document.body,
        '[data-adapttable-part="column-menu-panel"]'
      );
      if (destination === "outside") {
        expect(document.activeElement).toBe(outside);
        return;
      }
      expect(document.activeElement).toBe(panel.querySelector("input"));
      const target = node<HTMLButtonElement>(panel, "button");
      target.focus();
      await tick();
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
  const vnode = h(AntdColumnMenuPanel, { control });
  const view = mount(() => vnode);
  await tick();
  const panel = node<HTMLElement>(
    document.body,
    '[data-adapttable-part="column-menu-panel"]'
  );
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
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });
  prevented.preventDefault();
  panel.dispatchEvent(prevented);
  expect(close).not.toHaveBeenCalled();
  panel.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      keyCode: 27,
      which: 27,
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
  const view = mount(() => h(AntdColumnMenuPanel, { control: control.value }));
  await tick();
  const panel = node<HTMLElement>(
    document.body,
    '[data-adapttable-part="column-menu-panel"]'
  );
  anchor.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    })
  );
  expect(close).toHaveBeenCalledExactlyOnceWith("escape");
  close.mockClear();
  anchor.focus();
  current = false;
  panel.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      keyCode: 27,
      which: 27,
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
  await tick();
  expect(document.activeElement).toBe(anchor);
  expect(close).not.toHaveBeenCalled();
  view.unmount();
  anchor.remove();
});
