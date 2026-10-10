import type { DataTableClassNames as SharedClassNames } from "@adapttable/vue/adapter";

import type { DataTableClassNames } from "./types";

/** Fail explicitly rather than accepting an unreachable vendor mask hook. */
export function naiveClassNames(
  names: SharedClassNames = {}
): DataTableClassNames {
  const { filtersBackdrop, ...supported } = names;
  if (filtersBackdrop !== undefined)
    throw new Error(
      "AdaptTable Naive UI: filtersBackdrop is unsupported because NDrawer keeps its mask internal."
    );
  return supported;
}
