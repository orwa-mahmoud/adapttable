import type { ShowcaseKit } from "./showcaseKit";

/** Only the requested kit and its stylesheets enter this page's runtime graph. */
export const loadVueShowcaseKit = (
  key: string
): Promise<{ kit: ShowcaseKit }> => {
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
    case "headless-ui":
      return import("./kits/headlessUi");
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
