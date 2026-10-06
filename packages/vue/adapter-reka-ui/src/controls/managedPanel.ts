import { managedOverlayPanel } from "@adapttable/vue/adapter";
import { h } from "vue";

import { RekaSurface } from "./RekaSurface";

/** The binding keeps open/lifetime state; Reka owns the complete overlay layer. */
export const rekaManagedPanel = managedOverlayPanel((control) => {
  const label = control.attrs["aria-label"];
  if (typeof label !== "string")
    throw new Error(
      "AdaptTable: a Reka managed panel requires an accessible string label."
    );
  const part = control.attrs["data-adapttable-part"];
  return h(RekaSurface, {
    open: control.open,
    modal: false,
    label,
    dir: control.attrs.dir === "rtl" ? "rtl" : "ltr",
    anchor: control.anchor,
    container: control.container,
    children: control.content,
    part: typeof part === "string" ? part : undefined,
    contentAttrs: control.attrs,
    isCurrent: control.isCurrent,
    onClose: control.onClose,
  });
});
