/**
 * Row detail and nested tables: the features, and the live expansion a table
 * reads while either is composed.
 */
import {
  coreNestedTable,
  coreRowDetail,
  type RowExpansionState,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import type { Renderer } from "../columnDef";
import { type AdaptTableFeature, featureOptionsOf } from "../featureHost";
import { injectRowExpansion } from "../rows/rowExpansion";
import type { NestedTableFor, RowDetailContext } from "../tree/nestedTable";

/**
 * Render a panel under an expanded row.
 *
 * @param renderRowDetail - An `ng-template` or standalone component, handed
 *   the row.
 * @param defaultExpandedRowIds - Rows whose panel starts open.
 * @returns The feature.
 *
 * @public
 */
export function rowDetail<TRow>(
  renderRowDetail: Renderer<RowDetailContext<TRow>>,
  defaultExpandedRowIds?: readonly string[]
): AdaptTableFeature {
  return coreRowDetail(renderRowDetail, defaultExpandedRowIds);
}

/**
 * Render the kit's own table inside a row's detail panel.
 *
 * @param nested - The nested table for a row, or nothing for a row without.
 * @param defaultExpandedRowIds - Rows whose panel starts open.
 * @returns The feature.
 *
 * @public
 */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>,
  defaultExpandedRowIds?: readonly string[]
): AdaptTableFeature {
  return coreNestedTable(nested, defaultExpandedRowIds);
}

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
