import { formatMultiDraft } from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QDialog, QMenu, QSelect, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, shallowRef } from "vue";

import QuasarMultiSelect from "../src/controls/QuasarMultiSelect.vue";
import QuasarFilterSurface from "../src/filters/QuasarFilterSurface.vue";
const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});
it("keeps the same multi-select input on rejection, replaces ref ownership, and follows dialog targets", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const owner = shallowRef<typeof first | undefined>(first);
  const revision = shallowRef(0);
  const change = vi.fn();
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(QuasarMultiSelect, {
          attrs: {
            id: "multi-target",
            behavior: "dialog",
            transitionDuration: 0,
            ref: owner.value,
            "data-revision": revision.value,
          },
          draft: formatMultiDraft(["a"]),
          label: "Tags",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
          onChange: change,
        })
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  await settle();
  const input = wrapper.get('[role="combobox"]').element;
  expect(first).toHaveBeenCalledExactlyOnceWith(input);
  revision.value++;
  await settle();
  expect(first).toHaveBeenCalledTimes(1);
  owner.value = second;
  await settle();
  expect(first).toHaveBeenLastCalledWith(null);
  expect(second).toHaveBeenCalledExactlyOnceWith(input);
  expect(wrapper.get('[role="combobox"]').element).toBe(input);
  wrapper.getComponent(QSelect).vm.toggleOption({ value: "b", label: "B" });
  await settle();
  expect(change).toHaveBeenCalledExactlyOnceWith(formatMultiDraft(["a", "b"]));
  expect(wrapper.getComponent(QSelect).props("modelValue")).toEqual(["a"]);
  wrapper.getComponent(QSelect).vm.showPopup();
  await settle();
  expect(document.getElementById("multi-target")).not.toBe(input);
  expect(second).toHaveBeenLastCalledWith(
    document.getElementById("multi-target")
  );
  wrapper.getComponent(QSelect).vm.hidePopup();
  await settle();
  expect(document.getElementById("multi-target")).toBe(input);
  expect(second).toHaveBeenLastCalledWith(input);
  owner.value = undefined;
  await settle();
  expect(second).toHaveBeenLastCalledWith(null);
});
it.each([false, true])(
  "delegates Escape dismissal to the actual Quasar modal=%s surface",
  async (modal) => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    const open = shallowRef(true);
    const close = vi.fn(() => {
      open.value = false;
    });
    const wrapper = mount(
      defineComponent(
        () => () =>
          h(QuasarFilterSurface, {
            open: open.value,
            anchor: button,
            label: "Filters",
            dir: "rtl",
            modal,
            onClose: close,
            children: h("button", { autofocus: true }, "Inside"),
          })
      ),
      { attachTo: document.body, global: { plugins: [Quasar] } }
    );
    wrappers.push(wrapper);
    await settle();
    expect(wrapper.findComponent(modal ? QDialog : QMenu).exists()).toBe(true);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
      })
    );
    document.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Escape", keyCode: 27, bubbles: true })
    );
    await settle();
    expect(close).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);
    button.remove();
  }
);
it("retains controlled open state when a surface close request is rejected", async () => {
  const button = document.createElement("button");
  document.body.append(button);
  const close = vi.fn();
  const wrapper = mount(QuasarFilterSurface, {
    props: {
      open: true,
      anchor: button,
      label: "Filters",
      dir: "ltr",
      modal: false,
      onClose: close,
      children: h("button", "Inside"),
    },
    attachTo: document.body,
    global: { plugins: [Quasar] },
  });
  wrappers.push(wrapper);
  await settle();
  wrapper.getComponent(QMenu).vm.hide();
  await settle();
  expect(close).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector('[data-adapttable-part="filters-popover"]')
  ).not.toBeNull();
  button.remove();
});
