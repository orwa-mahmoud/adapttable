import type { ManagedOverlayPanelProps } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, shallowRef } from "vue";

import { NaiveManagedPopover } from "../src/columns/NaiveManagedPopover";
import { naiveInput } from "../src/controls/input";
import { escape, find, mount, tick } from "./filter-helpers";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function fixture(
  options: { portal?: boolean; outsideFocused?: boolean } = {}
) {
  const container = document.createElement("div");
  document.body.append(container);
  const anchor = document.createElement("button");
  const outside = document.createElement("button");
  container.append(anchor, outside);
  (options.outsideFocused ? outside : anchor).focus();
  let current = true;
  const visible = shallowRef(true);
  const callback = vi.fn();
  const close = vi.fn(() => {
    visible.value = false;
  });
  const control = shallowRef<ManagedOverlayPanelProps>({
    open: true,
    anchor,
    container: options.portal ? container : undefined,
    isCurrent: () => current,
    onClose: close,
    attrs: {
      id: "native-column-panel",
      role: "dialog",
      "aria-label": "Columns",
      "data-adapttable-part": "column-menu-panel",
      ref: callback,
    },
    content: naiveInput({
      attrs: {
        type: "search",
        "aria-label": "Search columns",
        "data-adapttable-part": "column-menu-search",
      },
      value: "",
      onChange: vi.fn(),
    }),
  });
  const view = mount(() =>
    visible.value ? h(NaiveManagedPopover, { control: control.value }) : null
  );
  cleanups.push(() => {
    view.stop();
    container.remove();
  });
  await tick();
  const panel = find<HTMLElement>(document, "#native-column-panel");
  const input = find<HTMLInputElement>(panel, "input");
  return {
    ...view,
    container,
    anchor,
    outside,
    input,
    panel,
    callback,
    close,
    control,
    invalidate: () => {
      current = false;
    },
  };
}

async function clickOutside(button: HTMLButtonElement) {
  button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  button.focus();
  button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  button.click();
  await tick();
}

describe("Naive managed column surface ownership", () => {
  it("keeps the genuine panel and native refs in the supplied fullscreen container", async () => {
    const view = await fixture({ portal: true });
    expect(view.panel.classList.contains("n-card")).toBe(true);
    expect(view.container.contains(view.panel)).toBe(true);
    expect(document.querySelectorAll("#native-column-panel")).toHaveLength(1);
    expect(view.callback).toHaveBeenCalledExactlyOnceWith(view.panel);
    expect(document.activeElement).toBe(view.input);
    const next = vi.fn();
    view.control.value = {
      ...view.control.value,
      attrs: { ...view.control.value.attrs, ref: next },
    };
    await tick();
    expect(view.callback).toHaveBeenLastCalledWith(null);
    expect(next).toHaveBeenCalledExactlyOnceWith(view.panel);
    await escape(view.input);
    expect(view.close).toHaveBeenCalledExactlyOnceWith("escape");
    expect(document.activeElement).toBe(view.anchor);
    expect(next).toHaveBeenLastCalledWith(null);
  });

  it("uses the native outside-click hook without taking focus from the clicked control", async () => {
    const view = await fixture();
    await clickOutside(view.outside);
    expect(view.close).toHaveBeenCalledExactlyOnceWith("outside");
    expect(document.querySelector("#native-column-panel")).toBeNull();
    expect(document.activeElement).toBe(view.outside);
  });

  it("does not steal focus during a programmatic open or an outside Escape", async () => {
    const view = await fixture({ outsideFocused: true });
    expect(document.activeElement).toBe(view.outside);
    await escape(view.outside);
    expect(view.close).toHaveBeenCalledExactlyOnceWith("escape");
    expect(document.activeElement).toBe(view.outside);
  });

  it("ignores composition, already handled Escape and another dialog's Escape", async () => {
    const view = await fixture();
    view.input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        isComposing: true,
      })
    );
    const handled = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    view.input.dispatchEvent(handled);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    view.container.append(dialog);
    await escape(dialog);
    expect(view.close).not.toHaveBeenCalled();
    expect(view.panel.isConnected).toBe(true);
  });

  it("rejects callbacks after its shared lifetime is invalidated", async () => {
    const view = await fixture();
    view.invalidate();
    await escape(view.input);
    await clickOutside(view.outside);
    expect(view.close).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(view.outside);
    view.stop();
    await tick();
    expect(view.callback).toHaveBeenLastCalledWith(null);
    expect(document.activeElement).toBe(view.outside);
  });
});
