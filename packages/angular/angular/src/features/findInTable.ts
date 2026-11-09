/**
 * Find in table — the Angular feature.
 *
 * The factory sets the option the table reads. The live state is
 * {@link injectFindInTable}, built only by a table that composed this
 * feature. A kit extends the feature with the bar and, optionally, a
 * toolbar button.
 */
import {
  type AdaptTableFeature,
  FEATURE_IMPLEMENTATIONS,
  FIND_IN_TABLE_IMPLEMENTATION,
  withFeatureImplementation,
} from "@adapttable/angular";
import { coreFindInTable } from "@adapttable/core/binding";

/**
 * Add the find bar, opened with Ctrl/Cmd+F with focus anywhere in the table,
 * from a `?find=` link, or from a kit's toolbar control
 * (`findInTable({ button: true })` from a kit subpath).
 *
 * @returns The feature.
 *
 * @public
 */
export function findInTable(): AdaptTableFeature {
  return withFeatureImplementation(
    coreFindInTable(),
    FEATURE_IMPLEMENTATIONS.findInTable,
    FIND_IN_TABLE_IMPLEMENTATION
  );
}
