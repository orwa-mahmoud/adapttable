import {
  ElConfigProvider,
  ID_INJECTION_KEY,
  ZINDEX_INJECTION_KEY,
} from "element-plus";
import ar from "element-plus/es/locale/lang/ar";
import sv from "element-plus/es/locale/lang/sv";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns = [{ key: "name", header: "Name" }];

function table(extra: Record<string, unknown> = {}) {
  return h(DataTable<Row>, {
    data: rows,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    ...extra,
  });
}

function provider(
  props: { locale?: typeof ar; size?: "small" | "default" | "large" },
  extra: Record<string, unknown> = {}
) {
  return h(ElConfigProvider, props, { default: () => table(extra) });
}

async function html(vnode: VNode): Promise<string> {
  const app = createSSRApp({ render: () => vnode });
  app.provide(ID_INJECTION_KEY, { prefix: 4800, current: 0 });
  app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
  return renderToString(app);
}

describe("Element Plus library environment", () => {
  it("follows an Arabic locale: direction on the server, labels once loaded", async () => {
    const rendered = await html(provider({ locale: ar }));
    expect(rendered).toContain("Rows per page");
    const view = mount(() => provider({ locale: ar }));
    await nextTick();
    await vi.waitFor(() => {
      expect(view.root.textContent).toContain("صفوف لكل صفحة");
    });
  });

  it("lets an explicit dir and labels win", async () => {
    const view = mount(() =>
      provider(
        { locale: ar },
        { dir: "ltr", labels: { rowsPerPage: "Per page" } }
      )
    );
    await nextTick();
    const root = node<HTMLElement>(view.root, '[data-adapttable-part="root"]');
    expect(root.getAttribute("dir")).toBe("ltr");
    expect(view.root.textContent).toContain("Per page");
    expect(view.root.textContent).not.toContain("صفوف لكل صفحة");
  });

  it("keeps English labels for a language AdaptTable does not have", async () => {
    const rendered = await html(provider({ locale: sv }));
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });

  it("maps component size onto density, and an explicit density wins", async () => {
    const compact = await html(provider({ size: "small" }));
    expect(compact).toContain('data-density="compact"');
    const view = mount(() =>
      provider({ size: "small" }, { density: "comfortable" })
    );
    await nextTick();
    expect(
      node<HTMLElement>(view.root, '[data-adapttable-part="root"]').dataset
        .density
    ).toBe("comfortable");
  });

  it("leaves labels and density alone without a provider", async () => {
    const rendered = await html(table());
    expect(rendered).toContain("Rows per page");
    expect(rendered).toContain('data-density="comfortable"');
  });
});
