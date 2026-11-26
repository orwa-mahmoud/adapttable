/**
 * Feature families drawn with a kit's controls: every member of an area,
 * built by one call and passed to `features` as one entry.
 */
import { type FilterDef } from "@adapttable/core";
import {
  columnLayoutFamilyList,
  editingFamilyList,
  filteringFamilyList,
} from "@adapttable/core/binding";

import type {
  FeaturePatch,
  StaticTableFeature,
  TableFeature,
} from "../features/tableFeature";
import type { AdapterEditingFeatures } from "./editing";
import type { AdapterStandardFeatureFactories } from "./standardPreset";

/**
 * A kit's members of the editing family.
 *
 * @public
 */
export type AdapterEditingFamilyFactories = Pick<
  AdapterEditingFeatures,
  "editing" | "dirtyIndicators" | "editHistory" | "undoRedoButtons"
>;

/**
 * All of editing: cell editing with its marks, history and undo controls.
 * Row and batch editing commit through handlers of their own and join beside
 * the family.
 *
 * @public
 */
export type EditingFamilyFactory = <TRow>(
  onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
  extras?: FeaturePatch<TRow>
) => readonly TableFeature<TRow>[];

/**
 * The editing family, drawn with a kit's members.
 *
 * @param factories - The kit's `editing`, `dirtyIndicators`, `editHistory`
 *   and `undoRedoButtons`.
 * @returns The kit's `editingFamily`.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterEditingFamily(
  factories: AdapterEditingFamilyFactories
): EditingFamilyFactory {
  return <TRow>(
    onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
    extras?: FeaturePatch<TRow>
  ): readonly TableFeature<TRow>[] =>
    editingFamilyList<
      TableFeature<TRow>,
      typeof onCellEdit,
      FeaturePatch<TRow> | undefined
    >(
      {
        editing: (save, more) => factories.editing(save, more),
        dirtyIndicators: factories.dirtyIndicators,
        editHistory: () => factories.editHistory(),
        undoRedoButtons: factories.undoRedoButtons,
      },
      onCellEdit,
      extras
    );
}

/**
 * A kit's members of the filtering family.
 *
 * @public
 */
export type AdapterFilteringFamilyFactories = Pick<
  AdapterStandardFeatureFactories,
  "filters" | "headerFilters"
>;

/**
 * All of filtering: the filter panel for the given definitions and the
 * header controls.
 *
 * @public
 */
export type FilteringFamilyFactory = <TRow>(
  defs: readonly FilterDef<TRow>[]
) => readonly TableFeature<TRow>[];

/**
 * The filtering family, drawn with a kit's members.
 *
 * @param factories - The kit's `filters` and `headerFilters`.
 * @returns The kit's `filteringFamily`.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterFilteringFamily(
  factories: AdapterFilteringFamilyFactories
): FilteringFamilyFactory {
  return <TRow>(
    defs: readonly FilterDef<TRow>[]
  ): readonly TableFeature<TRow>[] =>
    filteringFamilyList<TableFeature<TRow>, FilterDef<TRow>>(
      {
        filters: (given) => factories.filters(given),
        headerFilters: factories.headerFilters,
      },
      defs
    );
}

/**
 * A kit's members of the column-layout family.
 *
 * @public
 */
export type AdapterColumnLayoutFamilyFactories = Pick<
  AdapterStandardFeatureFactories,
  "columnMenu" | "resizableColumns" | "fitColumns"
>;

/**
 * The column-layout family, drawn with a kit's members: the columns menu,
 * resizing and fitting.
 *
 * @param factories - The kit's `columnMenu`, `resizableColumns` and
 *   `fitColumns`.
 * @returns The kit's `columnLayoutFamily`.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterColumnLayoutFamily(
  factories: AdapterColumnLayoutFamilyFactories
): () => readonly StaticTableFeature[] {
  return () => columnLayoutFamilyList(factories);
}
