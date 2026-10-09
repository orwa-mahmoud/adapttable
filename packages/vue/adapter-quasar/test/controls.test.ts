import { readFileSync } from "node:fs";

import { mount } from "@vue/test-utils";
import { QSelect, Quasar } from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSSRApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
} from "vue";

import {
  QuasarButton,
  QuasarCheckbox,
  QuasarInput,
  QuasarSelect,
} from "../src/controls";
import { controlsFixture } from "./fixture";

const mounts: ReturnType<typeof mount>[] = [];
const host: typeof mount = (component, options) => {
  const wrapper = mount(component, {
    ...options,
    attachTo: document.body,
    global: { plugins: [Quasar] },
  });
  mounts.push(wrapper);
  return wrapper;
};
afterEach(async () => {
  for (const wrapper of mounts.splice(0)) wrapper.unmount();
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
});
const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("Quasar control targets", () => {
  it("hydrates the checked-in real Node server output without replacing controls or reporting mismatches", async () => {
    const container = document.createElement("div");
    container.innerHTML = readFileSync(
      `${import.meta.dirname}/server-controls.html`,
      "utf8"
    );
    document.body.append(container);
    const input = container.querySelector("input");
    const checkbox = container.querySelector('[role="checkbox"]');
    const target = vi.fn();
    const warnings = vi.spyOn(console, "warn");
    const errors = vi.spyOn(console, "error");
    const app = createSSRApp({
      render: () => controlsFixture("First request", false, target),
    });
    app.use(Quasar);
    try {
      app.mount(container);
      await settle();
      expect(container.querySelector("input")).toBe(input);
      expect(container.querySelector('[role="checkbox"]')).toBe(checkbox);
      expect(warnings).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
      expect(target).toHaveBeenCalledWith(input);
      expect(input).toBeInstanceOf(HTMLInputElement);
      if (!(input instanceof HTMLInputElement))
        throw new Error("Missing hydrated input");
      input.focus();
      input.value = "Rejected";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await settle();
      expect(input.value).toBe("First request");
      expect(document.activeElement).toBe(input);
    } finally {
      app.unmount();
      container.remove();
    }
    expect(target).toHaveBeenLastCalledWith(null);
  });

  it("forwards native input semantics, classes, styles, keyboard events and owned refs", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const focus = vi.fn();
    const key = vi.fn();
    const attrs = {
      id: "filter-value",
      name: "filter",
      required: true,
      "data-adapttable-part": "filter-input",
      "aria-describedby": "help",
      dir: "rtl",
      className: "contract-input",
      style: { minWidth: 64 },
      onKeyDown: key,
      ref: first,
    };
    const control = {
      value: "Ada",
      label: "Name",
      attrs,
      onChange: vi.fn(),
      focusRef: focus,
    };
    const wrapper = host(QuasarInput, {
      props: { control, className: "consumer-input" },
    });
    await settle();
    const input = wrapper.get("input");
    expect(input.attributes()).toMatchObject({
      id: "filter-value",
      name: "filter",
      required: "",
      "data-adapttable-part": "filter-input",
      "aria-describedby": "help",
      "aria-label": "Name",
      dir: "rtl",
    });
    expect(input.classes()).toEqual(
      expect.arrayContaining(["contract-input", "consumer-input"])
    );
    expect((input.element as HTMLInputElement).style.minWidth).toBe("64px");
    expect(first).toHaveBeenLastCalledWith(input.element);
    expect(focus).toHaveBeenLastCalledWith(input.element);
    await input.trigger("keydown", { key: "ArrowLeft" });
    expect(key).toHaveBeenCalledTimes(1);
    await wrapper.setProps({
      control: { ...control, attrs: { ...attrs, ref: second } },
    });
    expect(first).toHaveBeenLastCalledWith(null);
    expect(second).toHaveBeenLastCalledWith(input.element);
    wrapper.unmount();
    mounts.pop();
    expect(second).toHaveBeenLastCalledWith(null);
    expect(focus).toHaveBeenLastCalledWith(null);
  });

  it("reconciles accepted and rejected input updates without replacing the focused native element", async () => {
    const value = ref("accepted");
    const accept = ref(false);
    const change = vi.fn((next: string) => {
      if (accept.value) value.value = next;
    });
    const wrapper = host(
      defineComponent(
        () => () =>
          h(QuasarInput, {
            control: {
              value: value.value,
              label: "Query",
              attrs: {},
              onChange: change,
            },
          })
      ),
      { props: {} }
    );
    const input = wrapper.get("input");
    (input.element as HTMLInputElement).focus();
    await input.setValue("rejected");
    await settle();
    expect((input.element as HTMLInputElement).value).toBe("accepted");
    expect(document.activeElement).toBe(input.element);
    expect(wrapper.get("input").element).toBe(input.element);
    accept.value = true;
    await input.setValue("updated");
    await settle();
    expect(value.value).toBe("updated");
    expect((input.element as HTMLInputElement).value).toBe("updated");
    expect(change.mock.calls).toEqual([["rejected"], ["updated"]]);
  });

  it("maps disabled/read-only/tabindex and follows native input replacement on textarea changes", async () => {
    const target = vi.fn();
    const control = {
      value: "Value",
      label: "Notes",
      attrs: { disabled: true, readOnly: true, tabIndex: -1, ref: target },
      onChange: vi.fn(),
    };
    const wrapper = host(QuasarInput, { props: { control } });
    await settle();
    expect(wrapper.get("input").attributes()).toMatchObject({
      disabled: "",
      readonly: "",
      tabindex: "-1",
    });
    const original = wrapper.get("input").element;
    await wrapper.setProps({ control: { ...control, type: "textarea" } });
    await settle();
    expect(target.mock.calls).toEqual([
      [original],
      [null],
      [wrapper.get("textarea").element],
    ]);
  });

  it("exposes QSelect's genuine combobox through the standard label association", async () => {
    const target = vi.fn();
    const key = vi.fn();
    const change = vi.fn();
    const wrapper = host(QuasarSelect, {
      props: {
        control: {
          label: "Size",
          value: "small",
          options: [
            { value: "small", label: "Small" },
            { value: "large", label: "Large" },
          ],
          attrs: {
            id: "page-size",
            "data-adapttable-part": "page-size",
            "aria-describedby": "page-help",
            className: "select-host",
            dir: "rtl",
            onKeyDown: key,
            ref: target,
          },
          onChange: change,
        },
      },
    });
    await settle();
    const input = wrapper.get('input[role="combobox"]');
    expect(input.attributes()).toMatchObject({
      id: "page-size",
      "aria-label": "Size",
      "aria-describedby": "page-help",
      "data-adapttable-part": "page-size",
      dir: "rtl",
    });
    expect((wrapper.get("label").element as HTMLLabelElement).control).toBe(
      input.element
    );
    expect(wrapper.get("label").classes()).toContain("select-host");
    expect(target).toHaveBeenLastCalledWith(input.element);
    await input.trigger("keydown", { key: "ArrowDown", keyCode: 40 });
    expect(key).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    mounts.pop();
    expect(target).toHaveBeenLastCalledWith(null);
  });

  it("rechecks native select placement while its popup is open and retires the scroll listener", async () => {
    const wrapper = host(QuasarSelect, {
      props: {
        control: {
          value: "small",
          label: "Size",
          options: [{ value: "small", label: "Small" }],
          attrs: {},
          onChange: vi.fn(),
        },
      },
    });
    const native = wrapper.getComponent(QSelect);
    const update = vi.spyOn(native.vm, "updateMenuPosition");
    native.vm.$emit("popupShow");
    await settle();
    update.mockClear();
    wrapper.element.dispatchEvent(new Event("scroll"));
    expect(update).toHaveBeenCalledOnce();
    native.vm.$emit("popupHide");
    wrapper.element.dispatchEvent(new Event("scroll"));
    expect(update).toHaveBeenCalledOnce();
    await settle();
    wrapper.element.dispatchEvent(new Event("scroll"));
    expect(update).toHaveBeenCalledOnce();
    native.vm.$emit("popupShow");
    await settle();
    expect(update).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    mounts.pop();
    window.dispatchEvent(new Event("scroll"));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("suspends popup positioning while cached by KeepAlive and resumes on activation", async () => {
    const visible = ref(true);
    const wrapper = host(
      defineComponent(
        () => () =>
          h(KeepAlive, null, {
            default: () =>
              visible.value
                ? h(QuasarSelect, {
                    control: {
                      value: "small",
                      label: "Size",
                      options: [{ value: "small", label: "Small" }],
                      attrs: {},
                      onChange: vi.fn(),
                    },
                  })
                : null,
          })
      )
    );
    const native = wrapper.getComponent(QSelect);
    const update = vi.spyOn(native.vm, "updateMenuPosition");
    native.vm.$emit("popupShow");
    await settle();
    update.mockClear();
    visible.value = false;
    await settle();
    window.dispatchEvent(new Event("scroll"));
    expect(update).not.toHaveBeenCalled();
    visible.value = true;
    await settle();
    update.mockClear();
    window.dispatchEvent(new Event("scroll"));
    expect(update).toHaveBeenCalledOnce();
  });

  it("retargets select refs for Quasar's mobile dialog and restores the original combobox", async () => {
    const target = vi.fn();
    const wrapper = host(QuasarSelect, {
      props: {
        control: {
          value: "small",
          label: "Size",
          options: [{ value: "small", label: "Small" }],
          attrs: {
            id: "dialog-choice",
            behavior: "dialog",
            transitionDuration: 0,
            ref: target,
          },
          onChange: vi.fn(),
        },
      },
    });
    await settle();
    const original = wrapper.get('input[role="combobox"]').element;
    wrapper.getComponent(QSelect).vm.showPopup();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 25));
    const dialogInput = document.getElementById("dialog-choice");
    expect(dialogInput).not.toBe(original);
    expect(dialogInput?.getAttribute("role")).toBe("combobox");
    expect(target).toHaveBeenLastCalledWith(dialogInput);
    expect(target.mock.calls).toContainEqual([null]);
    wrapper.getComponent(QSelect).vm.hidePopup();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 25));
    await settle();
    expect(document.getElementById("dialog-choice")).toBe(original);
    expect(target).toHaveBeenLastCalledWith(original);
  });

  it("renders a real mixed-state QCheckbox role host, emits once and keeps rejected state", async () => {
    const target = vi.fn();
    const change = vi.fn();
    const legacy = vi.fn();
    const control = {
      label: "Select row",
      checked: false,
      indeterminate: true,
      attrs: {
        id: "row-select",
        "data-adapttable-part": "row-select",
        onChange: legacy,
        type: "checkbox",
        ref: target,
      },
      onChange: change,
    };
    const wrapper = host(QuasarCheckbox, { props: { control } });
    await settle();
    const checkbox = wrapper.get('[role="checkbox"]');
    expect(checkbox.element.tagName).toBe("DIV");
    expect(checkbox.attributes("aria-checked")).toBe("mixed");
    expect(checkbox.attributes("data-adapttable-part")).toBe("row-select");
    expect(target).toHaveBeenLastCalledWith(checkbox.element);
    await checkbox.trigger("click");
    await settle();
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith(true);
    expect(legacy).not.toHaveBeenCalled();
    expect(checkbox.attributes("aria-checked")).toBe("mixed");
    await wrapper.setProps({
      control: { ...control, checked: true, indeterminate: false },
    });
    expect(checkbox.attributes("aria-checked")).toBe("true");
    await checkbox.trigger("keyup", { key: " ", keyCode: 32 });
    expect(change).toHaveBeenLastCalledWith(false);
    wrapper.unmount();
    mounts.pop();
    expect(target).toHaveBeenLastCalledWith(null);
  });

  it("uses QBtn's native button for semantics, events, disabled state and ref cleanup", async () => {
    const target = vi.fn();
    const click = vi.fn();
    const attrs = {
      "data-adapttable-part": "fullscreen-toggle",
      "aria-label": "Fullscreen",
      className: "fullscreen",
      onClick: click,
      ref: target,
    };
    const wrapper = host(QuasarButton, {
      props: { attrs, label: "Fullscreen" },
    });
    await settle();
    const button = wrapper.get("button");
    expect(target).toHaveBeenLastCalledWith(button.element);
    expect(button.attributes("type")).toBe("button");
    expect(button.classes()).toContain("fullscreen");
    await button.trigger("click");
    expect(click).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ attrs: { ...attrs, disabled: true } });
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(click).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    mounts.pop();
    expect(target).toHaveBeenLastCalledWith(null);
  });
});
