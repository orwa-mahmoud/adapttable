import { afterEach, describe, expect, it } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { dirtyIndicators } from "../editing";
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

  it("adds a feature's rules when the features change", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const features = shallowRef<readonly ReturnType<typeof dirtyIndicators>[]>(
      []
    );
    const app = createApp({
      setup() {
        useDataTableShell(() => ({ ...options, features: features.value }));
        return () => h("div");
      },
    });
    app.mount(host);
    await nextTick();
    const sheet = () =>
      document.getElementById(FORCED_COLORS_STYLE_ID)?.textContent ?? "";
    expect(sheet()).toContain('[aria-invalid="true"]');
    expect(sheet()).not.toContain("[data-dirty],");
    features.value = [dirtyIndicators()];
    await nextTick();
    expect(sheet()).toContain("[data-dirty],");
    app.unmount();
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
