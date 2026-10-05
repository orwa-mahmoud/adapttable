import "@adapttable/vue-unstyled/styles.css";

import { createApp } from "vue";

import OperationsWorkspace from "./OperationsWorkspace.vue";
const root = document.getElementById("root");
if (!root)
  throw new Error("The Vue workspace page has no #root to mount into.");
document.documentElement.dataset.framework = "vue";
document.body.classList.add("vue-workspace-page");
createApp(OperationsWorkspace).mount(root);
