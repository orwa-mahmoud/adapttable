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
  ensureForcedColorsStyles,
  type FeatureRender as NeutralFeatureRender,
  type FeatureSlotKey,
  type LiveStage,
  liveStagesOf,
  orderedContributions,
  type PlainSlotKey,
  type RowSlotKey,
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
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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

export { FeatureStateScope, useFeatureState } from "./featureState";

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
  reader: TableRuntimeReader<unknown>;
  featureIds: readonly string[];
}

/**
 * What a chrome hands the providers above it: readers they call from
 * handlers, so the rendered rows and the view are built only when read.
 *
 * @public
 */
export interface TableRuntimeReader<TRow> {
  /** The rows in rendered order. */
  rows(): readonly TRow[];
  /** The table's resolved labels. */
  labels(): Readonly<Record<string, unknown>> | undefined;
  /** The latest fully composed view, when the chrome composes one. */
  view?(): TableRuntimeView<TRow> | undefined;
}

/** What providers read before the chrome first publishes. */
const NO_RUNTIME: TableRuntimeReader<unknown> = {
  rows: () => [],
  labels: () => undefined,
};

const TableRuntimeContext = createContext<RefObject<RuntimeCell> | undefined>(
  undefined
);

/** This render's reader from the publisher above, and its layer's slot. */
interface RuntimeLayer {
  readonly base: TableRuntimeReader<unknown>;
  readonly layered: { current: TableRuntimeReader<unknown> | null };
}

const RuntimeLayerContext = createContext<RuntimeLayer | undefined>(undefined);

/** The ids of the features this render composed. */
const FeatureIdsContext = createContext<readonly string[]>([]);

function commitReader(
  cell: RefObject<RuntimeCell> | undefined,
  reader: TableRuntimeReader<unknown>,
  featureIds: readonly string[]
): void {
  if (cell) cell.current = { reader, featureIds };
}

/**
 * Publish the table's reader for the providers above it, and hand this
 * render's reader to a layer below ({@link usePublishTableRuntime}) that
 * builds on it.
 *
 * Providers read the reader from handlers. It is committed in a layout
 * effect, after the layers below have registered, so a handler always reads
 * the last committed table: a render React discards publishes nothing.
 *
 * @public
 */
export function PublishTableRuntime<TRow>({
  reader,
  children,
}: {
  readonly reader: TableRuntimeReader<TRow>;
  readonly children: ReactNode;
}): ReactNode {
  "use no memo";
  const cell = useContext(TableRuntimeContext);
  const featureIds = useContext(FeatureIdsContext);
  const [layered] = useState<RuntimeLayer["layered"]>(() => ({
    current: null,
  }));
  const base = reader as TableRuntimeReader<unknown>;
  // The deepest commit of this table, so providers syncing in their own
  // layout effects already read this render's reader and feature ids.
  useLayoutEffect(() => {
    commitReader(cell, layered.current ?? base, featureIds);
  });
  const layer = useMemo(() => ({ base, layered }), [base, layered]);
  return (
    <RuntimeLayerContext.Provider value={layer}>
      {children}
    </RuntimeLayerContext.Provider>
  );
}

/**
 * Publish a reader for the providers above this chrome: as the layer over a
 * {@link PublishTableRuntime} above it, or on its own when there is none.
 * Committed in a layout effect, so a render React discards publishes
 * nothing.
 *
 * @public
 */
export function usePublishTableRuntime<TRow>(
  reader: TableRuntimeReader<TRow>
): void {
  const cell = useContext(TableRuntimeContext);
  const layer = useContext(RuntimeLayerContext);
  const featureIds = useContext(FeatureIdsContext);
  const published = reader as TableRuntimeReader<unknown>;
  useLayoutEffect(() => {
    if (!layer) {
      commitReader(cell, published, featureIds);
      return undefined;
    }
    layer.layered.current = published;
    return () => {
      if (layer.layered.current === published) layer.layered.current = null;
    };
  });
}

/**
 * The reader this render's publisher built, for a layer that builds on it
 * during render; the last committed one when there is no publisher above.
 *
 * @returns The current reader.
 */
