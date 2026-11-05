/**
 * Subscribe, revision and operation tokens.
 *
 * Neutral session vocabulary. The engine forwards these names and keeps
 * candidate staging next to the incremental view.
 */
import type { ExtraFilters, SortDirection } from "./columns";

/**
 * Revision axes AI and bindings subscribe to. Unrelated React renders
 * must not increment these.
 *
 * @public
 */
export interface TableRevisions {
  /** Row identities or cell values changed. */
  readonly data: number;
  /** Sort, filter, page, group, expand, pin, search. */
  readonly view: number;
  /** Column set, types, or operation metadata. */
  readonly schema: number;
  /**
   * Permissions, source capabilities, or wired operations. The engine never
   * infers these; a host that changes them bumps this with
   * `invalidate(["policy"])`.
   */
  readonly policy: number;
}

/**
 * One revision axis.
 *
 * @public
 */
export type TableRevisionAxis = keyof TableRevisions;

/**
 * View and policy operations. Row writes stay on host callbacks.
 *
 * @public
 */
export type TableOperation =
  | {
      readonly type: "setSort";
      readonly key?: string;
      readonly dir?: SortDirection;
    }
  | { readonly type: "setSearch"; readonly search: string }
  | { readonly type: "setPage"; readonly page: number }
  | { readonly type: "setLimit"; readonly limit: number }
  | { readonly type: "setFilters"; readonly filters: ExtraFilters }
  | { readonly type: "setGroupBy"; readonly key?: string }
  | { readonly type: "setSelection"; readonly ids?: readonly string[] };

/**
 * Named row window.
 *
 * @public
 */
export type TableRowScope = "visible" | "page" | "full";
