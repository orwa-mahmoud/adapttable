import { afterEach, expect, it, vi } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
import { rowDetail } from "../src/row-detail";

interface Row {
  id: string;
  name: string;
}
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));

it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])(
  "preserves the row and focused detail trigger across repeated toggles (mobile=%s, hydrate=%s)",
  async (forceMobile, hydrate) => {
    const row: Row = { id: "a", name: "Ada" };
    const renderDetail = vi.fn((value: Row) =>
      h("aside", `Details ${value.name}`)
    );
    const options: DataTableProps<Row> = {
      data: [row],
      columns: [{ key: "name" }],
      rowKey: (value) => value.id,
      urlSync: false,
      searchable: false,
      forceMobile,
      features: [rowDetail<Row>(renderDetail)],
    };
    const Table = defineComponent({
      setup: () => () => h(DataTable<Row>, options),
    });
    const root = document.createElement("div");
    document.body.append(root);
    if (hydrate) root.innerHTML = await renderToString(createSSRApp(Table));
    const serverTrigger = root.querySelector(
      '[data-adapttable-part="expand-button"]'
    );
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const app = hydrate ? createSSRApp(Table) : createApp(Table);
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
      warn.mockRestore();
      error.mockRestore();
    });
    await nextTick();
    const trigger = root.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="expand-button"]'
    );
    if (!trigger) throw new Error("Missing detail trigger");
    const nativeRow = trigger.closest(forceMobile ? "article" : "tr");
    if (!nativeRow) throw new Error("Missing native row");
    if (hydrate) expect(trigger).toBe(serverTrigger);
    trigger.focus();
    for (let index = 0; index < 3; index += 1) {
      trigger.click();
      await nextTick();
      expect(root.textContent).toContain("Details Ada");
      expect(renderDetail.mock.calls.at(-1)?.[0]).toBe(row);
      expect(trigger.isConnected).toBe(true);
      expect(trigger.closest(forceMobile ? "article" : "tr")).toBe(nativeRow);
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await nextTick();
      expect(root.textContent).not.toContain("Details Ada");
      expect(trigger.isConnected).toBe(true);
      expect(trigger.closest(forceMobile ? "article" : "tr")).toBe(nativeRow);
      expect(document.activeElement).toBe(trigger);
    }
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  }
);
