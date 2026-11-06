import { ConfigProvider } from "reka-ui";
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
  props: { dir?: "ltr" | "rtl"; locale?: string },
  extra: Record<string, unknown> = {}
) {
  return h(ConfigProvider, props, { default: () => table(extra) });
}

async function html(vnode: VNode): Promise<string> {
  return renderToString(createSSRApp({ render: () => vnode }));
}

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});

function mount(vnode: VNode): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => vnode });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}

describe("Reka UI library environment", () => {
  it("follows an Arabic right-to-left provider on the server and in the browser", async () => {
    const rendered = await html(provider({ dir: "rtl", locale: "ar" }));
    expect(rendered).toContain('dir="rtl"');
    expect(rendered).toContain("صفوف لكل صفحة");
    const host = mount(provider({ dir: "rtl", locale: "ar" }));
    await nextTick();
    expect(
      host.querySelector('[data-adapttable-part="root"]')?.getAttribute("dir")
    ).toBe("rtl");
    expect(host.textContent).toContain("صفوف لكل صفحة");
  });

  it("lets an explicit dir and labels win", async () => {
    const host = mount(
      provider(
        { dir: "rtl", locale: "ar" },
        { dir: "ltr", labels: { rowsPerPage: "Per page" } }
      )
    );
    await nextTick();
    expect(
      host.querySelector('[data-adapttable-part="root"]')?.getAttribute("dir")
    ).toBe("ltr");
    expect(host.textContent).toContain("Per page");
    expect(host.textContent).not.toContain("صفوف لكل صفحة");
  });

  it("keeps English labels for a language AdaptTable does not have", async () => {
    const rendered = await html(provider({ dir: "rtl", locale: "sv" }));
    expect(rendered).toContain('dir="rtl"');
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });

  it("leaves direction and labels alone without a provider", async () => {
    const rendered = await html(table());
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });
});
