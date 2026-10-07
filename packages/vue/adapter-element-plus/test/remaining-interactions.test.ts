import {
  CommandPaletteChrome,
  ContextMenuChrome,
  ExportProgressChrome,
  resolveLabels,
  SidePanelChrome,
} from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { elementExportSlots } from "../src/actions/elementExportSlots";
import {
  elementContextMenuSlots,
  elementPaletteSlots,
  elementSidePanelSlots,
} from "../src/actions/elementRemainingControls";
import ElementSelect from "../src/controls/ElementSelect.vue";
import { mount, node } from "./mount";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 35));
  await nextTick();
}
async function key(target: HTMLElement, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await tick();
}
it("uses native menu keyboard navigation and rejects controlled dismissal without losing the menu", async () => {
  const close = vi.fn();
  const selected = vi.fn();
  const slots = elementContextMenuSlots();
  const at = shallowRef<{ x: number; y: number } | null>({ x: 1, y: 2 });
  mount(() =>
    h(ContextMenuChrome, {
      at: at.value,
      onClose: close,
      slots,
      items: [
        {
          key: "disabled",
          label: "Disabled",
          disabled: true,
          onSelect: vi.fn(),
        },
        { key: "first", label: "First", onSelect: selected },
        { key: "last", label: "Last", onSelect: selected },
      ],
    })
  );
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 200));
  const menu = node<HTMLElement>(document.body, part("context-menu"));
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  items[1]!.focus();
  await key(items[1]!, "ArrowDown");
  expect(document.activeElement).toBe(items[2]);
  await key(items[2]!, "Home");
  expect(document.activeElement).toBe(items[1]);
  await key(items[1]!, "Escape");
  expect(close).toHaveBeenCalledTimes(1);
  expect(document.querySelector(part("context-menu"))).not.toBeNull();
  expect(selected).not.toHaveBeenCalled();
  at.value = null;
  await tick();
  expect(document.querySelector(part("context-menu"))).toBeNull();
});
it("retires the native palette surface during KeepAlive and reopens cleanly", async () => {
  const close = vi.fn();
  const selected = vi.fn();
  const slots = elementPaletteSlots();
  const shown = shallowRef(true);
  const Child = defineComponent(
    () => () =>
      h(CommandPaletteChrome, {
        open: true,
        commands: [{ key: "a", label: "Alpha", onSelect: selected }],
        onClose: close,
        slots,
      })
  );
  mount(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("span")) })
  );
  await tick();
  const old = node<HTMLButtonElement>(document.body, part("command-item"));
  shown.value = false;
  await tick();
  expect(document.querySelector(part("command-palette"))).toBeNull();
  old.click();
  await tick();
  expect(selected).not.toHaveBeenCalled();
  shown.value = true;
  await tick();
  expect(document.querySelector(part("command-palette"))).not.toBeNull();
});
it("lets the nested native Select consume its first Escape before closing the side panel", async () => {
  const close = vi.fn();
  const slots = elementSidePanelSlots();
  const model = {
    open: "one",
    side: "end" as const,
    onOpenChange: close,
    panels: [
      {
        key: "one",
        label: "Choice",
        content: () =>
          h(ElementSelect, {
            value: "a",
            options: [
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ],
          }),
      },
    ],
  };
  const view = mount(() =>
    h(SidePanelChrome, {
      model,
      slots,
      labels: resolveLabels(undefined),
      dir: "rtl",
    })
  );
  await tick();
  const input = node<HTMLInputElement>(view.root, 'input[role="combobox"]');
  input.click();
  await tick();
  expect(input.getAttribute("aria-expanded")).toBe("true");
  await key(input, "Escape");
  expect(close).not.toHaveBeenCalled();
  expect(input.getAttribute("aria-expanded")).toBe("false");
  await key(input, "Escape");
  expect(close).toHaveBeenCalledExactlyOnceWith(null);
});
it("renders native export progress and forwards cancel, retry and dismiss", async () => {
  const cancel = vi.fn();
  const retry = vi.fn();
  const dismiss = vi.fn();
  const progress = shallowRef({
    status: "busy" as const,
    value: 35,
    message: "Working",
    error: "",
    downloadUrl: undefined,
    onCancel: cancel,
    onRetry: undefined,
    onDismiss: undefined,
  });
  const view = mount(() =>
    h(ExportProgressChrome, {
      progress: progress.value,
      labels: resolveLabels(undefined),
      slots: elementExportSlots(),
    })
  );
  await tick();
  expect(
    node(view.root, part("export-progress-surface")).classList.contains(
      "el-card"
    )
  ).toBe(true);
  expect(view.root.querySelector(".el-progress")).not.toBeNull();
  node<HTMLButtonElement>(view.root, part("export-progress-cancel")).click();
  expect(cancel).toHaveBeenCalledTimes(1);
  const failed = mount(() =>
    h(ExportProgressChrome, {
      progress: {
        status: "failed",
        value: undefined,
        message: "",
        error: "Try again",
        downloadUrl: undefined,
        onCancel: undefined,
        onRetry: retry,
        onDismiss: dismiss,
      },
      labels: resolveLabels(undefined),
      slots: elementExportSlots(),
    })
  );
  await tick();
  expect(node(failed.root, '[role="alert"]').textContent).toContain(
    "Try again"
  );
  node<HTMLButtonElement>(failed.root, part("export-progress-retry")).click();
  node<HTMLButtonElement>(failed.root, part("export-progress-dismiss")).click();
  expect(retry).toHaveBeenCalledTimes(1);
  expect(dismiss).toHaveBeenCalledTimes(1);
});
