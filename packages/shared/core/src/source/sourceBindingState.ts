/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { FilterRuntime } from "../filters/filterDefs";
import type { TableSource } from "./TableSource";

/**
 * A controlled, debounced search input bound to a committed value.
 *
 * @public
 */
export interface SearchInputState {
  /** The live (uncommitted) input value. */
  value: string;
  /** Update the live input value. */
  setValue: (next: string) => void;
}

/**
 * Result of `useTableData`.
 *
 * @public
 */
export interface UseTableDataResult<TRow> {
  /** The resolved source, whichever tier provided it. */
  source: TableSource<TRow>;
  /** The merged declarative-filter runtime (defs, chips, URL keys, predicate). */
  runtime: FilterRuntime<TRow>;
}
