import { readFileSync, writeFileSync } from "node:fs";

import { Quasar } from "quasar";
import { expect, it, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { exportFixture } from "./exportFixture";

it.each([false, true])(
  "renders the three native export formats without starting work mobile=%s",
  async (mobile) => {
    expect(typeof document).toBe("undefined");
    const request = vi.fn();
    const app = createSSRApp({ render: () => exportFixture(mobile, request) });
    const context = { req: { headers: {} } };
    Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
    const html = await renderToString(app, context);
    expect(
      html.match(/data-adapttable-part="export-csv-button"/g)
    ).toHaveLength(3);
    for (const format of ["CSV", "PDF", "XLSX"])
      expect(html).toContain(`Export ${format}`);
    expect(html).not.toContain(
      'data-adapttable-part="export-progress-surface"'
    );
    expect(request).not.toHaveBeenCalled();
    const path = `${import.meta.dirname}/server-export-${mobile ? "mobile" : "desktop"}.html`;
    if (process.env.ADAPTTABLE_UPDATE_SSR_FIXTURE === "1")
      writeFileSync(path, html);
    expect(html).toBe(readFileSync(path, "utf8"));
  }
);
