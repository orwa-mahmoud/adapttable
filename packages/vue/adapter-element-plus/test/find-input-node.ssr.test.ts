// @vitest-environment node
import { ID_INJECTION_KEY } from "element-plus";
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import ElementInput from "../src/controls/ElementInput.vue";
it("does not expose a native input ref on the server", async () => {
  const callback = vi.fn();
  const app = createSSRApp(() =>
    h(ElementInput, {
      value: "Ada",
      inputRef: callback,
      "aria-label": "Name",
    })
  );
  app.provide(ID_INJECTION_KEY, { prefix: 9101, current: 0 });
  expect(await renderToString(app)).toContain('value="Ada"');
  expect(callback).not.toHaveBeenCalled();
});
