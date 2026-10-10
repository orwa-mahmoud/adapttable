import type { ColumnDef, TableFeature } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { commandPalette } from "../src/command-palette";
import { sidePanel } from "../src/side-panel";
import { find, mountNuxt, part } from "./actions.helpers";

interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [{ id: "a", name: "Ada" }];
const columns: readonly ColumnDef<Row>[] = [{ key: "name", sortable: true }];
const labels = resolveLabels(undefined);
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 30));
  await nextTick();
};
const key = (
  node: HTMLElement,
  value: string,
  options: KeyboardEventInit = {}
) =>
  node.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
function table(features: readonly TableFeature<Row>[], extra = {}) {
  return h(DataTable<Row>, {
    data,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    features,
    ...extra,
  });
}
async function openPalette() {
  await settle();
  const button = find<HTMLButtonElement>(
    document,
    part("command-palette-button")
  );
  button.focus();
  button.click();
  await settle();
  return button;
}

describe("Nuxt command palette", () => {
  it("uses Nuxt modal/input/buttons for searchable commands, skips disabled entries and restores focus", async () => {
    const disabled = vi.fn();
    const selected = vi.fn();
    const features = [
      commandPalette({
        button: true,
        commands: [
          {
            key: "disabled",
            label: "Disabled",
            disabled: true,
            onSelect: disabled,
          },
          { key: "run", label: "Run report", onSelect: selected },
        ],
      }),
    ];
    mountNuxt(() =>
      table(features, {
        dir: "rtl",
        classNames: {
          commandPalette: "palette-class",
          commandInput: "query-class",
          commandItem: "item-class",
        },
      })
    );
    const button = await openPalette();
    const modal = find(document, part("command-palette"));
    const input = find<HTMLInputElement>(modal, part("command-input"));
    expect(modal.getAttribute("role")).toBe("dialog");
    expect(modal.getAttribute("dir")).toBe("rtl");
    expect(modal.classList.contains("palette-class")).toBe(true);
    expect(input.classList.contains("query-class")).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(
      find<HTMLButtonElement>(modal, '[role="option"][aria-disabled="true"]')
        .disabled
    ).toBe(true);
    input.value = "no matches";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(find(modal, part("command-empty")).textContent).toBe(
      labels.commandEmpty
    );
    input.value = "report";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(modal.querySelectorAll(part("command-item"))).toHaveLength(1);
    key(input, "Enter");
    await settle();
    expect(selected).toHaveBeenCalledOnce();
    expect(disabled).not.toHaveBeenCalled();
    expect(document.querySelector(part("command-palette"))).toBeNull();
    expect(document.activeElement).toBe(button);
  });
  it("honors rejected controlled requests and retires cached modal handlers", async () => {
    const shown = shallowRef(true);
    const open = shallowRef(false);
    const changed = vi.fn();
    const run = vi.fn();
    const features = [
      commandPalette({
        open,
        onOpenChange: changed,
        button: true,
        commands: [{ key: "run", label: "Run", onSelect: run }],
      }),
    ];
    mountNuxt(() =>
      h(KeepAlive, null, {
        default: () => (shown.value ? table(features) : h("div", "Away")),
      })
    );
    await openPalette();
    expect(changed).toHaveBeenLastCalledWith(true);
    expect(document.querySelector(part("command-palette"))).toBeNull();
    open.value = true;
    await settle();
    const input = find<HTMLInputElement>(document, part("command-input"));
    key(input, "Escape");
    await settle();
    expect(changed).toHaveBeenLastCalledWith(false);
    expect(document.querySelector(part("command-palette"))).not.toBeNull();
    const old = find<HTMLButtonElement>(document, part("command-item"));
    shown.value = false;
    await settle();
    old.click();
    await settle();
    expect(run).not.toHaveBeenCalled();
    expect(document.querySelector(part("command-palette"))).toBeNull();
  });
  it("opens by shortcut and dismisses with Escape", async () => {
    mountNuxt(() =>
      table([
        commandPalette({
          commands: [{ key: "run", label: "Run", onSelect: vi.fn() }],
        }),
      ])
    );
    await settle();
    const cell = find<HTMLElement>(document, 'td[data-column-key="name"]');
    key(cell, "k", { ctrlKey: true });
    await settle();
    const input = find<HTMLInputElement>(document, part("command-input"));
    key(input, "Escape");
    await settle();
    expect(document.querySelector(part("command-palette"))).toBeNull();
  });
});

describe("Nuxt side panel", () => {
  it.each([false, true])(
    "uses the shared controlled tab model with RTL and mobile layout (%s)",
    async (mobile) => {
      const open = shallowRef<string | null>("first");
      const changed = vi.fn((value: string | null) => {
        open.value = value;
      });
      const features = [
        sidePanel({
          open,
          onOpenChange: changed,
          side: "start",
          panels: [
            {
              key: "first",
              label: "First",
              content: () => h("p", "First panel"),
            },
            { key: "second", label: "Second", content: h("p", "Second panel") },
          ],
        }),
      ];
      mountNuxt(() =>
        table(features, {
          forceMobile: mobile,
          dir: "rtl",
          classNames: { sidePanel: "panel-class", sidePanelTab: "tab-class" },
        })
      );
      await settle();
      const panel = find(document, part("side-panel"));
      expect(panel.tagName).toBe("ASIDE");
      expect(panel.classList.contains("panel-class")).toBe(true);
      expect(find(document, part("table-region")).style.flexDirection).toBe(
        mobile ? "column" : "row-reverse"
      );
      const first = find<HTMLButtonElement>(
        panel,
        '[role="tab"][aria-selected="true"]'
      );
      expect(first.classList.contains("tab-class")).toBe(true);
      first.focus();
      key(first, "ArrowLeft");
      await settle();
      expect(changed).toHaveBeenLastCalledWith("second");
      expect(find(panel, part("side-panel-body")).textContent).toBe(
        "Second panel"
      );
      expect(document.activeElement?.textContent).toBe("Second");
      find<HTMLButtonElement>(panel, part("side-panel-close")).click();
      await settle();
      expect(changed).toHaveBeenLastCalledWith(null);
      expect(document.querySelector(part("side-panel"))).toBeNull();
    }
  );
  it("keeps a rejected controlled single panel open and supports body Escape", async () => {
    const changed = vi.fn();
    mountNuxt(() =>
      table([
        sidePanel({
          open: "one",
          onOpenChange: changed,
          panels: [{ key: "one", label: "Only panel", content: "Content" }],
        }),
      ])
    );
    await settle();
    expect(document.querySelector('[role="tablist"]')).toBeNull();
    const body = find(document, part("side-panel-body"));
    key(body, "Escape");
    await settle();
    expect(changed).toHaveBeenCalledExactlyOnceWith(null);
    expect(body.textContent).toBe("Content");
  });
});