export function useCurrentTableRuntimeReader<TRow>(): TableRuntimeReader<TRow> {
  const cell = useContext(TableRuntimeContext);
  const layer = useContext(RuntimeLayerContext);
  return (layer?.base ??
    cell?.current.reader ??
    NO_RUNTIME) as TableRuntimeReader<TRow>;
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
        cell?.current.reader.rows()[localIndex] as TRow | undefined,
      labels: () => cell?.current.reader.labels(),
      view: () =>
        cell?.current.reader.view?.() as TableRuntimeView<TRow> | undefined,
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
export function slotRender<TProps>(
  slot: PlainSlotKey<TProps>,
  render: (props: TProps) => ReactNode,
  options?: { readonly orderAs?: string }
): FeatureRender<TProps>;
/**
 * Fill a slot whose props carry the row type: the fill is one function
 * generic over the row.
 *
 * @public
 */
export function slotRender<TDraw extends (props: never) => ReactNode>(
  slot: RowSlotKey<TDraw>,
  render: NoInfer<TDraw>,
  options?: { readonly orderAs?: string }
): FeatureRender<never>;
/* @__NO_SIDE_EFFECTS__ */
export function slotRender(
  slot: FeatureSlotKey<never>,
  render: (props: never) => ReactNode,
  options: { readonly orderAs?: string } = {}
): FeatureRender<never> {
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
 * Draw whatever features contributed to one slot, or `fallback`.
 *
 * Nothing is the ordinary answer: a table without the feature has no control
 * there, and the surrounding chrome renders as though the position did not
 * exist. A position the table draws either way — a cell's content, which a
 * feature may replace — passes what it draws without one as `fallback`.
 *
 * @public
 */
export function FeatureSlot<TProps>(props: {
  readonly slot: PlainSlotKey<TProps>;
  readonly props: TProps;
  readonly fallback?: ReactNode;
}): ReactNode;
/**
 * Draw every fill of a row-typed slot with this table's props.
 *
 * @public
 */
export function FeatureSlot<TProps>(props: {
  readonly slot: RowSlotKey<(props: NoInfer<TProps>) => ReactNode>;
  readonly props: TProps;
  readonly fallback?: ReactNode;
}): ReactNode;
export function FeatureSlot({
  slot,
  props,
  fallback = null,
}: {
  readonly slot: FeatureSlotKey<never>;
  readonly props: unknown;
  readonly fallback?: ReactNode;
}): ReactNode {
  const filled = useContext(FeatureRenderContext).get(slot.id);
  const node: ReactNode = filled
    ? drawnSlotFills(slot, filled).map(({ id, render }) => (
        <Fragment key={id}>
          {(render as (p: unknown) => ReactNode)(props)}
        </Fragment>
      ))
    : fallback;
  return node;
}

/**
 * The fills of one slot, in canonical order, for chrome that nests them.
 *
 * @param slot - The slot.
 * @returns Its fills; empty when no feature fills it.
 */
export function useSlotFills(slot: {
  readonly id: string;
}): readonly SlotFill<ReactNode>[] {
  return useContext(FeatureRenderContext).get(slot.id) ?? NO_FILLS;
}

const NO_FILLS: readonly SlotFill<ReactNode>[] = [];

const LiveStageContext = createContext<readonly LiveStage<ReactNode>[]>([]);
const ChromeStageContext = createContext<readonly LiveStage<ReactNode>[]>([]);

/**
 * The live stages the composed features bring, in the order they run.
 *
 * @returns The stages; empty for a table that composes none.
 */
export function useLiveStages(): readonly LiveStage<ReactNode>[] {
  return useContext(LiveStageContext);
}

/**
 * The chrome stages the composed features bring, in the order they run.
 *
 * @returns The stages; empty for a table that composes none.
 */
export function useChromeStages(): readonly LiveStage<ReactNode>[] {
  return useContext(ChromeStageContext);
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
    reader: NO_RUNTIME,
    featureIds: (features ?? []).map((feature) => feature.id),
  });
  const featureIds = useMemo(
    () => (features ?? []).map((feature) => feature.id),
    [features]
  );
  // A table without a publisher still reads the committed ids.
  useLayoutEffect(() => {
    cell.current.featureIds = featureIds;
  });
  const renders = useMemo(() => slotFillsOf(features ?? []), [features]);
  const stages = useMemo(() => liveStagesOf(features ?? []), [features]);
  const chromeStages = useMemo(
    () => liveStagesOf(features ?? [], "chrome"),
    [features]
  );
  // The page's high-contrast sheet gains the base rules and the rules of
  // each feature this table composes.
  useEffect(() => {
    ensureForcedColorsStyles(features);
  }, [features]);
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
      <FeatureIdsContext.Provider value={featureIds}>
        <FeatureRenderContext.Provider value={renders}>
          <LiveStageContext.Provider value={stages}>
            <ChromeStageContext.Provider value={chromeStages}>
              {tree}
            </ChromeStageContext.Provider>
          </LiveStageContext.Provider>
        </FeatureRenderContext.Provider>
      </FeatureIdsContext.Provider>
    </TableRuntimeContext.Provider>
  );
}
