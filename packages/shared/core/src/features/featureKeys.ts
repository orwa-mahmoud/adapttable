/**
 * The typed handles features and bindings exchange: keys for state a feature
 * publishes, keys for positions a feature draws into, and the rule that
 * orders several features' contributions.
 *
 * Every binding composes features the same way, so the handles and the order
 * are part of the table, not of any one framework. What a slot is filled
 * WITH is the binding's render node — a React node in React — which is why
 * {@link FeatureRender} takes it as a type parameter.
 */
import { devWarn } from "../utils/devWarn";

/**
 * A typed handle for one piece of feature-published state.
 *
 * The id is what the value is stored under; the type parameter is what a
 * reader gets back. Both halves of the exchange are typed, so this is a
 * contract rather than a bag with strings in it.
 *
 * @public
 */
export interface FeatureStateKey<T> {
  /** Stable id, conventionally the feature's own (`"row-reorder"`). */
  readonly id: string;
  /** Phantom marker that pins the published type; never read at runtime. */
  readonly __state?: T;
}

/**
 * Declare a typed key for state a feature publishes.
 *
 * ```ts
 * export const ROW_REORDER = featureStateKey<RowReorderState<unknown>>("row-reorder");
 * ```
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function featureStateKey<T>(id: string): FeatureStateKey<T> {
  return { id };
}

/**
 * A named position in the table that a feature may render into.
 *
 * The table computes the props and asks; the feature that owns that surface
 * answers with its kit's own components. Core never learns what is drawn
 * there, which is what keeps a kit's pixels out of the base graph.
 *
 * @public
 */
export interface FeatureSlotKey<TProps> {
  /** Stable id, conventionally the surface's name (`"status-bar"`). */
  readonly id: string;
  /**
   * Whether this position is ONE element rather than a list.
   *
   * Some surfaces are shared: the status bar hosts both the strip the
   * `statusBar` feature asks for and the figures `selectionStats` produces, and
   * the rule that they must not print twice belongs to that one element. Both
   * features offer the same renderer, and a single slot draws it once.
   */
  readonly single?: boolean;
  /**
   * Phantom marker that pins the props type; never read at runtime.
   *
   * It is a function of `TProps` rather than a `TProps` so the key erases
   * soundly: one feature's `renders` list holds slots of different prop types,
   * and that is only assignable when the parameter position varies the right
   * way round.
   */
  readonly __props?: (value: TProps) => void;
}

/**
 * Declare a typed slot a feature can fill.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function featureSlotKey<TProps>(
  id: string,
  options: { readonly single?: boolean } = {}
): FeatureSlotKey<TProps> {
  return options.single === true ? { id, single: true } : { id };
}

/**
 * One feature's answer for one slot.
 *
 * @typeParam TProps - What the table computes for the slot.
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface FeatureRender<TProps, TNode = unknown> {
  /** The surface being filled. */
  readonly slot: FeatureSlotKey<TProps>;
  /** What to draw, given the props the table computed. */
  readonly render: (props: TProps) => TNode;
  /**
   * Place this entry among the slot's other fills as though it came from the
   * feature with this id. Fills are ordered by feature id, so a control one
   * kit draws from a different feature still lands where every kit puts it.
   */
  readonly orderAs?: string;
}

/**
 * Pair a slot with what to draw in it, keeping the props type at the call site.
 *
 * Authoring the entry through this rather than as a literal is what lets the
 * render callback's argument be inferred, while the stored list erases to one
 * type so a feature can fill slots that take different props. It has no side
 * effects, so a render a table never composes is dropped with its module.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function slotRender<TProps, TNode>(
  slot: FeatureSlotKey<TProps>,
  render: (props: TProps) => TNode,
  options: { readonly orderAs?: string } = {}
): FeatureRender<TProps, TNode> {
  return options.orderAs === undefined
    ? { slot, render }
    : { slot, render, orderAs: options.orderAs };
}

/**
 * One feature's fill of one slot, as a binding draws it.
 *
 * @public
 */
export interface SlotFill<TNode = unknown> {
  /** The id the fill is ordered by: its `orderAs`, else its feature's id. */
  readonly id: string;
  /** What to draw, given the slot's props. */
  readonly render: (props: never) => TNode;
}

/**
 * The fills of one feature list, grouped by slot id in feature-id order.
 *
 * Two features may fill one slot — a toolbar takes several controls — so each
 * slot keeps a list rather than the last writer, ordered the same way
 * contributions are, so the result does not depend on how the array was
 * written.
 *
 * @public
 */
export function slotFillsOf<TNode>(
  features: readonly {
    readonly id: string;
    readonly renders?: readonly FeatureRender<never, TNode>[];
  }[]
): ReadonlyMap<string, readonly SlotFill<TNode>[]> {
  const bySlot = new Map<string, SlotFill<TNode>[]>();
  for (const feature of features) {
    for (const entry of feature.renders ?? []) {
      const list = bySlot.get(entry.slot.id) ?? [];
      list.push({ id: entry.orderAs ?? feature.id, render: entry.render });
      bySlot.set(entry.slot.id, list);
    }
  }
  for (const list of bySlot.values()) {
    list.sort((left, right) => (left.id < right.id ? -1 : 1));
  }
  return bySlot;
}

/**
 * What a slot draws from its fills: the first one for a single slot, every
 * one otherwise.
 *
 * @public
 */
export function drawnSlotFills<TNode>(
  slot: { readonly single?: boolean },
  fills: readonly SlotFill<TNode>[]
): readonly SlotFill<TNode>[] {
  return slot.single === true ? fills.slice(0, 1) : fills;
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
