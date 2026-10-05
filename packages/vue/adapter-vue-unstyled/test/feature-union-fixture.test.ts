import { describe, expect, it } from "vitest";
import { h } from "vue";

import FeatureUnionDemo from "../../../../apps/showcase/src/vue/feature-union/FeatureUnionDemo.vue";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

describe("actual combined Vue showcase fixture", () => {
  // Coverage instrumentation adds work to this full showcase mount.
  it("mounts the real native controls and captures source-page export without host writes", async () => {
    const { host } = mountNative(() => h(FeatureUnionDemo));
    await tick();
    const root = find(host, '[data-demo-table="feature-union"]');
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.querySelector('[data-column-key="secret"]')).toBeNull();
    expect(find(host, "#union-source-version").textContent).toBe("1");
    expect(find(host, "#union-edit-count").textContent).toBe("0");
    expect(find(host, "#union-move-count").textContent).toBe("0");
    const scope = find<HTMLSelectElement>(host, "fieldset select");
    await write(scope, "page", "change");
    find(root, part("export-csv-button")).click();
    await tick();
    expect(
      JSON.parse(find(host, "#union-export").textContent ?? "null")
    ).toEqual({
      scope: "page",
      rowIds: ["source", "destination"],
      columnKeys: [
        "name",
        ...Array.from({ length: 24 }, (_, index) => `metric-${index}`),
        "tail",
      ],
    });
    expect(find(host, "#union-export-count").textContent).toBe("1");
    expect(find(host, "#union-selected").textContent).toBe("[]");
    find(host, "#union-toggle").click();
    await tick();
    expect(host.querySelector('[data-demo-table="feature-union"]')).toBeNull();
    find(host, "#union-toggle").click();
    await tick();
    expect(
      find(host, '[data-demo-table="feature-union"]').getAttribute("dir")
    ).toBe("rtl");
    expect(find(host, "#union-edit-count").textContent).toBe("0");
    expect(find(host, "#union-move-count").textContent).toBe("0");
  }, 10_000);
});
