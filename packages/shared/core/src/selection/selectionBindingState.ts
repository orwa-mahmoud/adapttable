/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { QueryFilterGroup } from "../contracts/query";
import {
  type FilterTreeSnapshot,
  filterTreeSnapshot,
} from "../filters/filterTreeSnapshot";
import { stableKey } from "../utils/stableKey";
import type { HeaderSelectionState } from "./selectionState";

/**
 * The selection a host publishes for the runtime view.
 *
 * `selectedIds` is the host's set. This contribution does not copy it.
 *
 * @public
 */
export interface SelectionContribution {
  /** The set of selected row ids. */
  readonly selectedIds: ReadonlySet<string>;
  /** Whether the selection covers every row matching the current query. */
  readonly allMatching?: boolean;
  /** Observed source reachability; this flag grants no row or operation access. */
  readonly acrossPages?: boolean;
  /** Replace the selection with the given ids, or clear it when omitted. */
  readonly replace: (ids: readonly string[] | undefined) => void;
}

/**
 * The host selection the runtime projects, or nothing when selection is omitted.
 *
 * Optional scope flags that the host left unset stay off the object. The
 * returned set and `replace` are the host's own.
 */
export function selectionContributionOf(
  selection: SelectionContribution | null | undefined
): SelectionContribution | undefined {
  if (!selection) return undefined;
  return {
    selectedIds: selection.selectedIds,
    ...(selection.allMatching === undefined
      ? {}
      : { allMatching: selection.allMatching }),
    ...(selection.acrossPages === undefined
      ? {}
      : { acrossPages: selection.acrossPages }),
    replace: selection.replace,
  };
}

/**
 * Selection state + actions returned by `useSelection`.
 *
 * @public
 */
export interface SelectionState {
  /** The set of selected ids. */
  selectedIds: ReadonlySet<string>;
  /** Number of selected ids. */
  selectedCount: number;
  /** Tri-state for the visible rows (`all` / `some` / `none`). */
  headerState: HeaderSelectionState;
  /** Whether a specific id is selected. */
  isSelected: (id: string) => boolean;
  /** Toggle a single id. */
  toggle: (id: string) => void;
  /**
   * Toggle all leaf ids in a group (select missing, or deselect when all
   * selected) — one commit so memoized rows see a single selection change.
   */
  toggleGroupLeaves: (leafIds: readonly string[]) => void;
  /** Toggle every visible id (select all, or clear all if already full). */
  toggleAll: () => void;
  /** Clear the entire selection. */
  clear: () => void;
  /** Replace the selection with the given ids, or clear it when omitted. */
  replace: (ids: readonly string[] | undefined) => void;
  /** The visible ids, in row order. */
  visibleIds: string[];
  /** True when the user chose "select all matching" across every page. */
  allMatching: boolean;
  /** Extend the selection to every matching row (across all pages). */
  selectAllMatching: () => void;
  /** Whether the source can answer for rows beyond the ones on screen. */
  acrossPages: boolean;
}

/** A stable number per object or function operand, read by identity only. */
const objectIds = /* @__PURE__ */ new WeakMap<object, number>();
/** Symbols that cannot key a weak map in every runtime keep a plain map. */
const symbolIds = /* @__PURE__ */ new Map<symbol, number>();
let nextOpaqueId = 0;

function identityToken(value: object | symbol): string {
  if (typeof value === "symbol") {
    const shared = Symbol.keyFor(value);
    if (shared !== undefined) return `Y${JSON.stringify(shared)}`;
    let id = symbolIds.get(value);
    if (id === undefined) {
      id = nextOpaqueId++;
      symbolIds.set(value, id);
    }
    return `y${id}`;
  }
  let id = objectIds.get(value);
  if (id === undefined) {
    id = nextOpaqueId++;
    objectIds.set(value, id);
  }
  return `o${id}`;
}

function operandToken(value: unknown): string {
  switch (typeof value) {
    case "string":
      return `s${JSON.stringify(value)}`;
    case "number":
      return Object.is(value, -0) ? "d-0" : `d${String(value)}`;
    case "boolean":
      return `b${String(value)}`;
    case "bigint":
      return `n${value.toString()}`;
    case "undefined":
      return "u";
    case "symbol":
      return identityToken(value);
    case "function":
      return identityToken(value);
    default:
      return value === null ? "l" : identityToken(value as object);
  }
}

function snapshotKey(snapshot: FilterTreeSnapshot): unknown[] {
  return [
    snapshot.combinator,
    ...snapshot.conditions.map((node) =>
      node.kind === "group"
        ? snapshotKey(node.group)
        : [
            node.key,
            node.op,
            node.operand.kind === "array"
              ? node.operand.values.map(operandToken)
              : operandToken(node.operand.value),
          ]
    ),
  ];
}

/**
 * The identity of a table's result set for selection: the search, the
 * filter values, the advanced filter tree and the grouping. A selection is
 * kept across page, sort and page-size changes and cleared when this
 * changes, because a different result set can hide a selected row.
 *
 * The filter tree is read through its snapshot: an equivalent tree gives the
 * same key, and an operand that is not a plain value (an object, a class
 * instance, a symbol) counts by identity and is never read or serialized.
 *
 * @param source - The table's current query.
 * @returns A string that changes exactly when the result set does.
 *
 * @public
 */
export function selectionResetKey(source: {
  readonly search: string;
  readonly extra: unknown;
  readonly filterTree?: QueryFilterGroup;
  readonly groupBy?: unknown;
}): string {
  const tree = source.filterTree
    ? JSON.stringify(snapshotKey(filterTreeSnapshot(source.filterTree)))
    : "";
  return `${stableKey([source.search, source.extra, source.groupBy])}|${tree}`;
}
