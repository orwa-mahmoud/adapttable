import type { TableDensity } from "@adapttable/vue";
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, KeepAlive, nextTick, ref } from "vue";
import { renderToString, type SSRContext } from "vue/server-renderer";

import DataTable from "../src/DataTable.vue";
import { densityChooser } from "../src/density";
import { mount, node } from "./mount";
import { installSsrTeleports } from "./ssr-teleports";

const base = {
  data: [{ id: "a" }],
  columns: [{ key: "id" }],
  rowKey: (row: { id: string }) => row.id,
  urlSync: false,
  searchable: false,
};
const part = '[data-adapttable-part="density-toggle"]';
async function tick() {
  await nextTick();
  await nextTick();
}
function radio(root: ParentNode, value: TableDensity) {
  return node<HTMLInputElement>(
    root,
    `${part} input[type="radio"][value="${value}"]`
  );
}

describe("Element two-option density toggle", () => {
  it.each([false, true])(
    "keeps native checked state controlled, with localized visible choices (mobile=%s)",
    async (mobile) => {
      const density = ref<TableDensity>("comfortable");
      const changed = vi.fn();
      const view = mount(() =>
        h(DataTable<{ id: string }>, {
          ...base,
          forceMobile: mobile,
          dir: "rtl",
          density: density.value,
          features: [densityChooser()],
          "onUpdate:density": changed,
          labels: {
            density: "الكثافة",
            densityComfortable: "مريح",
            densityCompact: "مضغوط",
          },
        })
      );
      await tick();
      const group = node<HTMLElement>(view.root, part);
      const comfortable = radio(view.root, "comfortable"),
        compact = radio(view.root, "compact");
      expect(group.getAttribute("dir")).toBe("rtl");
      expect(group.getAttribute("aria-label")).toBe("الكثافة");
      expect(group.querySelectorAll(".el-radio-button")).toHaveLength(2);
      expect(group.textContent).toContain("مريح");
      expect(group.textContent).toContain("مضغوط");
      expect(comfortable.name).toBe(compact.name);
      expect(comfortable.name).not.toBe("");
      expect(comfortable.checked).toBe(true);
      expect(compact.checked).toBe(false);
      compact.focus();
      compact.click();
      await tick();
      expect(changed).toHaveBeenCalledExactlyOnceWith("compact");
      expect(comfortable.checked).toBe(true);
      expect(compact.checked).toBe(false);
      expect(document.activeElement).toBe(compact);
      density.value = "compact";
      await tick();
      expect(comfortable.checked).toBe(false);
      expect(compact.checked).toBe(true);
      expect(radio(view.root, "compact")).toBe(compact);
      expect(document.activeElement).toBe(compact);
      expect(changed).toHaveBeenCalledTimes(1);
      expect(group.querySelector('[role="combobox"]')).toBeNull();
    }
  );
  it("preserves native identity through hydration and retires cached requests", async () => {
    const shown = ref(true),
      changed = vi.fn();
    const features = [densityChooser()];
    const app = () => {
      const created = createSSRApp(() =>
        h(KeepAlive, null, {
          default: () =>
            shown.value
              ? h(DataTable<{ id: string }>, {
                  ...base,
                  key: "table",
                  forceMobile: false,
                  density: "compact",
                  features,
                  "onUpdate:density": changed,
                })
              : h("span"),
        })
      );
      created.provide(ID_INJECTION_KEY, { prefix: 17100, current: 0 });
      created.provide(ZINDEX_INJECTION_KEY, { current: 0 });
      return created;
    };
    const context: SSRContext = {};
    const root = document.createElement("div");
    root.innerHTML = await renderToString(app(), context);
    const cleanup = installSsrTeleports(context);
    document.body.append(root);
    const original = radio(root, "comfortable");
    const client = app();
    try {
      client.mount(root);
      await tick();
      expect(radio(root, "comfortable")).toBe(original);
      shown.value = false;
      await tick();
      original.click();
      await tick();
      expect(changed).not.toHaveBeenCalled();
      shown.value = true;
      await tick();
      expect(radio(root, "comfortable")).toBe(original);
      expect(radio(root, "compact").checked).toBe(true);
      expect(original.checked).toBe(false);
      original.click();
      await tick();
      expect(changed).toHaveBeenCalledExactlyOnceWith("comfortable");
      expect(radio(root, "compact").checked).toBe(true);
      expect(original.checked).toBe(false);
    } finally {
      client.unmount();
      root.remove();
      cleanup();
    }
    original.click();
    await tick();
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
