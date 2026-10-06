import type { Attrs } from "@adapttable/vue";
import { toVueAttrs } from "@adapttable/vue/adapter";

import { withoutAttrs } from "./attrs";

/** Nuxt UI 4.11.3 has no public ref for UCheckbox's inner checkbox button. */
export function nuxtCheckboxAttrs(attrs: Attrs): Attrs {
  if (attrs.ref != null)
    throw new Error(
      "AdaptTable: Nuxt UI UCheckbox does not expose its native checkbox element. A checkbox attrs.ref is unsupported."
    );
  return toVueAttrs(withoutAttrs(attrs, ["ref"]));
}
