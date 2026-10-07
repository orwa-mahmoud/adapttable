import {
  type ColumnMenuButtonProps,
  type ColumnMenuSlots,
  managedOverlayPanel,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarInput from "../controls/QuasarInput.vue";
import QuasarColumnChoice from "./QuasarColumnChoice.vue";
import { QuasarColumnPanel } from "./QuasarColumnPanel";

const icons = {
  grip: "M9 4h2v2H9zm4 0h2v2h-2zM9 9h2v2H9zm4 0h2v2h-2zM9 14h2v2H9zm4 0h2v2h-2zM9 19h2v2H9zm4 0h2v2h-2z",
  visible:
    "M12 5C7 5 3 8 1 12c2 4 6 7 11 7s9-3 11-7C21 8 17 5 12 5zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  hidden:
    "M3 2 2 3l4 4C4 8 2 10 1 12c2 4 6 7 11 7 2 0 4-.5 5.5-1.5L21 21l1-1L3 2zm9 3c5 0 9 3 11 7-.8 1.7-2 3.2-3.5 4.3L16 12.8A4 4 0 0 0 11.2 8L8.6 5.4C9.7 5.1 10.8 5 12 5z",
  pin: "M8 2h8v2h-1v6l3 3v2h-5v7h-2v-7H6v-2l3-3V4H8z",
  more: "M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  rename: "m3 17 4 4 14-14-4-4L3 17zm-1 1v4h4z",
};
const button = ({ attrs, label, icon }: ColumnMenuButtonProps) =>
  h(QuasarButton, {
    attrs: icon
      ? {
          ...attrs,
          icon: icons[icon],
          "aria-label": attrs["aria-label"] ?? label,
        }
      : attrs,
    label: icon ? undefined : label,
  });

export const quasarColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: (control) =>
    h(QuasarInput, {
      control: {
        ...control,
        label:
          typeof control.attrs["aria-label"] === "string"
            ? control.attrs["aria-label"]
            : "",
        type: control.attrs.type === "search" ? "search" : "text",
        attrs: {
          ...control.attrs,
          autofocus:
            control.attrs["data-adapttable-part"] === "column-menu-search" ||
            undefined,
        },
      },
    }),
  Choice: (control) => h(QuasarColumnChoice, { control }),
  Panel: managedOverlayPanel((control) => h(QuasarColumnPanel, { control })),
};
