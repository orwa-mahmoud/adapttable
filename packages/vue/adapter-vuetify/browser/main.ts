import "vuetify/styles";
import "../src/styles.css";

import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import ControlsFixture from "./ControlsFixture.vue";
import FilterSurfaceFixture from "./FilterSurfaceFixture.vue";
import TableFixture from "./TableFixture.vue";

const filterSurface = location.pathname.startsWith("/filter-surface");
const tableFixture = [
  "/table",
  "/density",
  "/columns",
  "/filters",
  "/filters-drawer",
  "/navigation",
  "/hierarchy",
  "/editing",
  "/row-editing",
  "/batch-editing",
].includes(location.pathname);
const tableOrControls = tableFixture ? TableFixture : ControlsFixture;
createApp(filterSurface ? FilterSurfaceFixture : tableOrControls)
  .use(createVuetify({ icons: { defaultSet: "mdi", aliases, sets: { mdi } } }))
  .mount("#app");
