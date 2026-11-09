import { afterEach, describe, expect, it } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { useDataTableShell } from "../useDataTableShell";

const FORCED_COLORS_STYLE_ID = "adapttable-forced-colors";

const options = {
  data: [{ id: "1", name: "Ada" }],
  columns: [{ key: "name" }],
  rowKey: (row: { id: string }) => row.id,
  urlSync: false,
};

afterEach(() => {
  document.getElementById(FORCED_COLORS_STYLE_ID)?.remove();
});

describe("mountForcedColorsStyles", () => {
  it("installs the stylesheet once for two mounted tables", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      setup() {
        useDataTableShell(options);
        useDataTableShell(options);
        return () => h("div");
      },
    });
    app.mount(host);
    await nextTick();
    expect(
      document.querySelectorAll(`#${FORCED_COLORS_STYLE_ID}`)
    ).toHaveLength(1);
    app.unmount();
    expect(document.getElementById(FORCED_COLORS_STYLE_ID)).not.toBeNull();
    host.remove();
  });

  it("does not touch document during server rendering", async () => {
    const reads: string[] = [];
    const real = globalThis.document;
    const guarded = new Proxy(real, {
      get(target, prop, receiver) {
        reads.push(String(prop));
        return Reflect.get(target, prop, receiver);
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: guarded,
    });
    try {
      const html = await renderToString(
        createSSRApp(
          defineComponent({
            setup() {
              useDataTableShell(options);
              return () => h("p", "server");
            },
          })
        )
      );
      expect(html).toContain("server");
      expect(reads).toEqual([]);
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: real,
      });
    }
  });
});
