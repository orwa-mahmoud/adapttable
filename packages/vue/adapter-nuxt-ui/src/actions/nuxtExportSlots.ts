import "./nuxtExport.css";

import type { DataTableClassNames, ExportSlots } from "@adapttable/vue/adapter";
import UIcon from "@nuxt/ui/components/Icon.vue";
import { h } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtExportProgress from "./NuxtExportProgress.vue";

export function nuxtExportSlots(names: DataTableClassNames = {}): ExportSlots {
  return {
    Button: ({ attrs, label, icon }) =>
      h(NuxtButton, { attrs }, () => [
        attrs["aria-busy"] === true
          ? h(UIcon, {
              name: "i-lucide-loader-circle",
              "data-adapttable-part": "export-spinner",
              "aria-hidden": true,
              class: ["adapttable-nuxt-export-spinner", names.exportSpinner],
            })
          : icon,
        label,
      ]),
    Surface: (control) => h(NuxtExportProgress, { control, names }),
  };
}
