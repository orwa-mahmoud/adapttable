import {
  type ColumnMenuButtonProps,
  type ColumnMenuSlots,
  managedOverlayPanel,
} from "@adapttable/vue/adapter";
import { h } from "vue";
import { VIcon } from "vuetify/components/VIcon";

import VuetifyButton from "../controls/VuetifyButton.vue";
import VuetifyInput from "../controls/VuetifyInput.vue";
import VuetifySelect from "../controls/VuetifySelect.vue";
import VuetifyManagedPopover from "./VuetifyManagedPopover.vue";

const icons = {
  grip: "M7 4h3v3H7zm7 0h3v3h-3zM7 10h3v3H7zm7 0h3v3h-3zM7 16h3v3H7zm7 0h3v3h-3z",
  visible:
    "M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7m0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8",
  hidden:
    "m3 2 19 19-1.4 1.4L1.6 3.4zM12 5c6 0 10 7 10 7l-3 3-2-2 2-1s-3-5-7-5zM2 12l3-3 2 2-2 1s3 5 7 5l2 2c-7 0-12-7-12-7",
  pin: "M7 3h10v2h-1v5l3 3v2h-6v7h-2v-7H5v-2l3-3V5H7z",
  more: "M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4m7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4m7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4",
  rename: "m17 3 4 4-12 12H5v-4zm-10 13v1h1L18 7l-1-1z",
};
function button({ attrs, label, icon }: ColumnMenuButtonProps) {
  return h(VuetifyButton, {
    attrs: { ...attrs, icon: icon ? true : undefined },
    content: icon
      ? h(VIcon, { icon: icons[icon], size: 18, "aria-hidden": true })
      : label,
  });
}
export const columnControls: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: ({ attrs, value, onChange }) =>
    h(VuetifyInput, {
      attrs: {
        ...attrs,
        autofocus:
          attrs.autofocus ??
          attrs["data-adapttable-part"] === "column-menu-search",
      },
      value,
      onChange,
    }),
  Choice: ({ attrs, value, options, onChange }) =>
    h(VuetifySelect, { attrs, value, options, onChange }),
  Panel: managedOverlayPanel((control) =>
    h(VuetifyManagedPopover, { control })
  ),
};
