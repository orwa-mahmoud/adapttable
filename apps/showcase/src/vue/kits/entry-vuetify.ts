import "vuetify/styles";

import { createApp } from "vue";
import { createVuetify } from "vuetify/framework";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { initialKitAppearance } from "./initial-appearance";
import Demo from "./VuetifyShowcase.vue";

createApp(Demo)
  .use(
    createVuetify({
      theme: { defaultTheme: initialKitAppearance().dark ? "dark" : "light" },
      icons: { defaultSet: "mdi", aliases, sets: { mdi } },
    })
  )
  .mount("#root");
