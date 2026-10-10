import "./nuxt-ui.css";

import ui from "@nuxt/ui/vue-plugin";
import { createApp } from "vue";

import Demo from "./NuxtUiShowcase.vue";
document.querySelector("#root")?.classList.add("isolate");

createApp(Demo).use(ui).mount("#root");
