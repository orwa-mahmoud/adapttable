import "vuetify/styles";
import "../src/styles.css";

import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import SavedViewsFixture from "./SavedViewsFixture.vue";

createApp(SavedViewsFixture)
  .use(createVuetify({ icons: { defaultSet: "mdi", aliases, sets: { mdi } } }))
  .mount("#app");
