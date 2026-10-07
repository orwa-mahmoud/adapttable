import type { ElementRef } from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import ElementInput from "../src/controls/ElementInput.vue";
import { mount, node } from "./mount";
type Field = HTMLInputElement | HTMLTextAreaElement;
async function tick() {
  await nextTick();
  await nextTick();
}
describe("Element Plus public input target", () => {
  it("preserves one native target through updates and releases replaced or removed owners", async () => {
    const first = vi.fn<ElementRef<Field>>();
    const second = vi.fn<ElementRef<Field>>();
    const owner = shallowRef<ElementRef<Field> | undefined>(first);
    const value = shallowRef("Ada");
    const view = mount(() =>
      h(ElementInput, {
        value: value.value,
        inputRef: owner.value,
        "aria-label": "Name",
        class: "host-field",
        "data-adapttable-part": "test-field",
      })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    expect(first.mock.calls).toEqual([[input]]);
    expect(input.getAttribute("data-adapttable-part")).toBe("test-field");
    expect(input.closest(".el-input")?.classList.contains("host-field")).toBe(
      true
    );
    value.value = "Grace";
    await tick();
    expect(node(view.root, "input")).toBe(input);
    expect(input.value).toBe("Grace");
    expect(first.mock.calls).toEqual([[input]]);
    owner.value = second;
    await tick();
    expect(first.mock.calls).toEqual([[input], [null]]);
    expect(second.mock.calls).toEqual([[input]]);
    owner.value = undefined;
    await tick();
    expect(second.mock.calls).toEqual([[input], [null]]);
    view.unmount();
    expect(second).toHaveBeenCalledTimes(2);
  });
  it("releases the old native input before attaching a replacement textarea and input", async () => {
    const owner = vi.fn<ElementRef<Field>>();
    const type = shallowRef<"text" | "textarea">("text");
    const view = mount(() =>
      h(ElementInput, { value: "Ada", type: type.value, inputRef: owner })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    type.value = "textarea";
    await tick();
    const textarea = node<HTMLTextAreaElement>(view.root, "textarea");
    expect(owner.mock.calls).toEqual([[input], [null], [textarea]]);
    expect(input.isConnected).toBe(false);
    type.value = "text";
    await tick();
    const replacement = node<HTMLInputElement>(view.root, "input");
    expect(owner.mock.calls).toEqual([
      [input],
      [null],
      [textarea],
      [null],
      [replacement],
    ]);
    view.unmount();
    expect(owner.mock.calls.at(-1)).toEqual([null]);
  });
  it("releases a ref that synchronously disposes its scope during attachment", async () => {
    const owner = shallowRef<ElementRef<Field>>();
    const view = mount(() =>
      h(ElementInput, { value: "", inputRef: owner.value })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    const callback = vi.fn<ElementRef<Field>>((target) => {
      if (target) view.unmount();
    });
    owner.value = callback;
    await tick();
    expect(callback.mock.calls).toEqual([[input], [null]]);
    expect(input.isConnected).toBe(false);
  });
  it("does not attach a successor after release synchronously disposes its owner", async () => {
    const lifetime: { stop?: () => void } = {};
    const first = vi.fn<ElementRef<Field>>((target) => {
      if (target === null) lifetime.stop?.();
    });
    const second = vi.fn<ElementRef<Field>>();
    const owner = shallowRef(first);
    const view = mount(() =>
      h(ElementInput, { value: "", inputRef: owner.value })
    );
    await tick();
    const input = node<HTMLInputElement>(view.root, "input");
    lifetime.stop = view.unmount;
    owner.value = second;
    await tick();
    expect(first.mock.calls).toEqual([[input], [null]]);
    expect(second).not.toHaveBeenCalled();
  });
});
