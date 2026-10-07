import { ID_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";

import ElementCheckbox from "../src/controls/ElementCheckbox.vue";
import { mount, node } from "./mount";

const settle = async () => {
  await nextTick();
  await nextTick();
};

describe("Element Plus compound checkbox", () => {
  it("keeps the public part and class on the kit host and labels its input", async () => {
    const { root } = mount(() =>
      h(ElementCheckbox, {
        checked: true,
        indeterminate: true,
        label: "Select all rows",
        id: "all-rows",
        tabindex: -1,
        class: "selection-hook",
        "data-adapttable-part": "selection-checkbox",
      })
    );
    await settle();
    const label = node<HTMLLabelElement>(root, "label.el-checkbox");
    const input = node<HTMLInputElement>(root, "input");
    expect(label.dataset.adapttablePart).toBe("selection-checkbox");
    expect(label.classList.contains("selection-hook")).toBe(true);
    expect(label.control).toBe(input);
    expect(label.textContent).toBe("Select all rows");
    expect(input.id).toBe("all-rows");
    expect(input.tabIndex).toBe(-1);
    expect(input.checked).toBe(true);
    expect(input.indeterminate).toBe(true);
  });

  it("requests once per input change and restores rejected controlled values", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(ElementCheckbox, {
        checked: false,
        label: "Select row",
        onChange: change,
      })
    );
    const input = node<HTMLInputElement>(root, "input");
    input.click();
    await settle();
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenLastCalledWith(true);
    expect(input.checked).toBe(false);
    input.click();
    await settle();
    expect(change).toHaveBeenCalledTimes(2);
    expect(input.checked).toBe(false);
  });

  it("renders accepted state and prevents disabled and readonly edits", async () => {
    const value = ref(false);
    const change = vi.fn((next: boolean) => {
      value.value = next;
    });
    const { root } = mount(() =>
      h(ElementCheckbox, {
        checked: value.value,
        label: "Select row",
        onChange: change,
      })
    );
    node<HTMLInputElement>(root, "input").click();
    await settle();
    expect(value.value).toBe(true);
    expect(node<HTMLInputElement>(root, "input").checked).toBe(true);
    for (const property of ["disabled", "readonly"] as const) {
      const locked = mount(() =>
        h(ElementCheckbox, {
          checked: false,
          label: "Locked row",
          [property]: true,
          onChange: change,
        })
      );
      node<HTMLInputElement>(locked.root, "input").click();
      await settle();
      expect(change).toHaveBeenCalledTimes(1);
      locked.unmount();
    }
  });

  it("lets native input activation finish and emits one request for keyboard-style and label clicks", async () => {
    const value = ref(false);
    const change = vi.fn((next: boolean) => {
      value.value = next;
    });
    const { root } = mount(() =>
      h(ElementCheckbox, {
        checked: value.value,
        label: "Select row",
        onChange: change,
      })
    );
    const input = node<HTMLInputElement>(root, "input");
    const nativeChange = vi.fn();
    input.addEventListener("change", nativeChange);
    input.focus();
    const activation = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      detail: 0,
    });
    expect(input.dispatchEvent(activation)).toBe(true);
    await settle();
    expect(activation.defaultPrevented).toBe(false);
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(input.checked).toBe(true);
    expect(document.activeElement).toBe(input);
    node<HTMLLabelElement>(root, "label").click();
    await settle();
    expect(change.mock.calls).toEqual([[true], [false]]);
    expect(nativeChange).toHaveBeenCalledTimes(2);
    expect(input.checked).toBe(false);
  });

  it("restores rejected mixed state after every real native change", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(ElementCheckbox, {
        checked: false,
        indeterminate: true,
        label: "Select all",
        onChange: change,
      })
    );
    const input = node<HTMLInputElement>(root, "input");
    for (let count = 1; count <= 2; count += 1) {
      input.click();
      await settle();
      expect(change).toHaveBeenCalledTimes(count);
      expect(change).toHaveBeenLastCalledWith(true);
      expect(input.checked).toBe(false);
      expect(input.indeterminate).toBe(true);
    }
  });

  it("forwards its associated input ref and clears it on destruction", async () => {
    const inputRef = vi.fn();
    const { root, unmount } = mount(() =>
      h(ElementCheckbox, { checked: false, label: "Select row", inputRef })
    );
    await settle();
    const input = node<HTMLInputElement>(root, "input");
    expect(inputRef).toHaveBeenLastCalledWith(input);
    input.focus();
    expect(document.activeElement).toBe(input);
    unmount();
    expect(inputRef).toHaveBeenLastCalledWith(null);
  });

  it("requests one change from a real label activation", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(ElementCheckbox, {
        checked: false,
        label: "Select row",
        onChange: change,
      })
    );
    await settle();
    node<HTMLLabelElement>(root, "label").click();
    await settle();
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
    expect(node<HTMLInputElement>(root, "input").checked).toBe(false);
  });

  it("releases a replaced control ref before forwarding the new input", async () => {
    const key = ref("first");
    const inputRef = vi.fn();
    const { root } = mount(() =>
      h(ElementCheckbox, {
        key: key.value,
        checked: false,
        label: "Select row",
        inputRef,
      })
    );
    await settle();
    const first = node<HTMLInputElement>(root, "input");
    expect(inputRef).toHaveBeenLastCalledWith(first);
    inputRef.mockClear();
    key.value = "second";
    await settle();
    const second = node<HTMLInputElement>(root, "input");
    expect(second).not.toBe(first);
    expect(inputRef.mock.calls[0]).toEqual([null]);
    expect(inputRef).toHaveBeenLastCalledWith(second);
    expect(node<HTMLLabelElement>(root, "label").control).toBe(second);
  });

  it("preserves nested label names and supplied IDs across SSR hydration", async () => {
    const render = () =>
      h("div", [
        h(ElementCheckbox, {
          checked: false,
          id: "row-a",
          label: "Select Alice",
        }),
        h(ElementCheckbox, { checked: true, id: "row-b", label: "Select Bob" }),
      ]);
    const server = createSSRApp(render);
    server.provide(ID_INJECTION_KEY, { prefix: 4300, current: 0 });
    const html = await renderToString(server);
    const root = document.createElement("div");
    root.innerHTML = html;
    document.body.append(root);
    const labels = [
      ...root.querySelectorAll<HTMLLabelElement>("label.el-checkbox"),
    ];
    expect(labels).toHaveLength(2);
    expect(labels.map((label) => label.textContent)).toEqual([
      "Select Alice",
      "Select Bob",
    ]);
    expect(
      labels.every((label) => label.control instanceof HTMLInputElement)
    ).toBe(true);
    const warnings: unknown[][] = [];
    const warn = vi
      .spyOn(console, "warn")
      .mockImplementation((...args) => warnings.push(args));
    const errors = vi
      .spyOn(console, "error")
      .mockImplementation((...args) => warnings.push(args));
    const client = createSSRApp(render);
    client.provide(ID_INJECTION_KEY, { prefix: 4300, current: 0 });
    try {
      client.mount(root);
      await settle();
      expect(node<HTMLInputElement>(root, "#row-a").checked).toBe(false);
      expect(node<HTMLInputElement>(root, "#row-b").checked).toBe(true);
      expect(root.querySelectorAll("#row-a")).toHaveLength(1);
      expect(root.querySelectorAll("#row-b")).toHaveLength(1);
      expect(warnings).toEqual([]);
    } finally {
      client.unmount();
      root.remove();
      warn.mockRestore();
      errors.mockRestore();
    }
  });
});
