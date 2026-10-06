/**
 * Print — `@adapttable/ng-bootstrap/print`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { TOOLBAR_EXTRAS } from "@adapttable/angular/adapter";
import { print as bindingPrint } from "@adapttable/angular/features";
import { AdaptPrintButton } from "@adapttable/ng-bootstrap";

/**
 * A print action, with this kit's toolbar button when `printButton` is set.
 *
 * @param onPrint - Runs the print.
 * @param printButton - Draw a toolbar button for it. Off by default, so the
 *   action stays a command-palette entry until a host asks for the button.
 * @returns The feature.
 *
 * @public
 */
export function print(
  onPrint: () => void,
  printButton = false
): AdaptTableFeature {
  return extendFeature(bindingPrint(onPrint, printButton), [
    slotRender(TOOLBAR_EXTRAS, () => AdaptPrintButton, { orderAs: "print" }),
  ]);
}
