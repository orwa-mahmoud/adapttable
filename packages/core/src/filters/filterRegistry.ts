/**
 * Public filter-type registry (#283). A type supplies widget kind, operators,
 * predicate, chips and tree serialization. Built-ins are the first consumers —
 * every former `switch (def.type)` looks up a spec instead.
 */
import type { ReactElement } from "react";

import type { QueryCondition } from "../source/queryContract";
import type { ExtraFilters, TableLabels } from "../types";
import { devWarn } from "../utils/devWarn";
import type { FilterDef, FilterType } from "./filterDefs";
import type { FilterFormSource } from "./filterForm";
import type { ChipLabelResolver } from "./useActiveFilterChips";

/**
 * Built-in widget a kit AutoFilterForm / header row already knows how to draw.
 *
 * @public
 */
export type FilterWidgetKind = FilterType;

/**
 * Props a custom `render` function receives.
 *
 * @public
 */
export interface FilterWidgetRenderProps<TRow = unknown> {
  /** The filter definition being rendered. */
  readonly def: FilterDef<TRow>;
  /** Reads and writes the table's state. */
  readonly source: FilterFormSource<TRow>;
  /** Resolved labels, every key filled. */
  readonly labels: Required<TableLabels>;
  /** Class for the element. */
  readonly className?: string;
}

/**
 * One registered filter type: widget + operators + predicate + chips +
 * tree projection. Register a new `type` string via
 * `TableFeatureHost.registerFilterType`, or extend a built-in with
 * `TableFeatureHost.extendFilterType` to add operators without forking
 * the table. `FilterTypeRegistry.register` / `extend` still work until v3.
 *
 * @public
 */
export interface FilterTypeSpec {
  /** The type's name, as a `FilterDef` references it. */
  readonly type: string;
  /** Which built-in kit widget to draw. Ignored when `render` is set. */
  readonly widget: FilterWidgetKind;
  /** Operators this type offers, in menu order. */
  readonly ops: readonly string[];
  /** Operator used until the reader picks another. */
  readonly defaultOp: string;
  /** Persist this key as a comma-separated array in the URL. */
  readonly urlArray?: boolean;
  /** Persist this type's range bounds as numbers in the URL. */
  readonly urlNumberKeys?: boolean;
  /** State keys this type owns for a definition — what the URL persists. */
  stateKeys(def: Pick<FilterDef, "key" | "type">): string[];
  /** Whether a row passes this filter. */
  match<TRow>(def: FilterDef<TRow>, extra: ExtraFilters, row: TRow): boolean;
  /** Chip labels for this filter's active state, by state key. */
  chips<TRow>(def: FilterDef<TRow>): Record<string, ChipLabelResolver>;
  /** Turns one tree condition into the flat filter values the table reads. */
  conditionToExtra<TRow>(
    def: FilterDef<TRow>,
    condition: QueryCondition
  ): ExtraFilters;
  /** Native renderer — header row and AutoFilterForm use this when set. */
  render?<TRow>(props: FilterWidgetRenderProps<TRow>): ReactElement;
}

/**
 * Immutable registry of {@link FilterTypeSpec}s.
 *
 * @public
 */
export interface FilterTypeRegistry {
  /** The spec for a type name, or `undefined` when it is not registered. */
  get(type: string): FilterTypeSpec | undefined;
  /** Whether a type name is registered. */
  has(type: string): boolean;
  /** Every registered type name. */
  types(): readonly string[];
  /**
   * Returns a registry with this spec added.
   *
   * @deprecated Register with `TableFeatureHost.registerFilterType` in
   * `feature.setup(host)` instead. Removed at v3.
   */
  register(spec: FilterTypeSpec): FilterTypeRegistry;
  /**
   * Returns a registry with one type's spec patched.
   *
   * @deprecated Use `TableFeatureHost.extendFilterType` in
   * `feature.setup(host)` instead. Removed at v3.
   */
  extend(type: string, patch: Partial<FilterTypeSpec>): FilterTypeRegistry;
}

