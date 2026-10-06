import "vuetify/styles";
import "../src/styles.css";

import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import ControlsFixture from "./ControlsFixture.vue";
import TableFixture from "./TableFixture.vue";

createApp(location.pathname === "/table" ? TableFixture : ControlsFixture)
  .use(createVuetify({ icons: { defaultSet: "mdi", aliases, sets: { mdi } } }))
  .mount("#app");
