import { managedOverlayPanel } from "@adapttable/vue/adapter";
import { h } from "vue";

import { HeadlessSurface } from "./HeadlessSurface";

/** The binding keeps open/lifetime state; Headless owns the complete overlay layer. */
export const headlessManagedPanel = managedOverlayPanel((control) => {
  const label = control.attrs["aria-label"];
  if (typeof label !== "string")
    throw new Error(
      "AdaptTable: a Headless managed panel requires an accessible string label."
    );
  const part = control.attrs["data-adapttable-part"];
  return h(HeadlessSurface, {
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
