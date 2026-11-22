/** Scoped extension contracts; importing these never installs a feature. */
import {
  type TableDensity,
  type TableLabels,
  type TableSource,
  type UrlStateAdapter,
} from "@adapttable/core";
import {
  type ContrastRules,
  drawnSlotFills,
  type FeatureApplyInput,
  type FeatureHostState,
  type FeatureListEntry,
  type FeaturePatch,
  type FeatureRender,
  type FeatureSlotKey,
  type FilterRuntime,
  flattenFeatures,
  type LiveFeatureHost,
  mergeFeaturePatches,
  type PlainSlotKey,
  resolveFeatureIds,
  type RowSlotKey,
  type SlotFill,
  slotFillsOf,
  type TableRuntime,
} from "@adapttable/core/binding";
import type { EffectScope, ShallowRef, VNodeChild } from "vue";

import type { FeatureState } from "../featureState";
import type { TableRowInventory } from "../hierarchy/rowInventory";
import type { TableBodyProjection } from "../layout/modelChannels";
import type { TableRowModel } from "../layout/tableModels";
import type { RowSelection } from "../selection/selection";
import type { UseDataTableResult } from "../useDataTable";
import type { ResolvedTableOptions } from "../useDataTableShell";
export interface FeatureMountContext<TRow = unknown> {
  readonly bodyRows?: Readonly<ShallowRef<readonly TableRowModel<TRow>[]>>;
  readonly selection?: Readonly<ShallowRef<RowSelection | undefined>>;
  readonly scrollToRow?: (index: number) => void;
  readonly scrollToColumn?: (index: number) => void;
  readonly rowInventory?: Readonly<ShallowRef<TableRowInventory<TRow>>>;
  readonly bodyProjection?: Readonly<ShallowRef<TableBodyProjection<TRow>>>;
  readonly runtime: TableRuntime<TRow>;
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly urlAdapter: Readonly<ShallowRef<UrlStateAdapter>>;
  flushViewState(): void;
  registerViewStateFlush(flush: () => void): void;
  readonly source: Readonly<ShallowRef<TableSource<TRow>>>;
  readonly density?: Readonly<ShallowRef<TableDensity>>;
  readonly table: UseDataTableResult<TRow>;
  readonly featureHost: Readonly<ShallowRef<FeatureHostState<TRow>>>;
  readonly filterRuntime: Readonly<ShallowRef<FilterRuntime<TRow> | undefined>>;
  readonly options: Readonly<ShallowRef<ResolvedTableOptions<TRow>>>;
  /** The feature's current declaration, with its latest options. */
  readonly feature: () => TableFeature<TRow>;
  readonly state: FeatureState;
  readonly scope: EffectScope;
  readonly active: Readonly<ShallowRef<boolean>>;
  reconcile(): void;
  flushAdmission(): void | Promise<void>;
  flush<T>(run: () => T): T;
}
export type TableFeatureHost<TRow = unknown> = LiveFeatureHost<TRow>;
export interface TableFeature<TRow> {
  readonly id: string;
  readonly dependencies?: readonly unknown[];
  apply?(input: FeatureApplyInput<TRow>): FeaturePatch<TRow>;
  /** The strings the feature draws, with their English defaults. */
  readonly labels?: Partial<TableLabels>;
  /** The high-contrast rules for what the feature draws. */
  readonly contrast?: ContrastRules;
  /** Where its fills sit in a slot several features fill; lower first. */
  readonly rank?: number;
  /** Registration only; a resource belongs in `mount`. */
  readonly setup?: (host: TableFeatureHost<TRow>) => void;
  readonly mount?: (context: FeatureMountContext<TRow>) => void | (() => void);
  readonly renders?: readonly FeatureRender<never, VNodeChild>[];
  readonly requiredSlots?: readonly FeatureSlotKey<never>[];
  readonly __row?: (row: TRow) => TRow;
}
/** Row-free factories fit tables of every row type without an annotation. */
export type StaticFeatureHost = Omit<
  TableFeatureHost<unknown>,
  | "registerColumnMenuAction"
  | "registerContextMenuItems"
  | "columnMenuActions"
  | "contextMenuItems"
