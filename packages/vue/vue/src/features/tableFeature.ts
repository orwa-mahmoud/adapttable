/** Scoped extension contracts; importing these never installs a feature. */
import { devWarn } from "@adapttable/core";
import {
  drawnSlotFills,
  type FeatureApplyInput,
  type FeatureHostState,
  type FeaturePatch,
  type FeatureRender,
  type FeatureSlotKey,
  type FilterRuntime,
  type LiveFeatureHost,
  mergeFeaturePatches,
  type SlotFill,
  slotFillsOf,
  type TableRuntime,
} from "@adapttable/core/binding";
import type { EffectScope, ShallowRef, VNodeChild } from "vue";

import type { FeatureState } from "../featureState";
import type { UseDataTableResult } from "../useDataTable";
import type { ResolvedTableOptions } from "../useDataTableShell";
export interface FeatureMountContext<TRow = unknown> {
  readonly runtime: TableRuntime<TRow>;
  readonly table: UseDataTableResult<TRow>;
  readonly featureHost: Readonly<ShallowRef<FeatureHostState<TRow>>>;
  readonly filterRuntime: Readonly<ShallowRef<FilterRuntime<TRow> | undefined>>;
  readonly options: Readonly<ShallowRef<ResolvedTableOptions<TRow>>>;
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
  readonly setup?: (host: TableFeatureHost<TRow>) => void | (() => void);
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
  readonly setup?: (host: StaticFeatureHost) => void | (() => void);
  readonly mount?: <TRow>(
    context: FeatureMountContext<TRow>
  ) => void | (() => void);
  readonly renders?: readonly FeatureRender<never, VNodeChild>[];
  readonly requiredSlots?: readonly FeatureSlotKey<never>[];
}
export type ComposedFeature<TRow> = TableFeature<TRow>;
export function normalizeFeatures<TRow>(
  features: readonly ComposedFeature<TRow>[]
): readonly ComposedFeature<TRow>[] {
  const winners = new Map<string, ComposedFeature<TRow>>();
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
    if (winners.has(declaration.id))
      devWarn(
        `Two features share the id "${declaration.id}". The last declaration wins.`
      );
    winners.delete(declaration.id);
    winners.set(declaration.id, declaration);
  }
  return [...winners.values()];
}
/** Merge only after duplicate resolution; a discarded feature never applies. */
export function featureOptionsOf<TRow>(
  features: readonly ComposedFeature<TRow>[]
): Readonly<Record<string, unknown>> {
  return mergeFeaturePatches(features as readonly TableFeature<unknown>[]);
}
export function featureSlotFillsOf<TRow>(
  features: readonly ComposedFeature<TRow>[]
): ReadonlyMap<string, readonly SlotFill<VNodeChild>[]> {
  return slotFillsOf(features);
}
export function renderFeatureSlot<TProps>(
  slot: FeatureSlotKey<TProps>,
  fills: ReadonlyMap<string, readonly SlotFill<VNodeChild>[]>,
  props: TProps
): VNodeChild[] {
  return drawnSlotFills(slot, fills.get(slot.id) ?? []).map((fill) =>
    (fill.render as (props: TProps) => VNodeChild)(props)
  );
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
  return runtime as unknown as TableRuntime<unknown>;
}
