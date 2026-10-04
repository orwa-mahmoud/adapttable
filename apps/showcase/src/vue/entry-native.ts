import { createApp } from "vue";

import NativeDemo from "./NativeDemo.vue";
const root = document.getElementById("root");
if (!root) throw new Error("The Vue showcase page has no #root to mount into.");
document.documentElement.dataset.framework = "vue";
createApp(NativeDemo).mount(root);
