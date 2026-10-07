import type { ElementRef } from "@adapttable/vue";
import { formatMultiDraft } from "@adapttable/vue/adapter";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { DataTable } from "../src";
import NuxtMultiSelect from "../src/controls/NuxtMultiSelect";
import { editing } from "../src/editing";

const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};
const stops: (() => void)[] = [];
afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await settle();
});
function mount(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    render: () => h(UApp, { toaster: null }, { default: render }),
  }).use(ui);
  app.mount(root);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    app.unmount();
    root.remove();
  };
  stops.push(stop);
  return { root, stop };
}
function key(node: HTMLElement, key: string) {
  node.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}
function find(root: ParentNode, selector: string): HTMLElement {
  const node = root.querySelector<HTMLElement>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

describe("Nuxt editor native ownership and retirement", () => {
  it.each([false, true])(
    "keeps multi-select controlled and native refs stable (accept=%s)",
    async (accept) => {
      const first = vi.fn(),
        second = vi.fn();
      const owner = shallowRef<ElementRef<HTMLButtonElement>>(first);
      const draft = shallowRef(formatMultiDraft(["a"]));
      const change = vi.fn((value: string) => {
        if (accept) draft.value = value;
      });
      const view = mount(() =>
        h(NuxtMultiSelect, {
          attrs: { ref: owner.value },
          draft: draft.value,
          label: "Tags",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
          onChange: change,
          focusRef: owner.value,
        })
      );
      await settle();
      const trigger = find(view.root, 'button[role="combobox"]');
      expect(first.mock.calls).toEqual([[trigger]]);
      trigger.focus();
      key(trigger, "ArrowDown");
      await settle();
      const option = Array.from(
        view.root.querySelectorAll<HTMLElement>('[role="option"]')
      ).find((node) => node.textContent?.trim() === "B");
      expect(option).toBeDefined();
      option?.focus();
      if (option) key(option, "Enter");
      await settle();
      expect(change).toHaveBeenCalledExactlyOnceWith(
        formatMultiDraft(["a", "b"])
      );
      expect(option?.getAttribute("data-state")).toBe(
        accept ? "checked" : "unchecked"
      );
      key(find(view.root, '[role="listbox"]'), "Escape");
      await settle();
      owner.value = second;
      await settle();
      expect(first.mock.calls).toEqual([[trigger], [null]]);
      expect(second.mock.calls).toEqual([[trigger]]);
      expect(find(view.root, 'button[role="combobox"]')).toBe(trigger);
      view.stop();
      expect(second.mock.calls.at(-1)).toEqual([null]);
    }
  );
  it("retires an open editor popup and rejects stale native events across KeepAlive", async () => {
    interface Row {
      id: string;
      name: string;
    }
    const shown = shallowRef(true);
    const save = vi.fn();
    const view = mount(() =>
      h(KeepAlive, null, {
        default: () =>
          shown.value
            ? h(DataTable<Row>, {
                key: "table",
                data: [{ id: "a", name: "Ada" }],
                columns: [
                  {
                    key: "name",
                    editable: true,
                    editor: { type: "select", options: ["Ada", "Grace"] },
                  },
                ],
                rowKey: (row) => row.id,
                urlSync: false,
                forceMobile: false,
                searchable: false,
                features: [editing<Row>(save)],
              })
            : null,
      })
    );
    await settle();
    const activate = find(
      view.root,
      '[data-adapttable-part="edit-cell-activate"]'
    );
    activate.focus();
    key(activate, "F2");
    await settle();
    const editor = find(view.root, '[data-adapttable-part="edit-cell-editor"]');
    key(editor, "ArrowDown");
    await settle();
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    shown.value = false;
    await settle();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    key(editor, "Enter");
    await settle();
    expect(save).not.toHaveBeenCalled();
    shown.value = true;
    await settle();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    key(editor, "Enter");
    await settle();
    expect(save).not.toHaveBeenCalled();
    const restored = find(
      view.root,
      '[data-adapttable-part="edit-cell-editor"]'
    );
    restored.focus();
    key(restored, "Escape");
    await settle();
    expect(
      view.root.querySelector('[data-adapttable-part="edit-cell-editor"]')
    ).toBeNull();
    expect(
      view.root.querySelector('[data-adapttable-part="edit-cell-activate"]')
    ).not.toBeNull();
    view.stop();
    key(editor, "Enter");
    await settle();
    expect(save).not.toHaveBeenCalled();
  });
});
