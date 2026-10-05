import { createApp } from "vue";

import SpecializedDemo from "./SpecializedDemo.vue";
const root = document.getElementById("root");
if (!root) throw new Error("The Vue showcase page has no #root to mount into.");
document.documentElement.dataset.framework = "vue";
createApp(SpecializedDemo).mount(root);
