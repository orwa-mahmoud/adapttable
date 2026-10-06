import "vuetify/styles";
import "../src/styles.css";

import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import ControlsFixture from "./ControlsFixture.vue";
import TableFixture from "./TableFixture.vue";

createApp(
  ["/table", "/navigation", "/hierarchy"].includes(location.pathname)
    ? TableFixture
    : ControlsFixture
)
  .use(createVuetify({ icons: { defaultSet: "mdi", aliases, sets: { mdi } } }))
  .mount("#app");
