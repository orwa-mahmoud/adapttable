import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  PRINT_CONTROL,
  PrintChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import { print as bindingPrint } from "@adapttable/vue/features";
import { h } from "vue";

import { shadcnActionButton } from "./actions/controls";

export function print(
  onPrint: () => void,
  printButton = false
): StaticTableFeature {
  return extendFeature(bindingPrint(onPrint, printButton), [
    slotRender(PRINT_CONTROL, (props) =>
      h(PrintChrome, {
        ...props,
        slots: {
          Button: ({ attrs, label, icon }) =>
            shadcnActionButton(attrs, [icon, label]),
        },
      })
    ),
  ]);
}
