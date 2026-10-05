import { corePrint } from "@adapttable/core/binding";
import { watchEffect } from "vue";

import { PRINT_CONTROL, PRINT_MODEL } from "./actions/contracts";
import { featureActivity } from "./actions/lifecycle";
import type {
  FeatureMountContext,
  StaticTableFeature,
} from "./features/tableFeature";
function mountPrint<TRow>(context: FeatureMountContext<TRow>): void {
  const active = featureActivity(context);
  watchEffect(() => {
    context.state.set(
      PRINT_MODEL,
      context.options.value.printButton === true
        ? () => {
            if (active()) (context.options.value.onPrint as () => void)();
          }
        : undefined
    );
  });
}
export function print(
  onPrint: () => void,
  printButton = false
): StaticTableFeature {
  return {
    ...corePrint(onPrint, printButton),
    mount: mountPrint,
    requiredSlots: printButton ? [PRINT_CONTROL] : [],
  };
}
export { PRINT_CONTROL, PRINT_MODEL } from "./actions/contracts";
export type {
  ActionButtonSlots,
  PrintChromeProps,
} from "./actions/simpleChrome";
export { PrintChrome } from "./actions/simpleChrome";
export type * from "./index";
export type { PrintLayoutOptions } from "@adapttable/core/pdf";
export {
  buildPrintDocument,
  buildPrintTableHtml,
  printStyles,
  printTable,
} from "@adapttable/core/pdf";
