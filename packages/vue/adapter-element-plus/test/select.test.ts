import { describe, expect, it, vi } from "vitest";
import { h, nextTick, ref, shallowRef } from "vue";

import ElementSelect from "../src/controls/ElementSelect.vue";
import { mount, node } from "./mount";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
async function open(root: ParentNode) {
  node<HTMLInputElement>(root, '[role="combobox"]').click();
  await tick();
}
function option(root: ParentNode, label: string): HTMLElement {
  const result = [
    ...root.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim() === label);
  if (!result) throw new Error(`Missing option ${label}`);
  return result;
}

describe("Element Plus controlled select", () => {
  it("keeps native naming and supported focus while styling the kit host", async () => {
    const control = shallowRef<{ focus(): void }>();
    const { root } = mount(() =>
      h(ElementSelect, {
        ref: control,
        value: "a",
        options,
        "aria-label": "Sort column",
        class: "host-select",
        "data-adapttable-part": "sort-select",
      })
    );
    await tick();
    const input = node<HTMLInputElement>(root, 'input[role="combobox"]');
    expect(input.getAttribute("aria-label")).toBe("Sort column");
    expect(input.closest(".el-select.host-select")).not.toBeNull();
    expect(node(root, '[data-adapttable-part="sort-select"]')).not.toBe(input);
    control.value?.focus();
    expect(document.activeElement).toBe(input);
  });

  it("requests one change and retains the selected option when the host rejects it", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(ElementSelect, { value: "a", options, onChange: change })
    );
    await tick();
    await open(root);
    option(root, "Beta").click();
    await tick();
    expect(change).toHaveBeenCalledExactlyOnceWith("b");
    await open(root);
    expect(option(root, "Alpha").getAttribute("aria-selected")).toBe("true");
    expect(option(root, "Beta").getAttribute("aria-selected")).toBe("false");
  });

  it("follows an accepted host update without a second change request", async () => {
    const value = ref("a");
    const change = vi.fn((next: string) => {
      value.value = next;
    });
    const { root } = mount(() =>
      h(ElementSelect, { value: value.value, options, onChange: change })
    );
    await tick();
    await open(root);
    option(root, "Beta").click();
    await tick();
    expect(value.value).toBe("b");
    expect(change).toHaveBeenCalledExactlyOnceWith("b");
    await open(root);
    expect(option(root, "Beta").getAttribute("aria-selected")).toBe("true");
    expect(option(root, "Alpha").getAttribute("aria-selected")).toBe("false");
  });

  it("keeps its native input disabled and does not open from activation", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(ElementSelect, {
        value: "a",
        options,
        disabled: true,
        onChange: change,
      })
    );
    await tick();
    const input = node<HTMLInputElement>(root, 'input[role="combobox"]');
    expect(input.disabled).toBe(true);
    input.click();
    await tick();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(change).not.toHaveBeenCalled();
  });
});
