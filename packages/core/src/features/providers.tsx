/**
 * The React half of feature composition: a feature that owns hooks owns a
 * component that calls them.
 *
 * `TableFeature.apply` can set props, and `setup(host)` can register values,
 * but neither can make a hook disappear. A hook has to be called on every
 * render in the same order, so a table that calls `useRowReorder` only when
 * the feature is present is not a table — it is a crash. That is why the
 * enabling props never bought a byte back: whatever the props said, the import
 * was already in the graph.
 *
 * A component solves it, because mounting and unmounting one is exactly the
 * legal way to add and remove hooks. So a feature may carry a `provider`: a
 * component that wraps the table subtree, calls whatever hooks it needs, and
 * publishes the result under a typed key. The table reads that key. Nothing in
 * the root graph imports the feature, so omitting the import omits the code.
 *
 * The rules this layer keeps:
 *
 * - **Order is canonical, not authored.** Providers nest in feature-id order,
 *   so writing `[grouping(), rowReorder(fn)]` and `[rowReorder(fn), grouping()]`
 *   produce the identical tree. Reordering the array must not remount a
 *   provider and throw away its state.
 * - **One provider per id.** A duplicate id warns in development and the last
 *   one wins, matching how `apply` already resolves duplicates.
 * - **Two tables never see each other.** State travels by context, so it is
 *   scoped to the tree that provided it — including a table nested inside
 *   another table's row detail.
 */
import {
  type ComponentType,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

import { devWarn } from "../utils/devWarn";
import { getAppliedFeatures, type TableFeature } from "./tableFeature";

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
export function featureStateKey<T>(id: string): FeatureStateKey<T> {
  return { id };
}

/**
 * What a feature's provider component receives.
 *
 * @public
 */
export interface FeatureProviderProps {
  /** The table subtree. A provider MUST render this. */
  readonly children: ReactNode;
}

/**
 * A feature's React contribution — the component that owns its hooks.
 *
 * @public
 */
export interface FeatureProviderContribution {
  /**
   * Wraps the table subtree. Free to call hooks, because mounting it is what
   * adds them and unmounting it is what removes them.
   */
  readonly Provider: ComponentType<FeatureProviderProps>;
}

/** A feature that carries one. Structural, so there is no second plugin type. */
type WithProvider<TRow> = TableFeature<TRow> & {
  readonly provider?: FeatureProviderContribution;
};

const FeatureStateContext = createContext<ReadonlyMap<string, unknown>>(
  new Map()
);

/**
 * Publish one feature's state to the table below it.
 *
 * A provider renders this around its children. The map is copied rather than
 * mutated so a reader re-renders when the value it asked for changes, and only
 * then.
 *
 * @public
 */
export function FeatureStateScope<T>({
  stateKey,
  value,
  children,
}: {
  readonly stateKey: FeatureStateKey<T>;
  readonly value: T;
  readonly children: ReactNode;
}): ReactNode {
  const parent = useContext(FeatureStateContext);
  const next = useMemo(() => {
    const map = new Map(parent);
    map.set(stateKey.id, value);
    return map;
  }, [parent, stateKey.id, value]);
  return (
    <FeatureStateContext.Provider value={next}>
      {children}
    </FeatureStateContext.Provider>
  );
}

/**
 * Read what a feature published, or `undefined` when it is not composed.
 *
 * `undefined` is the ordinary answer, not an error: a table without the
 * feature is a table that does not have it, and the caller renders nothing.
 *
 * @public
 */
export function useFeatureState<T>(
  stateKey: FeatureStateKey<T>
): T | undefined {
  return useContext(FeatureStateContext).get(stateKey.id) as T | undefined;
}

/**
 * The providers of one feature list, in canonical order and deduplicated.
 *
 * Sorting by id is what makes the tree independent of the order the host
 * happened to write the array in — the same features always nest the same way,
 * so no provider is remounted because a line moved.
 */
function providersOf<TRow>(
  features: readonly TableFeature<TRow>[]
): readonly { id: string; Provider: ComponentType<FeatureProviderProps> }[] {
  const byId = new Map<string, ComponentType<FeatureProviderProps>>();
  for (const feature of features) {
    const contribution = (feature as WithProvider<TRow>).provider;
    if (!contribution) continue;
    if (byId.has(feature.id)) {
      devWarn(
        `Two features share the id "${feature.id}" and both contribute a ` +
          `provider. The last one wins, as it does for \`apply\`. Give one of ` +
          `them a different id.`
      );
    }
    byId.set(feature.id, contribution.Provider);
  }
  return [...byId]
    .map(([id, Provider]) => ({ id, Provider }))
    .sort((left, right) => (left.id < right.id ? -1 : 1));
}

/**
 * Nest every provider the composed features contribute around the table.
 *
 * `props` is what `useTableFeatures` returned, which is where the applied
 * feature list lives — an adapter has it already and does not need a second
 * accessor for it.
 *
 * @public
 */
export function FeatureProviders({
  props,
  children,
}: {
  readonly props: object;
  readonly children: ReactNode;
}): ReactNode {
  const features = getAppliedFeatures(props);
  const providers = useMemo(() => providersOf(features ?? []), [features]);
  return providers.reduceRight<ReactNode>(
    (inner, { id, Provider }) => <Provider key={id}>{inner}</Provider>,
    children
  );
}
