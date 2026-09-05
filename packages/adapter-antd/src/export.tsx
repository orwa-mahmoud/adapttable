import {
  extendFeature,
  slotRender,
  type TableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/react/adapter";
import {
  exportCsv as core,
  type ExportCsvOptions,
} from "@adapttable/react/features";

import { ExportCsvButton } from "./components/toolbarExtras";

// The options type travels with the factory, as it does on every other kit.
export type { ExportCsvOptions };

/**
 * CSV export of the current view, with antd's own toolbar button.
 *
 * @public
 */
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  return extendFeature(core(options), [
    slotRender(TOOLBAR_EXTRAS, (props) => <ExportCsvButton {...props} />),
  ]);
}
