import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  print as bindingPrint,
  PRINT_CONTROL,
  PrintChrome,
} from "@adapttable/vue/print";
import { h } from "vue";

import { nativeActionButton } from "./actions/nativeControls";
export function print(onPrint: () => void, printButton = false) {
  return extendFeature(bindingPrint(onPrint, printButton), [
    slotRender(PRINT_CONTROL, (props) =>
      h(PrintChrome, { ...props, slots: { Button: nativeActionButton } })
    ),
  ]);
}
export type * from "@adapttable/vue/print";