>;
export interface StaticTableFeature {
  readonly id: string;
  readonly dependencies?: readonly unknown[];
  apply?(input: FeatureApplyInput<never>): FeaturePatch<unknown>;
  /** The strings the feature draws, with their English defaults. */
  readonly labels?: Partial<TableLabels>;
  /** The high-contrast rules for what the feature draws. */
  readonly contrast?: ContrastRules;
  /** Where its fills sit in a slot several features fill; lower first. */
  readonly rank?: number;
  /** Registration only; a resource belongs in `mount`. */
  readonly setup?: (host: StaticFeatureHost) => void;
  readonly mount?: <TRow>(
    context: FeatureMountContext<TRow>
  ) => void | (() => void);
  readonly renders?: readonly FeatureRender<never, VNodeChild>[];
  readonly requiredSlots?: readonly FeatureSlotKey<never>[];
}
export type ComposedFeature<TRow> = TableFeature<TRow>;
export function normalizeFeatures<TRow>(
  entries: readonly FeatureListEntry<ComposedFeature<TRow>>[]
): readonly ComposedFeature<TRow>[] {
  const features = flattenFeatures(entries);
  for (const declaration of features) {
    if (
      !declaration ||
      typeof declaration.id !== "string" ||
      declaration.id.trim() === ""
    )
      throw new Error(
        "AdaptTable: every feature must declare a non-empty stable id."
      );
    for (const name of ["apply", "setup", "mount"] as const)
      if (
        declaration[name] !== undefined &&
        typeof declaration[name] !== "function"
      )
        throw new Error(
          `AdaptTable: feature "${declaration.id}" has an invalid ${name}.`
        );
  }
  return resolveFeatureIds(features);
}
/** Merge only after duplicate resolution; a discarded feature never applies. */
export function featureOptionsOf<TRow>(
  features: readonly ComposedFeature<TRow>[]
): Readonly<Record<string, unknown>> {
  return mergeFeaturePatches(features);
}
export function featureSlotFillsOf<TRow>(
  features: readonly ComposedFeature<TRow>[]
): ReadonlyMap<string, readonly SlotFill<VNodeChild>[]> {
  return slotFillsOf(features);
}
export function renderFeatureSlot<TProps>(
  slot: PlainSlotKey<TProps>,
  fills: ReadonlyMap<string, readonly SlotFill<VNodeChild>[]>,
  props: TProps
): VNodeChild[];
/** Draw a row-typed slot's fills with this table's props. @public */
export function renderFeatureSlot<TProps>(
  slot: RowSlotKey<(props: NoInfer<TProps>) => VNodeChild>,
  fills: ReadonlyMap<string, readonly SlotFill<VNodeChild>[]>,
  props: TProps
): VNodeChild[];
export function renderFeatureSlot(
  slot: FeatureSlotKey<never>,
  fills: ReadonlyMap<string, readonly SlotFill<VNodeChild>[]>,
  props: unknown
): VNodeChild[] {
  return drawFills(slot, fills.get(slot.id) ?? [], props);
}
function drawFills(
  slot: FeatureSlotKey<never>,
  fills: readonly SlotFill<VNodeChild>[],
  props: unknown
): VNodeChild[] {
  return drawnSlotFills(slot, fills).map((fill) =>
    (fill.render as (props: unknown) => VNodeChild)(props)
  );
}
/**
 * Draws one feature's fills of a slot with the props given.
 *
 * @public
 */
export interface FeatureSlotDrawer {
  /** Draw the feature's fills of a slot with these props. */
  <TProps>(slot: PlainSlotKey<TProps>, props: TProps): VNodeChild[];
  /** Draw the feature's fills of a row-typed slot with these props. */
  <TProps>(
    slot: RowSlotKey<(props: NoInfer<TProps>) => VNodeChild>,
    props: TProps
  ): VNodeChild[];
}
/**
 * A drawer for the fills one feature added: a feature's toolbar entry draws
 * its own kit control, never another feature's fill of the same slot.
 */
export function featureSlotDrawer(
  fills: ReadonlyMap<string, readonly SlotFill<VNodeChild>[]>,
  featureId: string
): FeatureSlotDrawer {
  function draw<TProps>(
    slot: PlainSlotKey<TProps>,
    props: TProps
  ): VNodeChild[];
  function draw<TProps>(
    slot: RowSlotKey<(props: NoInfer<TProps>) => VNodeChild>,
    props: TProps
  ): VNodeChild[];
  function draw(slot: FeatureSlotKey<never>, props: unknown): VNodeChild[] {
    const own = (fills.get(slot.id) ?? []).filter(
      (fill) => fill.id === featureId
    );
    return drawFills(slot, own, props);
  }
  return draw;
}
export function assertRequiredSlots<TRow>(
  features: readonly ComposedFeature<TRow>[],
  fills: ReadonlyMap<string, readonly SlotFill<VNodeChild>[]>
): void {
  for (const feature of features)
    for (const slot of feature.requiredSlots ?? [])
      if (!fills.get(slot.id)?.length)
        throw new Error(
          `AdaptTable: feature "${feature.id}" requires the adapter control slot "${slot.id}".`
        );
}
export function feature<TRow>(
  id: string,
  patch?: FeaturePatch<TRow>,
  setup?: TableFeature<TRow>["setup"]
): TableFeature<TRow> {
  return { id, apply: patch === undefined ? undefined : () => patch, setup };
}
export function extendFeature<
  TFeature extends {
    readonly renders?: readonly FeatureRender<never, VNodeChild>[];
  },
>(
  base: TFeature,
  renders: readonly FeatureRender<never, VNodeChild>[]
): TFeature {
  return { ...base, renders: [...(base.renders ?? []), ...renders] };
}

/** Cross the neutral controller's opaque-row boundary without changing runtime identity.
 * Controllers must only pass row objects obtained from this same runtime. */
export function eraseTableRuntime<TRow>(
  runtime: TableRuntime<TRow>
): TableRuntime<unknown> {
  return runtime;
}
