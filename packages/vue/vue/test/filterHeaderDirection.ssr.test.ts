// @vitest-environment node
import { type FilterFormSource, resolveLabels } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import type { FilterHeaderControlOptions } from "../src/filters/filterHeaderControl";
import { FilterHeaderRowChrome } from "../src/filters/filterHeaderRow";

interface Row {
  name: string;
}
describe("compact header direction SSR", () => {
  for (const dir of ["rtl", "ltr", undefined] as const) {
    it(`preserves ${dir ?? "omitted"} direction without browser reads or writes`, async () => {
      expect(typeof window).toBe("undefined");
      expect(typeof document).toBe("undefined");
      const source: FilterFormSource<Row> = {
        extra: { name: "Ada" },
        setExtra: vi.fn(),
        setExtras: vi.fn(),
      };
      const control = vi.fn((props: FilterHeaderControlOptions<Row>) =>
        h("span", { dir: props.dir }, "Ada")
      );
      const html = await renderToString(
        createSSRApp(() =>
          h("table", [
            h("thead", [
              FilterHeaderRowChrome<Row>({
                columns: [{ key: "name" }],
                defs: [{ key: "name", type: "text" }],
                source,
                labels: resolveLabels({}),
                dir,
                controls: { Control: control },
              }),
            ]),
          ])
        )
      );
      expect(control).toHaveBeenCalledOnce();
      expect(control.mock.calls[0]?.[0].dir).toBe(dir);
      if (dir === undefined) expect(html).not.toContain("dir=");
      else {
        expect(html).toContain(`dir="${dir}"`);
        expect(html).toContain(`<span dir="${dir}">Ada</span>`);
      }
      expect(source.setExtra).not.toHaveBeenCalled();
      expect(source.setExtras).not.toHaveBeenCalled();
    });
  }
});
