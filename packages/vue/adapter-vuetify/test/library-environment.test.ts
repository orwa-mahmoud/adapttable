import { afterEach, describe, expect, it } from "vitest";
import { createApp, createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify, type VuetifyOptions } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable } from "../src";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];

function plugin(options: VuetifyOptions = {}) {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
    ...options,
  });
}

function table(extra: Record<string, unknown> = {}) {
  return h(DataTable<Row>, {
    data: rows,
    columns: [{ key: "name", header: "Name" }],
    rowKey: (row) => row.id,
    urlSync: false,
    ...extra,
  });
}

async function html(options: VuetifyOptions, extra?: Record<string, unknown>) {
  const app = createSSRApp({ render: () => table(extra) });
  app.use(plugin(options));
  return renderToString(app);
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function mount(options: VuetifyOptions, extra?: Record<string, unknown>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => table(extra) }).use(plugin(options));
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}

describe("Vuetify library environment", () => {
  it("follows an Arabic locale on the server and in the browser", async () => {
    const rendered = await html({ locale: { locale: "ar" } });
    expect(rendered).toContain('dir="rtl"');
    expect(rendered).toContain("صفوف لكل صفحة");
    const host = mount({ locale: { locale: "ar" } });
    await nextTick();
    expect(host.textContent).toContain("صفوف لكل صفحة");
    expect(
      host.querySelector('[data-adapttable-part="root"]')?.getAttribute("dir")
    ).toBe("rtl");
  });

  it("maps zhHans onto the shipped Chinese labels", async () => {
    const rendered = await html({ locale: { locale: "zhHans" } });
    expect(rendered).toContain("每页行数");
  });

  it("lets an explicit dir, labels and density win", async () => {
    const host = mount(
      {
        locale: { locale: "ar" },
        defaults: { global: { density: "compact" } },
      },
      {
        dir: "ltr",
        density: "comfortable",
        labels: { rowsPerPage: "Per page" },
      }
    );
    await nextTick();
    const root = host.querySelector('[data-adapttable-part="root"]');
    expect(root?.getAttribute("dir")).toBe("ltr");
    expect(root?.getAttribute("data-density")).toBe("comfortable");
    expect(host.textContent).toContain("Per page");
    expect(host.textContent).not.toContain("صفوف لكل صفحة");
  });

  it("keeps English labels for Swedish", async () => {
    const rendered = await html({ locale: { locale: "sv" } });
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });

  it("maps global compact density and leaves the English default alone", async () => {
    const compact = await html({
      defaults: { global: { density: "compact" } },
    });
    expect(compact).toContain('data-density="compact"');
    const rendered = await html({});
    expect(rendered).toContain("Rows per page");
    expect(rendered).toContain('data-density="comfortable"');
  });
});
