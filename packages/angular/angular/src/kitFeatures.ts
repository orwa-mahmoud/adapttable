/**
 * The core feature factories a kit builds its own features on, each carrying
 * the code the table runs for it.
 */
import {
  FEATURE_IMPLEMENTATIONS,
  FIND_IN_TABLE_IMPLEMENTATION,
  injectExportCsv,
  withFeatureImplementation,
} from "@adapttable/angular";
import { type ExportWriter, FILTER_ENGINE_IMPL } from "@adapttable/core";
import {
  coreExportCsv as neutralExportCsv,
  type CoreFeature,
  coreFilters as neutralFilters,
  coreFindInTable as neutralFindInTable,
  coreHeaderFilters as neutralHeaderFilters,
  FILTER_ENGINE,
} from "@adapttable/core/binding";

/**
 * CSV export; a custom `writer` registers on the host.
 *
 * @param options - `true`, or the export's scope, columns, filename and writer.
 * @returns The feature.
 *
 * @public
 */
export function coreExportCsv<TRow>(
  options: boolean | { readonly writer?: ExportWriter } = true
): CoreFeature<TRow> {
  return withFeatureImplementation(
    neutralExportCsv<TRow>(options),
    FEATURE_IMPLEMENTATIONS.exportCsv,
    injectExportCsv
  );
}

/**
 * The filter panel, declarative or a binding's own form.
 *
 * @param defs - The filter definitions.
 * @returns The feature.
 *
 * @public
 */
export function coreFilters<TRow>(defs: unknown): CoreFeature<TRow> {
  return withFeatureImplementation(
    neutralFilters<TRow>(defs),
    FILTER_ENGINE,
    FILTER_ENGINE_IMPL
  );
}

/**
 * A filter control under each column header.
 *
 * @returns The feature.
 *
 * @public
 */
export function coreHeaderFilters(): CoreFeature {
  return withFeatureImplementation(
    neutralHeaderFilters(),
    FILTER_ENGINE,
    FILTER_ENGINE_IMPL
  );
}

/**
 * The find bar.
 *
 * @returns The feature.
 *
 * @public
 */
export function coreFindInTable(): CoreFeature {
  return withFeatureImplementation(
    neutralFindInTable(),
    FEATURE_IMPLEMENTATIONS.findInTable,
    FIND_IN_TABLE_IMPLEMENTATION
  );
}
