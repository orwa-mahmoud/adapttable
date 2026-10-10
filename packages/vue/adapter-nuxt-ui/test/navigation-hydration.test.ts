import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { findInTable } from "../src/find-in-table";
import { selectionStats, statusBar } from "../src/status-bar";

it.each([false, true])(
  "hydrates native navigation controls in place (mobile=%s)",
  async (mobile) => {
    const props = {
      data: [{ id: "ada", name: "Ada" }],
      columns: [{ key: "name", header: "Name" }],
      rowKey: (row: { id: string }) => row.id,
      forceMobile: mobile,
      urlSync: false,
      searchable: false,
      features: [
        cellNavigation(),
        columnSelectionCheckbox(),
        findInTable({ button: true }),
        selectionStats(),
        statusBar(),
      ],
    };
    const create = () =>
      createSSRApp({
        render: () => h(DataTable<{ id: string; name: string }>, props),
      }).use(ui);
    const root = document.createElement("div");
    root.innerHTML = await renderToString(create());
    document.body.append(root);
    const before = [
      ...root.querySelectorAll(
        'button, [data-adapttable-part="status-bar"], [data-row-id]'
      ),
    ];
    const app = create();
    try {
      app.mount(root);
      await nextTick();
      await nextTick();
      for (const target of before) expect(root.contains(target)).toBe(true);
      expect(
        root.querySelectorAll(
          'button, [data-adapttable-part="status-bar"], [data-row-id]'
        )
      ).toHaveLength(before.length + (mobile ? 0 : 1));
      expect(root.querySelector('[role="grid"]') !== null).toBe(!mobile);
      expect(root.querySelector('button[role="checkbox"]') !== null).toBe(
        !mobile
      );
      root
        .querySelector<HTMLButtonElement>(
          '[data-adapttable-part="find-button"]'
        )
        ?.click();
      await nextTick();
      await nextTick();
      const input = root.querySelector<HTMLInputElement>(
        '[data-adapttable-part="find-input"]'
      );
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect(document.activeElement).toBe(input);
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await nextTick();
      await nextTick();
      expect(
        root.querySelector('[data-adapttable-part="find-bar"]')
      ).toBeNull();
    } finally {
      app.unmount();
      root.remove();
    }
  }
);
