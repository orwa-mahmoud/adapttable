/**
 * Row (and keyed-list) virtualization for Angular — `@tanstack/angular-virtual`
 * over core's virtual table model.
 *
 * Import from this module only when a table wants the window. The base table
 * graph never reaches TanStack.
 */
import {
  type KeyedVirtualization,
  type TableVirtualization,
  VIRTUAL_OVERSCAN,
  type VirtualItemMeta,
} from "@adapttable/core";
import {
  asSizeEstimator,
  EndReachedLatch,
  keyedWindow,
  materializeWindowRows,
  rowWindow,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  isSignal,
  runInInjectionContext,
  type Signal,
} from "@angular/core";
import {
  type AngularVirtualizer,
  injectVirtualizer,
  injectWindowVirtualizer,
  type VirtualItem,
} from "@tanstack/angular-virtual";

import { injectRowPairMeasurer } from "./measureRowPair";

function asItemMeta(item: VirtualItem): VirtualItemMeta {
  return {
    index: item.index,
    start: item.start,
    end: item.end,
    size: item.size,
    key: item.key,
    lane: item.lane,
  };
}

/**
 * Options for {@link injectTableVirtualization}.
 *
 * @public
 */
export interface TableVirtualizationOptions<TRow> {
  /** Source rows from the table source. */
  readonly rows: Signal<readonly TRow[]>;
  /** Stable row key resolver. */
  readonly rowKey: (row: TRow) => string;
  /** Master switch; adapters keep this optional. */
  readonly enabled?: Signal<boolean> | boolean;
  /** Estimated row/card size in px, or a per-index reader. */
  readonly estimateSize?:
    | Signal<number | ((index: number) => number)>
    | number
    | ((index: number) => number);
  /** Extra items rendered before/after the visible window. */
  readonly overscan?: Signal<number> | number;
  /** Window virtualizer scroll margin, usually sticky header height. */
  readonly scrollMargin?: Signal<number> | number;
  /**
   * Scroll container accessor. When provided, the virtual window tracks
   * THIS element's scrolling (a `maxHeight` box) instead of the page.
   */
  readonly getScrollElement?: () => Element | null;
  /** Called when the virtual window reaches the last source row. */
  readonly onEndReached?: () => void;
  /**
   * Whether rows can expand. With detail panels the window measures each
   * row with its panel; without them the extra observers are pure cost.
   */
  readonly expandable?: Signal<boolean> | boolean;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

function readFlag(
  value: Signal<boolean> | boolean | undefined,
  fallback: boolean
): boolean {
  if (value === undefined) return fallback;
  return typeof value === "boolean" ? value : value();
}

function readNumber(
  value: Signal<number> | number | undefined,
  fallback: number
): number {
  if (value === undefined) return fallback;
  return typeof value === "number" ? value : value();
}

function readEstimate(
  value:
    | Signal<number | ((index: number) => number)>
    | number
    | ((index: number) => number)
    | undefined,
  fallback: number
): (index: number) => number {
  if (value === undefined) return asSizeEstimator(fallback);
  return asSizeEstimator(isSignal(value) ? value() : value);
}

/** The methods the window math and scroll helpers call on either virtualizer. */
type ActiveVirtualizer = Pick<
  AngularVirtualizer<Element, Element>,
  | "getVirtualItems"
  | "getTotalSize"
  | "measureElement"
  | "resizeItem"
  | "scrollToIndex"
>;

function pickVirtualizer(
  elementMode: boolean,
  element: ActiveVirtualizer,
  windowVz: ActiveVirtualizer
): ActiveVirtualizer {
  return elementMode ? element : windowVz;
}

/**
 * Headless window virtualization for adapter tables. When disabled, it
 * returns every row and no spacer data, so adapters can use the same render
 * path for virtual and non-virtual tables.
 *
 * @param options - See {@link TableVirtualizationOptions}.
 * @returns The window, as a signal.
 *
 * @public
 */
export function injectTableVirtualization<TRow>(
  options: TableVirtualizationOptions<TRow>
): Signal<TableVirtualization<TRow>> {
  return injectTableVirtualizer(options).virtualization;
}

/**
 * {@link injectTableVirtualization}, plus the virtualizer's own scroll — what
 * the table's body needs to bring an unrendered row into the window.
 *
 * @param options - See {@link TableVirtualizationOptions}.
 * @returns The window signal and a scroll helper.
 *
 * @public
 */
export function injectTableVirtualizer<TRow>(
  options: TableVirtualizationOptions<TRow>
): {
  readonly virtualization: Signal<TableVirtualization<TRow>>;
  readonly scrollToIndex: (index: number) => void;
} {
  if (!options.injector) assertInInjectionContext(injectTableVirtualizer);
  const injector = options.injector ?? inject(Injector);
  return runInInjectionContext(injector, () => {
    const enabled = (): boolean => readFlag(options.enabled, false);
    const estimateSize = (): ((index: number) => number) =>
      readEstimate(options.estimateSize, 56);
    const overscan = (): number =>
      readNumber(options.overscan, VIRTUAL_OVERSCAN);
    const scrollMargin = (): number => readNumber(options.scrollMargin, 0);
    const expandable = (): boolean => readFlag(options.expandable, false);
    const elementMode = options.getScrollElement !== undefined;
    // The virtualizer memoises measurements on `getItemKey`, so the key reads
    // the host's rowKey through one stable extractor.
    const { rowKey } = options;
    const getItemKey = (index: number): string => {
      const row = options.rows()[index];
      return row === undefined ? String(index) : rowKey(row);
    };

    // Both injectors must run unconditionally; exactly one is enabled.
    const windowVirtualizer = injectWindowVirtualizer(() => ({
      count: options.rows().length,
      enabled: enabled() && !elementMode,
      estimateSize: estimateSize(),
      getItemKey,
      overscan: overscan(),
      scrollMargin: scrollMargin(),
    }));
    const elementVirtualizer = injectVirtualizer(() => ({
      count: options.rows().length,
      enabled: enabled() && elementMode,
      scrollElement: options.getScrollElement?.() ?? undefined,
      estimateSize: estimateSize(),
      getItemKey,
      overscan: overscan(),
    }));
    const activeVirtualizer = (): ActiveVirtualizer =>
      pickVirtualizer(elementMode, elementVirtualizer, windowVirtualizer);

    const endLatch = new EndReachedLatch();
    effect(() => {
      const items = activeVirtualizer().getVirtualItems();
      const active = enabled() && items.length > 0;
      if (endLatch.check(active, options.rows().length, items.at(-1)?.index)) {
        options.onEndReached?.();
      }
    });
    // A row with an open detail panel is two elements: measure them as a pair.
    const measureRowPair = injectRowPairMeasurer({
      virtualizer: activeVirtualizer,
      enabled: computed(() => enabled() && expandable()),
    });

    const virtualization = computed((): TableVirtualization<TRow> => {
      const on = enabled();
      const items = activeVirtualizer().getVirtualItems().map(asItemMeta);
      const active = on && items.length > 0;
      const rows = options.rows();
      const materialized = materializeWindowRows(
        rows,
        rowKey,
        on,
        active ? items : []
      );
      const vz = activeVirtualizer();
      return rowWindow({
        enabled: on,
        rows: materialized,
        count: rows.length,
        virtualizer: {
          getTotalSize: () => vz.getTotalSize(),
          measureElement: (node) => {
            vz.measureElement(node);
          },
          options: { scrollMargin: scrollMargin() },
        },
        items: active ? items : [],
        estimateSize: estimateSize(),
        expandable: expandable(),
        measureRowPair: expandable() ? measureRowPair : undefined,
      });
    });

    return {
      virtualization,
      scrollToIndex: (index) => {
        activeVirtualizer().scrollToIndex(index, {
          align: "center",
          behavior: "instant",
        });
      },
    };
  });
}

/**
 * Options for {@link injectKeyedVirtualization}.
 *
 * @public
 */
export interface KeyedVirtualizationOptions {
  /** One key per entry, in render order. */
  readonly keys: Signal<readonly string[]>;
  /** Whether to window at all; false renders every entry. */
  readonly enabled?: Signal<boolean> | boolean;
  /** Estimated pixel height of one entry. */
  readonly estimateSize?:
    | Signal<number | ((index: number) => number)>
    | number
    | ((index: number) => number);
  /** Extra entries beyond the viewport. */
  readonly overscan?: Signal<number> | number;
  /** Where the list starts in the page, for a window-scrolled list. */
  readonly scrollMargin?: Signal<number> | number;
  /** The scroll box, when the list scrolls inside one rather than the page. */
  readonly getScrollElement?: () => Element | null;
  /** Called when the virtual window reaches the last entry. */
  readonly onEndReached?: () => void;
  /** The injector to run in. Omit to use the current injection context. */
  readonly injector?: Injector;
}

/**
 * Virtualize an opaque keyed list (e.g. grouped flat entries). Same window /
 * element modes as {@link injectTableVirtualization}.
 *
 * @param options - See {@link KeyedVirtualizationOptions}.
 * @returns The window, as a signal.
 *
 * @public
 */
export function injectKeyedVirtualization(
  options: KeyedVirtualizationOptions
): Signal<KeyedVirtualization> {
  return injectKeyedVirtualizer(options).virtualization;
}

/**
 * {@link injectKeyedVirtualization}, plus the virtualizer's own scroll.
 *
 * @param options - See {@link KeyedVirtualizationOptions}.
 * @returns The window signal and a scroll helper.
 *
 * @public
 */
export function injectKeyedVirtualizer(options: KeyedVirtualizationOptions): {
  readonly virtualization: Signal<KeyedVirtualization>;
  readonly scrollToIndex: (index: number) => void;
} {
  if (!options.injector) assertInInjectionContext(injectKeyedVirtualizer);
  const injector = options.injector ?? inject(Injector);
  return runInInjectionContext(injector, () => {
    const enabled = (): boolean => readFlag(options.enabled, false);
    const estimateSize = (): ((index: number) => number) =>
      readEstimate(options.estimateSize, 56);
    const overscan = (): number =>
      readNumber(options.overscan, VIRTUAL_OVERSCAN);
    const scrollMargin = (): number => readNumber(options.scrollMargin, 0);
    const elementMode = options.getScrollElement !== undefined;
    const getItemKey = (index: number): string =>
      options.keys()[index] ?? String(index);

    const windowVirtualizer = injectWindowVirtualizer(() => ({
      count: options.keys().length,
      enabled: enabled() && !elementMode,
      estimateSize: estimateSize(),
      getItemKey,
      overscan: overscan(),
      scrollMargin: scrollMargin(),
    }));
    const elementVirtualizer = injectVirtualizer(() => ({
      count: options.keys().length,
      enabled: enabled() && elementMode,
      scrollElement: options.getScrollElement?.() ?? undefined,
      estimateSize: estimateSize(),
      getItemKey,
      overscan: overscan(),
    }));
    const activeVirtualizer = (): ActiveVirtualizer =>
      pickVirtualizer(elementMode, elementVirtualizer, windowVirtualizer);

    const endLatch = new EndReachedLatch();
    effect(() => {
      const items = activeVirtualizer().getVirtualItems();
      const active = enabled() && items.length > 0;
      if (endLatch.check(active, options.keys().length, items.at(-1)?.index)) {
        options.onEndReached?.();
      }
    });

    const virtualization = computed((): KeyedVirtualization => {
      const on = enabled();
      const items = activeVirtualizer().getVirtualItems().map(asItemMeta);
      const vz = activeVirtualizer();
      return keyedWindow({
        enabled: on,
        count: options.keys().length,
        virtualizer: {
          getTotalSize: () => vz.getTotalSize(),
          measureElement: (node) => {
            vz.measureElement(node);
          },
          options: { scrollMargin: scrollMargin() },
        },
        items: on && items.length > 0 ? items : [],
        estimateSize: estimateSize(),
      });
    });

    return {
      virtualization,
      scrollToIndex: (index) => {
        activeVirtualizer().scrollToIndex(index, {
          align: "center",
          behavior: "instant",
        });
      },
    };
  });
}
