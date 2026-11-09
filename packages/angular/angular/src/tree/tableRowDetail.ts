import {
  type AdaptTableFeature,
  featureOptionsOf,
  injectRowExpansion,
  type NestedTableFor,
  type Renderer,
  type RowDetailContext,
} from "@adapttable/angular";
import { type RowExpansionState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

/**
 * The live row detail while `rowDetail()` or `nestedTable()` is composed.
 *
 * @public
 */
export interface TableRowDetail<TRow> {
  /** Which rows are open. */
  readonly expansion: RowExpansionState;
  /** The host's own detail renderer. */
  readonly render: Renderer<RowDetailContext<TRow>> | undefined;
  /** The nested table for a row. */
  readonly nested: NestedTableFor<TRow> | undefined;
}

/**
 * Options for {@link injectRowDetail}.
 *
 * @public
 */
export interface RowDetailOptions {
  /** The composed features; detail arms on `rowDetail` or `nestedTable`. */
  readonly features: readonly AdaptTableFeature[];
  /** The injector to run in. */
  readonly injector?: Injector;
}

/** The detail options the two features write. */
interface DetailPatch<TRow> {
  readonly renderRowDetail?: Renderer<RowDetailContext<TRow>>;
  readonly nestedTable?: NestedTableFor<TRow>;
  readonly defaultExpandedRowIds?: readonly string[];
}

/**
 * The live row detail while `rowDetail()` or `nestedTable()` is composed,
 * `undefined` when neither is.
 *
 * @param options - See {@link RowDetailOptions}.
 * @returns The model as a signal, or `undefined` when neither is composed.
 *
 * @public
 */
export function injectRowDetail<TRow>(
  options: RowDetailOptions
): Signal<TableRowDetail<TRow>> | undefined {
  const { features } = options;
  const armed = features.some(
    (feature) => feature.id === "row-detail" || feature.id === "nested-table"
  );
  if (!armed) return undefined;
  if (!options.injector) assertInInjectionContext(injectRowDetail);
  const injector = options.injector ?? inject(Injector);
  const declared = featureOptionsOf(features) as DetailPatch<TRow>;
  const expansion = injectRowExpansion({
    defaultExpandedIds: declared.defaultExpandedRowIds,
    injector,
  });
  return computed(() => ({
    expansion: expansion(),
    render: declared.renderRowDetail,
    nested: declared.nestedTable,
  }));
}
