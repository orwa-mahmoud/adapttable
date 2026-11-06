import { Quasar } from "quasar";
import langAr from "quasar/lang/ar";
import langSv from "quasar/lang/sv";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";

type InstallOptions = NonNullable<Parameters<typeof Quasar.install>[1]>;
type Lang = NonNullable<InstallOptions["lang"]>;

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

async function html(lang?: Lang, extra?: Record<string, unknown>) {
  const app = createSSRApp({ render: () => table(extra) });
  app.use(Quasar, lang === undefined ? {} : { lang });
  return renderToString(app);
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function mount(lang: Lang | undefined, extra?: Record<string, unknown>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => table(extra) });
  app.use(Quasar, lang === undefined ? {} : { lang });
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}

function rootDir(host: ParentNode): string | null {
  return (
    host.querySelector('[data-adapttable-part="root"]')?.getAttribute("dir") ??
    null
  );
}

describe("Quasar library environment", () => {
  it("follows an Arabic language pack on the server and in the browser", async () => {
    const rendered = await html(langAr);
    expect(rendered).toContain('dir="rtl"');
    expect(rendered).toContain("صفوف لكل صفحة");
    const host = mount(langAr);
    await nextTick();
    expect(host.textContent).toContain("صفوف لكل صفحة");
    expect(rootDir(host)).toBe("rtl");
  });

  it("lets an explicit dir and labels win", async () => {
    const host = mount(langAr, {
      dir: "ltr",
      labels: { rowsPerPage: "Per page" },
    });
    await nextTick();
    expect(rootDir(host)).toBe("ltr");
    expect(host.textContent).toContain("Per page");
    expect(host.textContent).not.toContain("صفوف لكل صفحة");
  });

  it("keeps English labels for Swedish", async () => {
    const rendered = await html(langSv);
    expect(rendered).toContain("Rows per page");
    expect(rendered).not.toContain("صفوف لكل صفحة");
  });

  it("leaves the default English pack unset", async () => {
    const rendered = await html();
    expect(rendered).toContain("Rows per page");
    expect(rendered).toContain('data-density="comfortable"');
  });
});
