// @vitest-environment node
import type { FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { FilterHeaderControl } from "../src/header-filters";
interface Row {
  name: string;
}
describe("Element compact direction Node SSR", () => {
  for (const dir of ["rtl", "ltr", undefined] as const) {
    it(`serializes ${dir ?? "inherited"} direction without computed-style access`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const source: FilterFormSource<Row> = {
        extra: { name: ["Ada"] },
        setExtra: vi.fn(),
        setExtras: vi.fn(),
      };
      const app = createSSRApp(() =>
        h(FilterHeaderControl<Row>, {
          dir,
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source,
          labels: resolveLabels(undefined),
        })
      );
      app.provide(ID_INJECTION_KEY, { prefix: 6400, current: 0 });
      app.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      const html = await renderToString(app);
      expect(html).toContain('data-adapttable-part="filter-header-input"');
      expect(html).not.toContain('data-adapttable-part="filter-header-menu"');
      if (dir) expect(html).toContain(`dir="${dir}"`);
      else expect(html).not.toContain("dir=");
      expect(source.setExtra).not.toHaveBeenCalled();
      expect(source.setExtras).not.toHaveBeenCalled();
    });
  }
});
