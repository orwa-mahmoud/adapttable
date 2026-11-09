/**
 * Filter-form contracts used by the engine. Widget hooks live on
 * `@adapttable/react`.
 */

import type { FilterValue } from "../contracts/columns";
import type { TableSource } from "../source/TableSource";
import type { TableLabels } from "../types";
import type { FilterDef } from "./filterDefs";
import type { FilterTypeRegistry } from "./filterRegistry";

/**
 * The filter catalog a host publishes for the runtime view.
 *
 * Applied values stay on the query. An incomplete draft is not part of this
 * catalog and is not part of the applied query.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface FilteringContribution<TRow> {
  /** Declarative definitions, the same array the host published. */
  readonly defs?: readonly FilterDef<TRow>[];
  /** The registry those definitions were built against. */
  readonly registry?: FilterTypeRegistry;
}

/**
 * The catalog the runtime projects, or nothing when the host published neither
 * definitions nor a registry.
 *
 * The result holds the host's own references. It is not a copy.
 */
export function filteringContributionOf<TRow>(input: {
  readonly defs: readonly FilterDef<TRow>[] | undefined;
  readonly registry: FilterTypeRegistry | undefined;
}): FilteringContribution<TRow> | undefined {
  if (input.defs === undefined && input.registry === undefined) {
    return undefined;
  }
  return { defs: input.defs, registry: input.registry };
}

/**
 * The slice of the table source the auto-built filter form reads and writes.
 *
 * @public
 */
export type FilterFormSource<TRow> = Pick<
  TableSource<TRow>,
  "extra" | "setExtra" | "setExtras" | "allFilteredRows" | "facets"
>;

/**
 * What the filters panel (tree builder + optional simple fields) needs.
 *
 * The table asks through a feature slot so the kit form stays behind
 * `@adapttable/<kit>/filters` instead of the adapter root.
 *
 * @public
 */
export interface FiltersFormSlotProps<TRow> {
  /** Resolved declarative definitions, in render order. */
  readonly defs: readonly FilterDef<TRow>[];
  /** Source the tree and the simple fields read and write. */
  readonly source: TableSource<TRow>;
  /** Type registry; kits pass it through to both surfaces. */
  readonly registry: FilterTypeRegistry;
  /** Fully resolved labels for every control. */
  readonly labels: Required<TableLabels>;
  /** Open Advanced on first paint. */
  readonly defaultExpanded?: boolean;
  /** When true, also draw the simple AutoFilterForm fields. */
  readonly showSimpleFields: boolean;
}

/**
 * A multi-select value as a list — tolerating a scalar from the URL.
 *
 * @public
 */
export function listFilterValues(value: FilterValue): string[] {
  if (Array.isArray(value)) return [...value];
  return value == null || value === "" ? [] : [String(value)];
}
