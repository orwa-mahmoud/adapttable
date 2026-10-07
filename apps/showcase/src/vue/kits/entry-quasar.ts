import "quasar/dist/quasar.rtl.css";

import { Quasar } from "quasar";
import ar from "quasar/lang/ar";
import en from "quasar/lang/en-US";
import { createApp } from "vue";

import { initialKitAppearance } from "./initial-appearance";
import Demo from "./QuasarShowcase.vue";

createApp(Demo)
  .use(Quasar, {
    config: { dark: initialKitAppearance().dark },
    lang: initialKitAppearance().rtl ? ar : en,
  })
  .mount("#root");
