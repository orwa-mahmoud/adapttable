/**
 * The typed handles features and bindings exchange: keys for state a feature
 * publishes, and keys for positions a feature draws into.
 *
 * Every binding composes features the same way, so the handles are part of
 * the table, not of any one framework. What a slot is filled WITH is the
 * binding's render node — a React node in React — which is why
 * {@link FeatureRender} takes it as a type parameter. Contribution order
 * lives in {@link orderedContributions}; this module imports no
 * implementation.
 */

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
 * A slot whose props carry types each table supplies: its row type, or a
 * binding's own state.
 *
 * One fill draws the slot for every table, so it is written once for any of
 * them: `TDraw` is that fill's type, a function generic over those types
 * (`<TRow>(props: SomeSlotProps<TRow>) => Node`). A table asks with its own
 * props, and a fill written for one row type does not fit.
 *
 * @typeParam TDraw - The fill's draw function, generic over the row.
 *
 * @public
 */
export interface RowSlotKey<TDraw> extends FeatureSlotKey<never> {
  /**
   * Phantom marker that pins the fill's type; never read at runtime. It is
   * required, so a plain slot key is never taken for a row slot key.
   */
  readonly __draw: TDraw | undefined;
}

/**
 * A slot key whose props do not depend on the row: what tells a plain slot
 * from a {@link RowSlotKey} when a fill or an ask is typed.
 *
 * @public
 */
export type PlainSlotKey<TProps> = FeatureSlotKey<TProps> & {
  readonly __draw?: undefined;
};

/**
 * Declare a slot whose props carry the table's row type.
 *
 * @param id - The slot's id; a binding reuses core's id for the same position.
 * @param options - Whether the position is one element rather than a list.
 * @returns The key.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function rowSlotKey<TDraw>(
  id: string,
  options: { readonly single?: boolean } = {}
): RowSlotKey<TDraw> {
  // The draw marker is phantom: the key is its id and flag, like every slot key.
  return featureSlotKey<never>(id, options) as RowSlotKey<TDraw>;
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
  slot: PlainSlotKey<TProps>,
  render: (props: TProps) => TNode,
  options?: { readonly orderAs?: string }
): FeatureRender<TProps, TNode>;
export function slotRender<TDraw extends (props: never) => unknown>(
  slot: RowSlotKey<TDraw>,
  render: NoInfer<TDraw>,
  options?: { readonly orderAs?: string }
): FeatureRender<never, ReturnType<TDraw>>;
export function slotRender(
  slot: FeatureSlotKey<never>,
  render: (props: never) => unknown,
  options: { readonly orderAs?: string } = {}
): FeatureRender<never> {
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
 * The fills of one feature list, grouped by slot id: by feature rank, then
 * in feature-id order.
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
    readonly rank?: number;
    readonly renders?: readonly FeatureRender<never, TNode>[];
  }[]
): ReadonlyMap<string, readonly SlotFill<TNode>[]> {
  const bySlot = new Map<string, (SlotFill<TNode> & { rank: number })[]>();
  for (const feature of features) {
    for (const entry of feature.renders ?? []) {
      const list = bySlot.get(entry.slot.id) ?? [];
      list.push({
        id: entry.orderAs ?? feature.id,
        rank: feature.rank ?? 0,
        render: entry.render,
      });
      bySlot.set(entry.slot.id, list);
    }
  }
  const fills = new Map<string, readonly SlotFill<TNode>[]>();
  for (const [slot, list] of bySlot) {
    list.sort(
      (left, right) => left.rank - right.rank || (left.id < right.id ? -1 : 1)
    );
    fills.set(
      slot,
      list.map(({ id, render }) => ({ id, render }))
    );
  }
  return fills;
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

export {
  type OrderedContribution,
  orderedContributions,
} from "./featureContribution";
