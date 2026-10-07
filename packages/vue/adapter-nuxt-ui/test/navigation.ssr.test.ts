// @vitest-environment node
import type { UrlStateAdapter } from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { findInTable } from "../src/find-in-table";
import { selectionStats, statusBar } from "../src/status-bar";
import { virtualize } from "../src/virtualize";

it.each([false, true])(
  "server-renders isolated navigation/status with no browser globals (mobile=%s)",
  async (mobile) => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const changed = vi.fn();
    const writes = vi.fn();
    const urlAdapter: UrlStateAdapter = {
      getSearch: () => "find=Ada",
      setSearch: writes,
      subscribe: () => () => undefined,
    };
    const app = createSSRApp({
      render: () =>
        h(DataTable<{ id: string; name: string }>, {
          data: [{ id: "ada", name: "Ada" }],
          columns: [{ key: "name", header: "Name" }],
          rowKey: (row) => row.id,
          dir: "rtl",
          forceMobile: mobile,
          urlAdapter,
          features: [
            cellNavigation({ onRangeChange: changed }),
            columnSelectionCheckbox(),
            findInTable({ button: true }),
            selectionStats(),
            statusBar(),
            virtualize(false),
          ],
        }),
    }).use(ui);
    const html = await renderToString(app);
    expect(html).toContain('data-adapttable-part="find-bar"');
    expect(html).toContain('data-adapttable-part="find-input"');
    expect(html).toContain('type="search"');
    expect(html).toContain('value="Ada"');
    expect(html).toContain("data-cell-match-current");
    expect(html).toContain('data-adapttable-part="status-item"');
    expect(html.match(/data-adapttable-part="status-bar"/g)).toHaveLength(1);
    // Navigation attaches browser focus handlers after hydration.
    expect(html).not.toContain('role="grid"');
    expect(html).not.toContain('role="checkbox"');
    expect(changed).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
  }
);
