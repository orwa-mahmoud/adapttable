import { describe, expect, it, vi } from "vitest";
import { h, nextTick, ref, shallowRef } from "vue";

import ElementMultiSelect from "../src/controls/ElementMultiSelect.vue";
import { mount, node } from "./mount";
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
function option(root: ParentNode, label: string): HTMLElement {
  const found = [...root.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (item) => item.textContent?.trim() === label
  );
  if (!found) throw new Error(`Missing ${label}`);
  return found;
}
describe("Element controlled multi-select bridge", () => {
  it.each([false, true])(
    "keeps multiple choice controlled when the host accepts=%s",
    async (accept) => {
      const value = ref<string[]>(["a"]);
      const change = vi.fn((next: string[]) => {
        if (accept) value.value = next;
      });
      const control = shallowRef<{ focus(): void }>();
      const view = mount(() =>
        h(ElementMultiSelect, {
          ref: control,
          value: value.value,
          options: [
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ],
          onChange: change,
        })
      );
      await tick();
      const field = node<HTMLInputElement>(view.root, 'input[role="combobox"]');
      control.value?.focus();
      expect(document.activeElement).toBe(field);
      field.click();
      await tick();
      option(view.root, "Beta").click();
      await tick();
      expect(change).toHaveBeenCalledExactlyOnceWith(["a", "b"]);
      expect(option(view.root, "Beta").getAttribute("aria-selected")).toBe(
        String(accept)
      );
      expect(node(view.root, 'input[role="combobox"]')).toBe(field);
    }
  );
});
