import { createApp } from "vue";

import ActionControlsDemo from "./ActionControlsDemo.vue";
const root = document.getElementById("root");
if (!root) throw new Error("The Vue action showcase has no #root.");
createApp(ActionControlsDemo).mount(root);
