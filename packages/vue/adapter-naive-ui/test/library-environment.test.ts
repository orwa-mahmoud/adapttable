import { arDZ, NConfigProvider, svSE, unstableButtonRtl } from "naive-ui";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, createSSRApp, h, nextTick, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];

function table(extra: Record<string, unknown> = {}) {
  return h(DataTable<Row>, {
    data: rows,
    columns: [{ key: "name", header: "Name" }],
    rowKey: (row) => row.id,
    urlSync: false,
    ...extra,
  });
}

function provider(
  props: Record<string, unknown>,
  extra?: Record<string, unknown>
): VNode {
  return h(NConfigProvider, props, { default: () => table(extra) });
}

async function html(vnode: VNode): Promise<string> {
  return renderToString(createSSRApp({ render: () => vnode }));
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function mount(vnode: VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => vnode });
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}

const rtl = { locale: arDZ, rtl: [unstableButtonRtl] };

describe("Naive UI library environment", () => {
  it("follows provider RTL and an Arabic locale on the server and in the browser", async () => {
    const rendered = await html(provider(rtl));
    expect(rendered).toContain('dir="rtl"');
    expect(rendered).toContain("صفوف لكل صفحة");
    const host = mount(provider(rtl));
    await nextTick();
    expect(host.textContent).toContain("صفوف لكل صفحة");
    expect(
      host.querySelector('[data-adapttable-part="root"]')?.getAttribute("dir")
    ).toBe("rtl");
  });

  it("lets an explicit dir and labels win", async () => {
    const host = mount(
      provider(rtl, { dir: "ltr", labels: { rowsPerPage: "Per page" } })
    );
    await nextTick();
    const root = host.querySelector('[data-adapttable-part="root"]');
    expect(root?.getAttribute("dir")).toBe("ltr");
    expect(host.textContent).toContain("Per page");
    expect(host.textContent).not.toContain("صفوف لكل صفحة");
  });

  it("keeps English labels for Swedish", async () => {
    const rendered = await html(provider({ locale: svSE }));
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });

  it("maps DataTable size onto density, and an explicit density wins", async () => {
    const compact = await html(
      provider({ componentOptions: { DataTable: { size: "small" } } })
    );
    expect(compact).toContain('data-density="compact"');
    const host = mount(
      provider(
        { componentOptions: { DataTable: { size: "small" } } },
        { density: "comfortable" }
      )
    );
    await nextTick();
    expect(
      host
        .querySelector('[data-adapttable-part="root"]')
        ?.getAttribute("data-density")
    ).toBe("comfortable");
  });

  it("leaves labels and density alone without a provider", async () => {
    const rendered = await html(table());
    expect(rendered).toContain("Rows per page");
    expect(rendered).toContain('data-density="comfortable"');
  });
});
