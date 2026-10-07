import type { ElementRef } from "@adapttable/vue";
import { type ManagedOverlayPanelProps } from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QMenu, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";

import { QuasarColumnPanel } from "../src/columns/QuasarColumnPanel";

const wrappers: ReturnType<typeof mount>[] = [];
const roots: HTMLElement[] = [];
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  for (const root of roots.splice(0)) root.remove();
  await settle();
});
function fixture() {
  const root = document.createElement("div");
  const anchor = document.createElement("button");
  root.append(anchor);
  document.body.append(root);
  roots.push(root);
  const open = shallowRef(true);
  const current = shallowRef(true);
  const revision = shallowRef(0);
  const owner = shallowRef<ElementRef<HTMLElement>>();
  const close = vi.fn(() => {
    open.value = false;
  });
  const control = (): ManagedOverlayPanelProps => ({
    attrs: {
      id: "native-panel",
      role: "dialog",
      "aria-label": "Columns",
      ref: owner.value,
      "data-revision": revision.value,
    },
    anchor,
    open: open.value,
    isCurrent: () => current.value,
    onClose: close,
    content: h("button", { autofocus: true }, "inside"),
  });
  const wrapper = mount(
    defineComponent(() => () => h(QuasarColumnPanel, { control: control() })),
    { attachTo: root, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  return { wrapper, root, anchor, open, current, revision, owner, close };
}
function panel(): HTMLElement {
  const target = document.getElementById("native-panel");
  if (!target) throw new Error("Missing native panel");
  return target;
}
function escape(target: HTMLElement, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
}
it("changes callback owners without replacing the native dialog and retires each exactly once", async () => {
  const f = fixture();
  const first = vi.fn();
  const second = vi.fn();
  f.owner.value = first;
  await settle();
  const target = panel();
  expect(target.tagName).toBe("DIV");
  expect(first).toHaveBeenCalledExactlyOnceWith(target);
  f.revision.value++;
  await settle();
  expect(first).toHaveBeenCalledTimes(1);
  f.owner.value = second;
  await settle();
  expect(first.mock.calls).toEqual([[target], [null]]);
  expect(second).toHaveBeenCalledExactlyOnceWith(target);
  expect(panel()).toBe(target);
  f.owner.value = undefined;
  await settle();
  expect(second.mock.calls).toEqual([[target], [null]]);
  f.wrapper.unmount();
  wrappers.pop();
  expect(first.mock.calls).toHaveLength(2);
  expect(second.mock.calls).toHaveLength(2);
});
it.each(["hidden", "display", "visibility", "detached"] as const)(
  "does not restore focus to a %s trigger",
  async (mode) => {
    const f = fixture();
    await settle();
    const focus = vi.spyOn(f.anchor, "focus");
    if (mode === "hidden") f.root.hidden = true;
    if (mode === "display") f.root.style.display = "none";
    if (mode === "visibility") f.root.style.visibility = "hidden";
    if (mode === "detached") f.anchor.remove();
    escape(panel());
    await settle();
    expect(f.close).toHaveBeenCalledExactlyOnceWith("escape");
    expect(focus).not.toHaveBeenCalled();
  }
);
it("ignores composing and prevented Escape, inherits direction, and rejects obsolete vendor callbacks", async () => {
  const f = fixture();
  f.anchor.style.direction = "rtl";
  f.revision.value++;
  await settle();
  expect(panel().dir).toBe("rtl");
  escape(panel(), { isComposing: true });
  const prevented = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  prevented.preventDefault();
  panel().dispatchEvent(prevented);
  expect(f.close).not.toHaveBeenCalled();
  const close = f.wrapper.getComponent(QMenu).props("onUpdate:modelValue");
  if (typeof close !== "function")
    throw new Error("Missing native controlled handler");
  f.current.value = false;
  await settle();
  close(false);
  expect(f.close).not.toHaveBeenCalled();
  expect(document.getElementById("native-panel")).toBeNull();
});
it("does not steal focus from navigation scheduled after an accepted Escape", async () => {
  const f = fixture();
  const outside = document.createElement("button");
  document.body.append(outside);
  roots.push(outside);
  await settle();
  f.close.mockImplementation(() => {
    f.open.value = false;
    void nextTick(() => outside.focus());
  });
  escape(panel());
  await settle();
  expect(document.activeElement).toBe(outside);
});
