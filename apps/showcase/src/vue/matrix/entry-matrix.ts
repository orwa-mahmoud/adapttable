/**
 * The one entry every Vue kit's matrix page boots — the Vue counterpart of
 * `src/entry-matrix.tsx` and `src/angular/entry-matrix.ts`.
 *
 * Which page this is comes from `#root`'s `data-matrix-page`, written into the
 * served HTML by `scripts/build-showcase-html.mjs` as the page's path under the
 * Vue demo root, so the dev server (`/vue/unstyled/filtering/`) and the
 * published site (`/vue/demo/unstyled/filtering/`) boot the same file.
 */
import "../../styles.css";
import "../../angular/matrixPage.css";
import "./matrixPage.css";

import { createApp, h } from "vue";

import { resolveMatrixRoute } from "../../matrix/content";
import { SHOWCASE_PRESENTATION } from "./data";
import MatrixPage from "./MatrixPage.vue";
import { SHOWCASE_KIT, type ShowcaseKit } from "./showcaseKit";

document.documentElement.dataset.framework = "vue";

const container = document.getElementById("root");
if (!container) throw new Error("the showcase page has no #root to mount into");

/** The framework this entry serves: the kits whose matrix pages boot it. */
const FRAMEWORK = "vue";

const id = container.dataset.matrixPage ?? "";
const route = resolveMatrixRoute(id, FRAMEWORK);
if (!route) {
  // The page's static copy stays on screen rather than being replaced by a
  // blank root, and the fault is reported instead of being swallowed.
  throw new Error(
    `the matrix does not build a ${FRAMEWORK} page called "${id}"`
  );
}

/** Only the requested kit and its stylesheets enter this page's runtime graph. */
const loadKit = (key: string): Promise<{ kit: ShowcaseKit }> => {
  switch (key) {
    case "vue-unstyled":
      return import("./kits/unstyled");
    case "element-plus":
      return import("./kits/elementPlus");
    case "vuetify":
      return import("./kits/vuetify");
    case "naive-ui":
      return import("./kits/naiveUi");
    case "reka-ui":
      return import("./kits/rekaUi");
    case "shadcn-vue":
      return import("./kits/shadcnVue");
    case "nuxt-ui":
      return import("./kits/nuxtUi");
    case "quasar":
      return import("./kits/quasar");
    default:
      throw new Error(`No Vue showcase kit for "${key}"`);
  }
};
const { kit } = await loadKit(route.adapter.key);

const dark = (() => {
  try {
    return window.localStorage.getItem("adapttable-demo-theme") === "dark";
  } catch {
    // Storage can be unavailable (private mode): the page opens light.
    return false;
  }
})();

const app = createApp({ render: () => h(MatrixPage, { route }) });
app.provide(SHOWCASE_KIT, kit);
kit.install?.(app, {
  dark,
  dir: SHOWCASE_PRESENTATION.dir,
  locale: SHOWCASE_PRESENTATION.locale,
});
container.replaceChildren();
app.mount(container);
