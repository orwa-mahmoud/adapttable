// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";
import { fullscreen } from "../src/fullscreen";
import { savedViews, SavedViewsPanel } from "../src/saved-views";

const rows = [{ id: "a", name: "Ada" }];
describe("native view-controls server rendering", () => {
  it("imports and renders request-isolated native controls with no browser globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const render = (density: "comfortable" | "compact", label: string) =>
      renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<(typeof rows)[number]>, {
              data: rows,
              columns: [{ key: "name" }],
              rowKey: (row) => row.id,
              defaultDensity: density,
              labels: { density: label, savedViews: label },
              urlSync: false,
              searchable: false,
              dir: "rtl",
              forceMobile: true,
              features: [
                densityChooser(),
                fullscreen(),
                savedViews({ storageKey: "shared-key", storage: null }),
              ],
            }),
        })
      );
    const [compact, comfortable] = await Promise.all([
      render("compact", "First"),
      render("comfortable", "Second"),
    ]);
    expect(compact).toContain('data-density="compact"');
    expect(comfortable).toContain('data-density="comfortable"');
    expect(compact).toMatch(/<option[^>]*value="compact"[^>]*selected/);
    expect(comfortable).toMatch(/<option[^>]*value="comfortable"[^>]*selected/);
    expect(compact).not.toContain("Second");
    expect(comfortable).not.toContain("First");
    for (const html of [compact, comfortable]) {
      expect(html).toContain('data-adapttable-part="views-button"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain('data-adapttable-part="fullscreen-toggle"');
      expect(html).not.toContain('data-adapttable-part="views-panel"');
      expect(html).toContain('data-adapttable-part="cards"');
      expect(html).toContain('dir="rtl"');
    }
  });
  it("renders read-only management controls disabled and keeps footer inside the native surface", async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(SavedViewsPanel, {
            views: [
              {
                name: "Protected",
                search: "",
                readOnly: true,
                isDefault: true,
              },
            ],
            onApply: () => undefined,
            onRename: () => undefined,
            onMove: () => undefined,
            onSetDefault: () => undefined,
            onRemove: () => undefined,
            className: "management",
            footer: h("small", "Footer"),
          }),
      })
    );
    expect(html).toContain(
      'data-adapttable-part="saved-views-panel" class="management"'
    );
    expect(html.match(/ disabled/g) ?? []).toHaveLength(5);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Protected");
    expect(html).toMatch(
      /<span data-adapttable-part="saved-views-footer"><small>Footer<\/small><\/span><\/section>$/
    );
  });
});
