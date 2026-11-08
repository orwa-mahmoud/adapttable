import UApp from "@nuxt/ui/components/App.vue";
import { ar, sv } from "@nuxt/ui/locale";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  props: { locale?: typeof ar; dir?: "ltr" | "rtl" },
  extra: Record<string, unknown> = {}
) {
  return h(UApp, { ...props, toaster: null }, { default: () => table(extra) });
}

async function html(vnode: VNode): Promise<string> {
  const app = createSSRApp({ render: () => vnode });
  app.use(ui);
  return renderToString(app);
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
  app.use(ui);
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}

describe("Nuxt UI library environment", () => {
  it("follows an Arabic locale: direction on the server, labels once loaded", async () => {
    const rendered = await html(provider({ locale: ar }));
    expect(rendered).toContain('dir="rtl"');
    expect(rendered).toContain("Rows per page");
    const host = mount(provider({ locale: ar }));
    await nextTick();
    expect(
      host.querySelector('[data-adapttable-part="root"]')?.getAttribute("dir")
    ).toBe("rtl");
    await vi.waitFor(() => {
      expect(host.textContent).toContain("صفوف لكل صفحة");
    });
  });

  it("follows an explicit direction without a locale pack", async () => {
    const rendered = await html(provider({ dir: "rtl" }));
    expect(rendered).toContain('dir="rtl"');
    expect(rendered).toContain("Rows per page");
  });

  it("lets an explicit dir and labels win", async () => {
    const host = mount(
      provider(
        { locale: ar },
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
    const rendered = await html(provider({ locale: sv }));
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });

  it("leaves direction and labels alone without a locale or direction", async () => {
    const rendered = await html(table());
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });
});
