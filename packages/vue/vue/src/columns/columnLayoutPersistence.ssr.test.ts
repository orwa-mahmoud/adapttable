// @vitest-environment node
import { createMemoryAdapter, type LayoutStorage } from "@adapttable/core";
import { expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, effectScope, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { useColumnLayoutUrlState } from "../url/useColumnLayoutUrlState";
import { useColumnLayoutStorageState } from "./useColumnLayoutStorageState";

it("imports and renders persistence without browser globals or storage access", async () => {
  expect(typeof window).toBe("undefined");
  const backend: LayoutStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const component = defineComponent({
    setup() {
      const url = useColumnLayoutUrlState({
        urlAdapter: createMemoryAdapter("colHide=email"),
      });
      const local = useColumnLayoutStorageState({
        storageKey: "one",
        storage: backend,
        defaultColumnLayout: { hidden: ["team"] },
      });
      return () =>
        h(
          "span",
          `${url.layout.value.hidden.join()} / ${local.layout.value.hidden.join()}`
        );
    },
  });
  expect(await renderToString(createSSRApp(component))).toContain(
    "email / team"
  );
  expect(backend.getItem).not.toHaveBeenCalled();
  const scope = effectScope();
  const local = scope.run(() =>
    useColumnLayoutStorageState({ storageKey: "one" })
  );
  local?.onLayoutChange({
    hidden: ["email"],
    order: [],
    pinned: {},
    widths: {},
  });
  expect(local?.layout.value.hidden).toEqual(["email"]);
  scope.stop();
});
