import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  PRINT_CONTROL,
  PrintChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import { print as bindingPrint } from "@adapttable/vue/features";

import { quasarActionButton } from "./actions/button";

export function print(
  onPrint: () => void,
  printButton = false
): StaticTableFeature {
  return extendFeature(bindingPrint(onPrint, printButton), [
    slotRender(PRINT_CONTROL, (props) =>
      PrintChrome({ ...props, slots: { Button: quasarActionButton } })
    ),
  ]);
}
