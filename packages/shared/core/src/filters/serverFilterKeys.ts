/**
 * The filter keys a server source needs before its first request: which URL
 * values parse as lists and as numbers, and which filters a server counts.
 */
import type { ColumnMetadata } from "../contracts/columns";
import { defaultFilterRegistry } from "./filterBuiltins";
import {
  checklistFilterKeys,
  type FilterDef,
  filterUrlKeys,
  resolveFilterDefs,
} from "./filterDefs";
import { type FilterTypeSpec, withFilterType } from "./filterRegistry";

/**
 * What {@link serverFilterKeys} reads: the same filter declarations the table
 * is given.
 *
 * @public
 */
export interface ServerFilterKeysInput<TRow> {
  /** The table's columns; their `filter` shorthands declare filters. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** The table's own filter definitions. */
  readonly filters?: readonly FilterDef<TRow>[];
  /** Extra or replacement filter types the table is given. */
  readonly filterTypes?: readonly FilterTypeSpec[];
  /** The active locale, for columns with `i18n` paths. */
  readonly locale?: string;
}

/**
 * The filter keys a server source parses and asks with.
 *
 * @public
 */
export interface ServerFilterKeys {
  /** Filter keys whose URL values parse as comma-separated lists. */
  readonly arrayExtraKeys: readonly string[];
  /** Filter keys whose URL values parse as numbers. */
  readonly numberExtraKeys: readonly string[];
  /** Filter keys a server counts distinct values for: every checklist. */
  readonly facetKeys: readonly string[];
}

/**
 * Derive a server source's filter keys from the table's filter declarations,
 * so a range, multi-value or checklist filter restored from the URL reaches
 * the first request typed.
 *
 * @param input - The columns, filters and filter types the table is given.
 * @returns The options to spread into a server source.
 *
 * @public
 */
export function serverFilterKeys<TRow>(
  input: ServerFilterKeysInput<TRow>
): ServerFilterKeys {
  const registry = (input.filterTypes ?? []).reduce(
    (registry, spec) => withFilterType(registry, spec),
    defaultFilterRegistry
  );
  const defs = resolveFilterDefs(input.columns, input.filters, input.locale);
  return {
    ...filterUrlKeys(defs, registry),
    facetKeys: checklistFilterKeys(defs, registry),
  };
}
