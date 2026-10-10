import type { ColumnDef, ComposedFeature } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import { DataTable } from "../src";
import { batchEditing, editing, rowEditing } from "../src/editing";

interface Row {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
}
const row: Row = { id: "a", name: "Ada", active: true, tags: ["a"] };
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
function mount(
  features: readonly ComposedFeature<Row>[],
  column: ColumnDef<Row> = { key: "name", editable: true }
) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: [row],
        columns: [column],
        rowKey: (item) => item.id,
        urlSync: false,
        forceMobile: false,
        features,
        classNames: {
          editCellEditor: "consumer-editor",
          editCellActivate: "consumer-activate",
        },
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function find<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
function supportScrolling() {
  const scroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = () => undefined;
  stops.push(() => {
    HTMLElement.prototype.scrollIntoView = scroll;
  });
}
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await nextTick();
}
function key(target: HTMLElement, value: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
}
async function begin(host: HTMLElement) {
  const activate = find<HTMLButtonElement>(host, part("edit-cell-activate"));
  activate.focus();
  key(activate, "F2");
  await flush();
  return find<HTMLElement>(host, part("edit-cell-editor"));
}
async function write(host: ParentNode, value: string) {
  const input = find<HTMLInputElement>(host, part("edit-cell-editor"));
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  return input;
}

describe("Reka editing feature fills", () => {
  it("uses the shared cell controller to focus, commit and restore the native activation target", async () => {
    const commit = vi.fn();
    const host = mount([editing<Row>(commit)]);
    const input = await begin(host);
    expect(document.activeElement).toBe(input);
    expect(input.tagName).toBe("INPUT");
    expect(input.classList.contains("consumer-editor")).toBe(true);
    await write(host, "Grace");
    key(input, "Enter");
    await flush();
    expect(commit).toHaveBeenCalledExactlyOnceWith(row, "name", "Grace");
    expect(row.name).toBe("Ada");
    expect(document.activeElement).toBe(find(host, part("edit-cell-activate")));
  });

  it("cancels a text draft on Escape without calling the host", async () => {
    const commit = vi.fn();
    const host = mount([editing<Row>(commit)]);
    await begin(host);
    const input = await write(host, "Discard");
    key(input, "Escape");
    await flush();
    expect(commit).not.toHaveBeenCalled();
    expect(find(host, part("edit-cell-activate")).textContent).toBe("Ada");
    expect(document.activeElement).toBe(find(host, part("edit-cell-activate")));
  });

  it("uses a real CheckboxRoot for boolean drafts and commits a boolean once", async () => {
    const commit = vi.fn();
    const host = mount([editing<Row>(commit)], {
      key: "active",
      editable: true,
      editor: "boolean",
    });
    const checkbox = await begin(host);
    expect(checkbox.getAttribute("role")).toBe("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    checkbox.click();
    await flush();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    key(checkbox, "Enter");
    await flush();
    expect(commit).toHaveBeenCalledExactlyOnceWith(row, "active", false);
  });

  it("keeps a single-choice draft active while the real Select portal opens and closes", async () => {
    supportScrolling();
    const commit = vi.fn();
    const host = mount([editing<Row>(commit)], {
      key: "name",
      editable: true,
      editor: { type: "select", options: ["Ada", "Grace"] },
    });
    const trigger = await begin(host);
    expect(trigger.getAttribute("role")).toBe("combobox");
    key(trigger, "ArrowDown");
    await flush();
    const listbox = find<HTMLElement>(document, '[role="listbox"]');
    expect(host.contains(listbox)).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    const grace = [
      ...listbox.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((option) => option.textContent?.includes("Grace"));
    if (!grace) throw new Error("Missing Grace option");
    grace.focus();
    key(grace, "Enter");
    await flush();
    expect(commit).not.toHaveBeenCalled();
    expect(trigger.textContent).toContain("Grace");
    expect(document.activeElement).toBe(trigger);
    key(trigger, "Enter");
    await flush();
    expect(commit).toHaveBeenCalledExactlyOnceWith(row, "name", "Grace");
  });

  it("uses a multiple Listbox without committing when focus moves inside it", async () => {
    supportScrolling();
    const commit = vi.fn();
    const host = mount([editing<Row>(commit)], {
      key: "tags",
      editable: true,
      editor: { type: "multi-select", options: ["a", "b"] },
    });
    const list = await begin(host);
    expect(list.getAttribute("role")).toBe("listbox");
    expect(list.getAttribute("aria-multiselectable")).toBe("true");
    const option = find<HTMLElement>(list, '[role="option"]:last-child');
    option.click();
    await flush();
    expect(commit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(option);
    key(option, "Enter");
    await flush();
    expect(commit).toHaveBeenCalledExactlyOnceWith(row, "tags", ["a", "b"]);
  });

  it("keeps row and batch writes behind their explicit real kit buttons", async () => {
    const saveRow = vi.fn();
    const rowHost = mount([rowEditing<Row>(saveRow)]);
    find<HTMLElement>(rowHost, part("row-edit-begin")).click();
    await flush();
    await write(rowHost, "Grace");
    expect(saveRow).not.toHaveBeenCalled();
    find<HTMLElement>(rowHost, part("row-edit-save")).click();
    await flush();
    expect(saveRow).toHaveBeenCalledExactlyOnceWith(row, { name: "Grace" });
    const saveBatch = vi.fn();
    const batchHost = mount([batchEditing<Row>(saveBatch)]);
    expect(find(batchHost, part("edit-cell-editor"))).toBeInstanceOf(
      HTMLInputElement
    );
    const input = await write(batchHost, "Bea");
    key(input, "Enter");
    await flush();
    expect(saveBatch).not.toHaveBeenCalled();
    const save = find<HTMLButtonElement>(batchHost, part("batch-edit-save"));
    expect(save.classList.contains("at-reka-button")).toBe(true);
    save.click();
    await flush();
    expect(saveBatch).toHaveBeenCalledExactlyOnceWith([
      { row, rowId: "a", patch: { name: "Bea" } },
    ]);
  });
});
