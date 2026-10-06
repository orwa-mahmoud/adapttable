import {
  type AdaptTableFeature,
  featureOptionsOf,
  injectRowPinning,
  injectRowPinningUrlState,
  readMaybe,
} from "@adapttable/angular";
import type { RowPinningFeatureOptions } from "@adapttable/angular/features";
import {
  devWarn,
  rowPinningBlockedWarning,
  rowPinningControl,
  rowPinningRequested,
  rowPinningUrlSync,
  type TableLabels,
  type UrlStateAdapter,
} from "@adapttable/core";
import { type RowPinningState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

/**
 * Options for {@link injectTableRowPinning}.
 *
 * @public
 */
export interface TableRowPinningOptions<TRow> {
  /** The composed features; pinning arms on `rowPinning`. */
  readonly features: readonly AdaptTableFeature[];
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** The table's resolved labels, for the pin actions' names. */
  readonly labels: Signal<Required<TableLabels>>;
  /** Whether grouping or a tree is armed, which refuses pinning. */
  readonly blocked: Signal<boolean>;
  /** The table's URL backend. */
  readonly urlAdapter?: UrlStateAdapter;
  /** Whether the table syncs with the URL. */
  readonly urlSync?: boolean;
  /** The table's URL namespace. */
  readonly urlKey?: string;
  /** The injector to run in. */
  readonly injector?: Injector;
}

/** The pin options the feature writes. */
interface PinPatch extends RowPinningFeatureOptions {
  readonly rowPinningArmed?: boolean;
}

/**
 * The live pin state while `rowPinning()` is composed, `undefined` when it
 * is not. The signal holds `undefined` while grouping or a tree refuses it,
 * with a development warning.
 *
 * @param options - See {@link TableRowPinningOptions}.
 * @returns The state as a signal, or `undefined` when pinning is not composed.
 *
 * @public
 */
export function injectTableRowPinning<TRow>(
  options: TableRowPinningOptions<TRow>
): Signal<RowPinningState<TRow> | undefined> | undefined {
  const declared = featureOptionsOf(options.features) as PinPatch;
  const pinnedRowIds = computed(() => readMaybe(declared.pinnedRowIds));
  const requested = rowPinningRequested({
    ...declared,
    pinnedRowIds: untracked(pinnedRowIds),
  });
  if (!requested) return undefined;
  if (!options.injector) assertInInjectionContext(injectTableRowPinning);
  const injector = options.injector ?? inject(Injector);
  const url = injectRowPinningUrlState({
    urlAdapter: options.urlAdapter,
    urlSync: rowPinningUrlSync({
      urlSync: options.urlSync,
      requested,
      pinnedRowIds: untracked(pinnedRowIds),
    }),
    urlKey: options.urlKey,
    injector,
  });
  const control = computed(() =>
    rowPinningControl({
      requested,
      pinnedRowIds: pinnedRowIds(),
      onPinnedRowIdsChange: declared.onPinnedRowIdsChange,
      urlPinnedRowIds: url.pinnedRowIds(),
      writeUrl: url.onPinnedRowIdsChange,
    })
  );
  const enabled = computed(() => !options.blocked());
  effect(
    () => {
      const warning = rowPinningBlockedWarning(requested, options.blocked());
      if (warning !== undefined) devWarn(warning);
    },
    { injector }
  );
  const pinning = injectRowPinning<TRow>({
    enabled,
    pinnedRowIds: computed(() => control().pinnedRowIds),
    onPinnedRowIdsChange: (next) => {
      untracked(control).onPinnedRowIdsChange?.(next);
    },
    getRowId: options.getRowId,
    labels: computed(() => {
      const labels = options.labels();
      return {
        pinToTop: labels.pinToTop,
        pinToBottom: labels.pinToBottom,
        unpinRow: labels.unpinRow,
      };
    }),
    injector,
  });
  return computed(() => (enabled() ? pinning() : undefined));
}
