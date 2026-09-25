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
  drawnSlotFills,
  type FeatureRender as NeutralFeatureRender,
  type FeatureSlotKey,
  type FeatureStateKey,
  orderedContributions,
  type SlotFill,
  slotFillsOf,
  slotRender as neutralSlotRender,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/core/binding";
import {
  type ComponentType,
  createContext,
  Fragment,
  type ReactNode,
  type RefObject,
  useContext,
  useMemo,
  useRef,
} from "react";

import {
  getAppliedFeatures,
  type StaticTableFeature,
  type TableFeature,
} from "./tableFeature";

export type {
  FeatureSlotKey,
  FeatureStateKey,
  TableRuntime,
  TableRuntimeView,
} from "@adapttable/core/binding";
export { featureSlotKey, featureStateKey } from "@adapttable/core/binding";

/**
 * What a feature's provider component receives.
 *
 * @public
 */
export interface FeatureProviderProps<TRow = unknown> {
  /**
   * The composed feature this provider belongs to, so one stable component can
   * serve every call of a factory.
   *
   * A factory that closed over its options in a component defined inline would
   * mint a new component type on every render, and React would remount it —
   * losing a lifted row mid-drag. The options travel on the feature object
   * instead; the component stays the same one.
   */
  readonly feature: TableFeature<TRow>;
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
 * The order is by feature id, which is what makes the tree independent of the
 * order the host happened to write the array in — the same features always
 * nest the same way, so no provider is remounted because a line moved.
 */
function providersOf<TRow>(features: readonly TableFeature<TRow>[]) {
  return orderedContributions(
    features as readonly TableFeature[],
    (feature) => feature.provider?.Provider,
    "provider"
  );
}

interface RuntimeCell {
  rows: readonly unknown[];
  labels: Readonly<Record<string, unknown>> | undefined;
  view?: TableRuntimeView;
  featureIds: readonly string[];
}

const TableRuntimeContext = createContext<RefObject<RuntimeCell> | undefined>(
  undefined
);

/**
 * Publish what providers above this chrome need to read.
 *
 * The write happens during render and the reads happen in handlers, which is
 * the same shape `useEventCallback` and the selection model already use: never
 * read during render, so there is nothing to tear.
 *
 * @public
 */
export function usePublishTableRuntime<TRow>(
  rows: readonly TRow[],
  labels: Readonly<Record<string, unknown>> | undefined,
  view?: TableRuntimeView<TRow>
): void {
  const cell = useContext(TableRuntimeContext);
  if (cell) {
    cell.current = {
      rows,
      labels,
      view: view as TableRuntimeView,
      featureIds: cell.current.featureIds,
    };
  }
}

/**
 * Read the live table from inside a provider.
 *
 * @public
 */
export function useTableRuntime<TRow = unknown>(): TableRuntime<TRow> {
  const cell = useContext(TableRuntimeContext);
  return useMemo(
    () => ({
      rowAt: (localIndex: number) =>
        cell?.current.rows[localIndex] as TRow | undefined,
      labels: () => cell?.current.labels,
      view: () => cell?.current.view as TableRuntimeView<TRow> | undefined,
      featureIds: () => cell?.current.featureIds ?? [],
    }),
    [cell]
  );
}

/**
 * One feature's answer for one slot: `@adapttable/core`'s `FeatureRender`
 * drawing React nodes.
 *
 * @public
 */
export type FeatureRender<TProps> = NeutralFeatureRender<TProps, ReactNode>;

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
export function slotRender<TProps>(
  slot: FeatureSlotKey<TProps>,
  render: (props: TProps) => ReactNode,
  options: { readonly orderAs?: string } = {}
): FeatureRender<TProps> {
  return neutralSlotRender(slot, render, options);
}

/**
 * Keep a core feature's live renders and append kit chrome.
 *
 * A kit that replaces `renders` drops the hook-owning slot the factory
 * already filled. Concatenate instead.
 *
 * @public
 */
export function extendFeature(
  base: StaticTableFeature,
  renders: readonly FeatureRender<never>[]
): StaticTableFeature;
/**
 * Keep a core feature's live renders and append kit chrome.
 *
 * @public
 */
export function extendFeature<TRow>(
  base: TableFeature<TRow>,
  renders: readonly FeatureRender<never>[]
): TableFeature<TRow>;
/**
 * Keep a core feature's live renders and append kit chrome.
 *
 * @public
 */
export function extendFeature<TRow>(
  base: StaticTableFeature | TableFeature<TRow>,
  renders: readonly FeatureRender<never>[]
): StaticTableFeature | TableFeature<TRow> {
  return {
    ...base,
    renders: [...(base.renders ?? []), ...renders],
  };
}

type RenderMap = ReadonlyMap<string, readonly SlotFill<ReactNode>[]>;

const FeatureRenderContext = createContext<RenderMap>(new Map());

/**
 * Draw whatever features contributed to one slot, or nothing.
 *
 * Nothing is the ordinary answer: a table without the feature has no control
 * there, and the surrounding chrome renders as though the position did not
 * exist.
 *
 * @public
 */
export function FeatureSlot<TProps>({
  slot,
  props,
}: {
  readonly slot: FeatureSlotKey<TProps>;
  readonly props: TProps;
}): ReactNode {
  const filled = useContext(FeatureRenderContext).get(slot.id);
  if (!filled) return null;
  return drawnSlotFills(slot, filled).map(({ id, render }) => (
    <Fragment key={id}>{(render as (p: TProps) => ReactNode)(props)}</Fragment>
  ));
}

/**
 * Whether any feature fills a slot, for chrome that must not draw its wrapper
 * around nothing.
 *
 * @public
 */
export function useFeatureSlotFilled(slot: { readonly id: string }): boolean {
  return useContext(FeatureRenderContext).has(slot.id);
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
  const cell = useRef<RuntimeCell>({
    rows: [],
    labels: undefined,
    view: undefined,
    featureIds: (features ?? []).map((feature) => feature.id),
  });
  cell.current.featureIds = (features ?? []).map((feature) => feature.id);
  const renders = useMemo(() => slotFillsOf(features ?? []), [features]);
  const tree = providers.reduceRight<ReactNode>(
    (inner, { id, contribution: Provider, feature }) => (
      <Provider key={id} feature={feature}>
        {inner}
      </Provider>
    ),
    children
  );
  return (
    <TableRuntimeContext.Provider value={cell}>
      <FeatureRenderContext.Provider value={renders}>
        {tree}
      </FeatureRenderContext.Provider>
    </TableRuntimeContext.Provider>
  );
}
