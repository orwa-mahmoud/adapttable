import { describe, expect, it, vi } from "vitest";
import {
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  onDeactivated,
  ref,
} from "vue";

import ElementCheckbox from "../src/controls/ElementCheckbox.vue";
import { mount, node } from "./mount";
const tick = async () => {
  await nextTick();
  await nextTick();
};
function observe(input: HTMLInputElement) {
  return {
    checked: vi.spyOn(input, "checked", "set"),
    mixed: vi.spyOn(input, "indeterminate", "set"),
  };
}
describe("Element checkbox queued reconciliation ownership", () => {
  it("does not write after its change handler synchronously unmounts the owner", async () => {
    const changed = vi.fn(() => view.unmount());
    const view = mount(() =>
      h(ElementCheckbox, {
        checked: false,
        indeterminate: true,
        label: "Select",
        onChange: changed,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    const writes = observe(input);
    input.click();
    await tick();
    expect(changed).toHaveBeenCalledExactlyOnceWith(true);
    expect(input.isConnected).toBe(false);
    expect(writes.checked).not.toHaveBeenCalled();
    expect(writes.mixed).not.toHaveBeenCalled();
  });
  it("retires the queued write during KeepAlive deactivation and reconciles on the next activation", async () => {
    const visible = ref(true);
    let retired = false;
    const changed = vi.fn(() => {
      visible.value = false;
    });
    const Child = defineComponent({
      setup() {
        onDeactivated(() => {
          retired = true;
        });
        return () =>
          h(ElementCheckbox, {
            checked: false,
            indeterminate: true,
            label: "Select",
            onChange: changed,
          });
      },
    });
    const view = mount(() =>
      h(KeepAlive, null, {
        default: () => (visible.value ? h(Child) : h("span")),
      })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    const writes = observe(input);
    input.click();
    await tick();
    expect(retired).toBe(true);
    expect(changed).toHaveBeenCalledExactlyOnceWith(true);
    expect(input.isConnected).toBe(false);
    expect(writes.checked).not.toHaveBeenCalled();
    expect(writes.mixed).not.toHaveBeenCalled();
    visible.value = true;
    await tick();
    expect(node(view.root, "input")).toBe(input);
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(true);
    expect(writes.checked).toHaveBeenCalledExactlyOnceWith(false);
    expect(writes.mixed).toHaveBeenCalledExactlyOnceWith(true);
  });
  it("does not repaint a detached native input or its physical replacement", async () => {
    let replacement: HTMLInputElement | undefined;
    let replacementWrites: ReturnType<typeof observe> | undefined;
    const changed = vi.fn(() => {
      replacement = document.createElement("input");
      replacement.type = "checkbox";
      replacementWrites = observe(replacement);
      input.replaceWith(replacement);
    });
    const view = mount(() =>
      h(ElementCheckbox, {
        checked: false,
        indeterminate: true,
        label: "Select",
        onChange: changed,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    const writes = observe(input);
    input.click();
    await tick();
    expect(input.isConnected).toBe(false);
    expect(node(view.root, "input")).toBe(replacement);
    expect(writes.checked).not.toHaveBeenCalled();
    expect(writes.mixed).not.toHaveBeenCalled();
    expect(replacementWrites?.checked).not.toHaveBeenCalled();
    expect(replacementWrites?.mixed).not.toHaveBeenCalled();
  });
  it("retires a replaced keyed control and leaves the successor's values intact", async () => {
    const key = ref("old");
    const changed = vi.fn(() => {
      key.value = "new";
    });
    const view = mount(() =>
      h(ElementCheckbox, {
        key: key.value,
        checked: false,
        indeterminate: key.value === "old",
        label: "Select",
        onChange: changed,
      })
    );
    await tick();
    const old = node<HTMLInputElement>(view.root, "input");
    const writes = observe(old);
    old.click();
    await tick();
    const successor = node<HTMLInputElement>(view.root, "input");
    expect(successor).not.toBe(old);
    expect(old.isConnected).toBe(false);
    expect(writes.checked).not.toHaveBeenCalled();
    expect(writes.mixed).not.toHaveBeenCalled();
    expect(successor.checked).toBe(false);
    expect(successor.indeterminate).toBe(false);
    successor.click();
    await tick();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(successor.checked).toBe(false);
  });
  it("retires the old activation and lets the replacement ref owner reconcile once", async () => {
    const second = vi.fn();
    const owner = ref<(input: HTMLInputElement | null) => void>(
      () => undefined
    );
    const changed = vi.fn(() => {
      owner.value = second;
    });
    const view = mount(() =>
      h(ElementCheckbox, {
        checked: false,
        label: "Select",
        inputRef: owner.value,
        onChange: changed,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    const writes = observe(input);
    second.mockImplementation((target: unknown) => {
      if (target) {
        writes.checked.mockClear();
        writes.mixed.mockClear();
      }
    });
    input.click();
    await tick();
    expect(second).toHaveBeenCalledExactlyOnceWith(input);
    expect(writes.checked).toHaveBeenCalledExactlyOnceWith(false);
    expect(writes.mixed).toHaveBeenCalledExactlyOnceWith(false);
    expect(input.checked).toBe(false);
  });
});
