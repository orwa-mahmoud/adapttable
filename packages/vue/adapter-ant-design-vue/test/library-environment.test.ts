import { ConfigProvider } from "ant-design-vue";
import { describe, expect, it } from "vitest";
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

// Ant Design Vue keeps the provider's locale, size and direction behind a
// private injection key, so the kit does not read them. These tests pin that
// documented boundary: the table's own props are the way to set all three.
function provider(
  props: { direction?: "ltr" | "rtl"; componentSize?: "small" | "large" },
  extra: Record<string, unknown> = {}
) {
  return h(ConfigProvider, props, { default: () => table(extra) });
}

async function html(vnode: VNode): Promise<string> {
  const app = createSSRApp({ render: () => vnode });
  return renderToString(app);
}

describe("Ant Design Vue library environment", () => {
  it("keeps English labels, the page direction and comfortable density under a provider", async () => {
    const rendered = await html(
      provider({ direction: "rtl", componentSize: "small" })
    );
    expect(rendered).toContain("Rows per page");
    expect(rendered).toContain('data-density="comfortable"');
    expect(rendered).not.toContain('dir="rtl"');
  });

  it("leaves labels and density alone without a provider", async () => {
    const rendered = await html(table());
    expect(rendered).toContain("Rows per page");
    expect(rendered).toContain('data-density="comfortable"');
  });

  it("takes direction, labels and density from the table's own props", async () => {
    const view = mount(() =>
      provider(
        { direction: "ltr", componentSize: "large" },
        { dir: "rtl", labels: { rowsPerPage: "Per page" }, density: "compact" }
      )
    );
    await nextTick();
    const root = node<HTMLElement>(view.root, '[data-adapttable-part="root"]');
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.dataset.density).toBe("compact");
    expect(view.root.textContent).toContain("Per page");
  });
});
