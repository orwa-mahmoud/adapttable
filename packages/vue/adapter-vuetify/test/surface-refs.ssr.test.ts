// @vitest-environment node
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify";
import { VCard } from "vuetify/components/VCard";

import { VuetifySurface } from "../src/table/VuetifySurface";

it("renders a real Vuetify surface on the server without a native target", async () => {
  const callback = vi.fn();
  const app = createSSRApp({
    render: () =>
      h(VuetifySurface, {
        component: VCard,
        attrs: {
          tag: "article",
          ref: callback,
          "data-adapttable-part": "card",
        },
      }),
  }).use(createVuetify({ ssr: true }));
  const html = await renderToString(app);
  expect(html).toContain("<article");
  expect(html).toContain("v-card");
  expect(html).toContain('data-adapttable-part="card"');
  expect(callback).not.toHaveBeenCalled();
});
