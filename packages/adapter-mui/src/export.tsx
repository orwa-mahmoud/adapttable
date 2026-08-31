import {
  extendFeature,
  slotRender,
  type TableFeature,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/adapter";
import {
  exportCsv as core,
  type ExportCsvOptions,
} from "@adapttable/core/features";

import { ExportCsvButton } from "./components/toolbarExtras";

/**
 * CSV export of the current view, with MUI's own toolbar button.
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
