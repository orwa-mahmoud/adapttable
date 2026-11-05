/**
 * Typed domain contributions.
 *
 * Grouping and editing have their own contracts. Other domains stay named in
 * {@link REMAINING_FEATURE_OWNERSHIP} until their own items replace the
 * compatibility fields on the runtime view. Nothing here is constructed from
 * a registry, and grouping's entry type is imported as a type only.
 */
import type { GroupedFlatEntry } from "../grouping/groupRows";
import { devWarn } from "../utils/devWarn";

/**
 * Grouping's owned view state.
 *
 * A binding may keep extra fields on the same object. Core reads `entries`
 * and, when the binding published them, `groupBy`, without casting.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface GroupingContribution<TRow> {
  /** Group headers and leaves in render order. */
  readonly entries: readonly GroupedFlatEntry<TRow>[];
  /**
   * The grouping keys, when the binding publishes them on this bundle.
   * Absent when the keys live only on `groupingState`.
   */
  readonly groupBy?: readonly string[];
}

/**
 * Editing's owned channels.
 *
 * `onCellEdit` is the host write. `stageCell` is the batch path when batch
 * editing is composed. The table does not write the row itself.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface EditingContribution<TRow> {
  /** The host callback. A write goes through the host, not the table. */
  readonly onCellEdit?: (
    row: TRow,
    key: string,
    nextValue: unknown
  ) => unknown;
  /**
   * Stage one cell while a batch is open. Absent when batch editing is not
   * composed.
   */
  readonly stageCell?: (
    row: TRow,
    rowId: string,
    columnKey: string,
    value: string
  ) => void;
}

/**
 * Domains whose runtime fields are still compatibility projections.
 *
 * The value is the field that still owns the data. Nothing is imported or
 * constructed from this map.
 *
 * @public
 */
export const REMAINING_FEATURE_OWNERSHIP = {
  tree: "tableRuntime.tree",
  selection: "tableRuntime.selection",
  pinning: "tableRuntime.pinning",
  columnLayout: "tableRuntime.columnLayout",
  detail: "tableRuntime.detail",
  rowPinning: "tableRuntime.rowPinning",
  query: "tableRuntime.query",
} as const;

/**
 * A domain that has not moved onto a typed contribution yet.
 *
 * @public
 */
export type RemainingFeatureDomain = keyof typeof REMAINING_FEATURE_OWNERSHIP;

/**
 * Project owned grouping onto the runtime view.
 *
 * A defined host contribution wins. Otherwise the feature contribution is
 * used. Either argument is returned as itself: this is not a copy and not
 * a registry.
 *
 * @public
 */
export function projectGroupingContribution<TRow>(input: {
  readonly host: GroupingContribution<TRow> | undefined;
  readonly feature: GroupingContribution<TRow> | undefined;
}): GroupingContribution<TRow> | undefined {
  return input.host ?? input.feature;
}

/**
 * Later feature contributions win.
 *
 * An undefined entry is skipped, so a feature that contributes nothing does
 * not erase an earlier one.
 *
 * @public
 */
export function mergeGroupingContributions<TRow>(
  contributions: readonly (GroupingContribution<TRow> | undefined)[]
): GroupingContribution<TRow> | undefined {
  let current: GroupingContribution<TRow> | undefined;
  for (const contribution of contributions) {
    if (contribution !== undefined) current = contribution;
  }
  return current;
}

/**
 * One feature's contribution of some kind, keyed by the feature's id.
 *
 * @public
 */
export interface OrderedContribution<TFeature, TContribution> {
  /** The contributing feature's id. */
  readonly id: string;
  /** What the feature contributed. */
  readonly contribution: TContribution;
  /** The feature itself, so one stable handler can serve every call of a factory. */
  readonly feature: TFeature;
}

/**
 * The contributions a feature list makes, in canonical order and deduplicated.
 *
 * Order is by feature id, not by array position, so writing
 * `[grouping(), rowReorder(fn)]` and `[rowReorder(fn), grouping()]` produces
 * the same sequence — reordering the array must not remount anything and
 * throw its state away. Two features sharing an id warn in development and
 * the last one wins, matching how `apply` resolves duplicates.
 *
 * @param features - The composed features.
 * @param pick - The contribution one feature makes, or `undefined` for none.
 * @param kind - What is being contributed, for the duplicate warning.
 *
 * @public
 */
export function orderedContributions<
  TFeature extends { readonly id: string },
  TContribution,
>(
  features: readonly TFeature[],
  pick: (feature: TFeature) => TContribution | undefined,
  kind: string
): readonly OrderedContribution<TFeature, TContribution>[] {
  const byId = new Map<string, OrderedContribution<TFeature, TContribution>>();
  for (const feature of features) {
    const contribution = pick(feature);
    if (contribution === undefined) continue;
    if (byId.has(feature.id)) {
      devWarn(
        `Two features share the id "${feature.id}" and both contribute a ` +
          `${kind}. The last one wins, as it does for \`apply\`. Give one of ` +
          `them a different id.`
      );
    }
    byId.set(feature.id, { id: feature.id, contribution, feature });
  }
  return [...byId.values()].sort((left, right) =>
    left.id < right.id ? -1 : 1
  );
}
