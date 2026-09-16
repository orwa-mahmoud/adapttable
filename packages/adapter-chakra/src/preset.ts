/**
 * The standard preset — `@adapttable/chakra/preset`.
 *
 * One import for the table most people want: every feature that is useful
 * with no configuration at all, drawn with Chakra's own components. It is
 * assembled from the same public feature entries a caller would import by
 * hand, so nothing here is reachable only through the preset, and appending
 * or replacing an entry needs no escape hatch — the result is an ordinary
 * array.
 *
 * A feature that cannot work without input is NOT in the zero-argument list.
 * Grouping with no key, bulk actions with no actions and saved views with no
 * options are inert, and shipping an inert implementation is the cost this
 * whole architecture exists to avoid. Pass the option and the feature joins.
 *
 * Selection statistics is callable bare but still excluded: it needs a cell
 * range, which needs `cellNavigation`, while arming a row-selection column on
 * its own. Import it directly when you want it.
 *
 * Because this entry statically imports everything it can compose, its own
 * bundle contains the optional members whether or not you pass their options.
 * That is the trade the preset makes: one import instead of a list. A caller
 * counting every byte imports the individual features instead — see
 * `docs/features.md` for the measured difference.
 */
import { createAdapterStandardFeatures } from "@adapttable/react/adapter";
export type { StandardFeatureOptions } from "@adapttable/react/adapter";

import { bulkActions } from "./bulk-actions";
import { columnMenu } from "./column-menu";
import { densityChooser } from "./density";
import { exportCsv } from "./export";
import { filters } from "./filters";
import { findInTable } from "./find-in-table";
import { fitColumns } from "./fit-columns";
import { fullscreen } from "./fullscreen";
import { grouping } from "./grouping";
import { headerFilters } from "./header-filters";
import { multiSort } from "./multi-sort";
import { resizableColumns } from "./resizable-columns";
import { savedViews } from "./saved-views";
import { statusBar } from "./status-bar";

/** The features a good table has by default. @public */
export const standardFeatures = createAdapterStandardFeatures({
  columnMenu,
  densityChooser,
  exportCsv,
  findInTable,
  fitColumns,
  fullscreen,
  headerFilters,
  multiSort,
  resizableColumns,
  statusBar,
  grouping,
  bulkActions,
  filters,
  savedViews,
});
