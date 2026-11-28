// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import AntdInput from "../src/controls/AntdInput.vue";
it("does not expose a native input ref on the server", async () => {
  const callback = vi.fn();
  const app = createSSRApp(() =>
    h(AntdInput, {
      value: "Ada",
      inputRef: callback,
      "aria-label": "Name",
    })
  );
  expect(await renderToString(app)).toContain('value="Ada"');
  expect(callback).not.toHaveBeenCalled();
});
