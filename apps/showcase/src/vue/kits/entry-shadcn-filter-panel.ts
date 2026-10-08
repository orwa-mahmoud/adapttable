import "@adapttable/shadcn-vue/styles.css";
import "./shadcn-theme.css";

import { createApp } from "vue";

import Fixture from "../../../../../packages/vue/adapter-shadcn-vue/test/browser/filter-panel.fixture";

createApp(Fixture).mount("#root");