class MapRegistry implements FilterTypeRegistry {
  constructor(private readonly specs: ReadonlyMap<string, FilterTypeSpec>) {}

  get(type: string): FilterTypeSpec | undefined {
    return this.specs.get(type);
  }

  has(type: string): boolean {
    return this.specs.has(type);
  }

  types(): readonly string[] {
    return [...this.specs.keys()];
  }

  /** Returns a registry with this spec added. */
  register(spec: FilterTypeSpec): FilterTypeRegistry {
    return withFilterType(this, spec);
  }

  /** Returns a registry with one type's spec patched. */
  extend(type: string, patch: Partial<FilterTypeSpec>): FilterTypeRegistry {
    return withExtendedFilterType(this, type, patch);
  }
}

/**
 * Copy `registry` with `spec` added (same `type` replaces). Used internally
 * so {@link FilterTypeRegistry.register} can stay deprecated without the
 * library calling it.
 */
export function withFilterType(
  registry: FilterTypeRegistry,
  spec: FilterTypeSpec
): FilterTypeRegistry {
  const specs: FilterTypeSpec[] = [];
  for (const type of registry.types()) {
    const current = registry.get(type);
    if (current) specs.push(current);
  }
  specs.push(spec);
  return createFilterRegistry(specs);
}

/**
 * Patch a named type on `registry`. Unknown types warn and return the
 * same registry — same contract as {@link FilterTypeRegistry.extend}.
 */
export function withExtendedFilterType(
  registry: FilterTypeRegistry,
  type: string,
  patch: Partial<FilterTypeSpec>
): FilterTypeRegistry {
  const current = registry.get(type);
  if (!current) {
    devWarn(`extendFilterType: unknown type "${type}"`);
    return registry;
  }
  return withFilterType(registry, { ...current, ...patch, type });
}

/**
 * Empty registry — used to seed {@link createFilterRegistry}.
 *
 * @internal
 */
export function emptyFilterRegistry(): FilterTypeRegistry {
  return new MapRegistry(new Map());
}

/**
 * Registry from an explicit spec list (last write wins on a repeated type).
 *
 * @internal
 */
export function createFilterRegistry(
  specs: readonly FilterTypeSpec[]
): FilterTypeRegistry {
  const map = new Map<string, FilterTypeSpec>();
  for (const spec of specs) map.set(spec.type, spec);
  return new MapRegistry(map);
}

/**
 * Look up a spec, or `undefined` for an unknown type.
 *
 * @internal
 */
export function filterTypeSpec(
  type: string,
  registry: FilterTypeRegistry
): FilterTypeSpec | undefined {
  return registry.get(type);
}

/**
 * Widget kind a kit should draw for this def.
 *
 * @internal
 */
export function filterWidgetKind(
  def: Pick<FilterDef, "type">,
  registry: FilterTypeRegistry
): FilterWidgetKind | undefined {
  return registry.get(def.type)?.widget;
}

/**
 * Operators the tree builder offers for this def.
 *
 * @internal
 */
export function filterTypeOps(
  def: Pick<FilterDef, "type">,
  registry: FilterTypeRegistry
): readonly string[] {
  return registry.get(def.type)?.ops ?? ["eq"];
}

/**
 * Default operator when a tree condition is first added.
 *
 * @internal
 */
export function filterTypeDefaultOp(
  def: Pick<FilterDef, "type">,
  registry: FilterTypeRegistry
): string {
  return registry.get(def.type)?.defaultOp ?? "eq";
}

/**
 * Custom `render` for this def, or `undefined` to use the kit widget.
 *
 * @internal
 */
export function renderRegisteredFilter<TRow>(
  def: FilterDef<TRow>,
  source: FilterFormSource<TRow>,
  labels: Required<TableLabels>,
  registry: FilterTypeRegistry,
  className?: string
): ReactElement | undefined {
  return registry.get(def.type)?.render?.({ def, source, labels, className });
}
