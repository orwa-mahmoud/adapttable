import "./nuxt-ui.css";

import ui from "@nuxt/ui/vue-plugin";
import { createApp } from "vue";

import Fixture from "./NuxtWorkspaceShowcase.vue";

document.querySelector("#root")?.classList.add("isolate");
createApp(Fixture).use(ui).mount("#root");
