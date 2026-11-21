/**
 * Feature families: the members of one area, composed by one call and passed
 * to `features` as one value.
 *
 * A table composes at three levels. One feature is one capability; a family
 * is every member of an area (all of editing, all of filtering, all of column
 * layout); the preset is the common table, built from the families. A
 * binding's kit supplies its own member factories, so each family draws with
 * that kit's controls, and a table that names one member alone still loads
 * that member alone.
 */

/**
 * One value in a `features` list: a feature, or a family of them.
 *
 * @public
 */
export type FeatureListEntry<TFeature> = TFeature | readonly TFeature[];

function isFamily<TFeature>(
  entry: FeatureListEntry<TFeature>
): entry is readonly TFeature[] {
  return Array.isArray(entry);
}

/**
 * The features of a list whose entries may be families, in order.
 *
 * A list without families comes back as itself, so a table that memoizes on
 * its `features` array keeps doing so.
 *
 * @param list - Features and families, as a table's `features` takes them.
 * @returns Every feature, each family's members in place of the family.
 *
 * @public
 */
export function flattenFeatures<TFeature>(
  list: readonly FeatureListEntry<TFeature>[]
): readonly TFeature[] {
  if (!list.some(isFamily)) return list as readonly TFeature[];
  return list.flatMap((entry) => (isFamily(entry) ? entry : [entry]));
}

/**
 * A kit's factories for the editing family.
 *
 * @public
 */
export interface CoreEditingFamilyFactories<TFeature, TEdit, TExtras> {
  /** Cell editing, committing through `onCellEdit`. */
  readonly editing: (onCellEdit: TEdit, extras?: TExtras) => TFeature;
  /** Marks on unsaved cells and rows. */
  readonly dirtyIndicators: () => TFeature;
  /** Undo and redo of edits. */
  readonly editHistory: () => TFeature;
  /** The undo and redo controls. */
  readonly undoRedoButtons: () => TFeature;
}

/**
 * All of editing: cell editing with its marks, history and undo controls.
 *
 * Row and batch editing commit through handlers of their own, so a table that
 * edits by row or by batch adds them beside the family.
 *
 * @param factories - The kit's member factories.
 * @param onCellEdit - The host's write for a committed cell.
 * @param extras - Cell editing's lifecycle observers.
 * @returns The family's members.
 *
 * @public
 */
export function editingFamilyList<TFeature, TEdit, TExtras>(
  factories: CoreEditingFamilyFactories<TFeature, TEdit, TExtras>,
  onCellEdit: TEdit,
  extras?: TExtras
): TFeature[] {
  return [
    factories.editing(onCellEdit, extras),
    factories.dirtyIndicators(),
    factories.editHistory(),
    factories.undoRedoButtons(),
  ];
}

/**
 * A kit's factories for the filtering family.
 *
 * @public
 */
export interface CoreFilteringFamilyFactories<TFeature, TFilter> {
  /** Declarative filters and their panel. */
  readonly filters: (defs: readonly TFilter[]) => TFeature;
  /** Filter controls in the column headers. */
  readonly headerFilters: () => TFeature;
}

/**
 * All of filtering: the filter panel for `defs` and the header controls.
 *
 * @param factories - The kit's member factories.
 * @param defs - The filters the panel offers.
 * @returns The family's members.
 *
 * @public
 */
export function filteringFamilyList<TFeature, TFilter>(
  factories: CoreFilteringFamilyFactories<TFeature, TFilter>,
  defs: readonly TFilter[]
): TFeature[] {
  return [factories.filters(defs), factories.headerFilters()];
}

/**
 * A kit's factories for the column-layout family.
 *
 * @public
 */
export interface CoreColumnLayoutFamilyFactories<TFeature> {
  /** The columns menu: visibility, pinning and order. */
  readonly columnMenu: () => TFeature;
  /** Drag-to-resize column edges. */
  readonly resizableColumns: () => TFeature;
  /** The fit-columns action. */
  readonly fitColumns: () => TFeature;
}

/**
 * All of column layout: the columns menu, resizing and fitting.
 *
 * Collapsible column groups need column groups to act on, so a table that
 * has them adds that feature beside the family.
 *
 * @param factories - The kit's member factories.
 * @returns The family's members.
 *
 * @public
 */
export function columnLayoutFamilyList<TFeature>(
  factories: CoreColumnLayoutFamilyFactories<TFeature>
): TFeature[] {
  return [
    factories.columnMenu(),
    factories.resizableColumns(),
    factories.fitColumns(),
  ];
}
