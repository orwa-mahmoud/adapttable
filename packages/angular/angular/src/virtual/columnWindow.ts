/**
 * Windowed columns, for tables that are wide rather than long.
 *
 * Only the columns scrolled into view render, plus a margin; two spacer cells
 * hold the rest open. Pinned columns always render, and the spacers are
 * logical (leading / trailing), so a wide RTL table scrolls correctly.
 */
import {
  type ColumnDef,
  type MaybeSignal,
  readMaybe,
} from "@adapttable/angular";
import {
  type ColumnViewport,
  columnWindowPlan,
  readColumnViewport,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  signal,
} from "@angular/core";

/**
 * Options for {@link injectColumnWindow}.
 *
 * @public
 */
export interface ColumnWindowOptions<TRow> {
  /** The columns as rendered, in order. */
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  /** Off unless the host asked for it. */
  readonly enabled: MaybeSignal<boolean>;
  /** Measured or declared widths, by column key. */
  readonly widths?: Signal<Readonly<Record<string, number>> | undefined>;
  /** Keys that are pinned, and so always rendered. */
  readonly pinnedKeys?: Signal<ReadonlySet<string> | undefined>;
  /** The horizontal scroll container, read as a signal. */
  readonly getScrollElement: () => HTMLElement | null;
  /** Columns to render either side of the visible span. Defaults to 3. */
  readonly overscan?: number;
  /** The injector whose lifetime the listeners follow. */
  readonly injector?: Injector;
}

/**
 * The windowed columns and the space the rest occupies.
 *
 * @public
 */
export interface ColumnWindow<TRow> {
  /** Whether the columns are a window rather than everything. */
  readonly enabled: boolean;
  /** The columns to render, pinned ones included. */
  readonly columns: readonly ColumnDef<TRow>[];
  /** Width of the spacer before the window, in pixels. */
  readonly paddingStart: number;
  /** Width of the spacer after it. */
  readonly paddingEnd: number;
}

/**
 * Window a table's columns to what is scrolled into view.
 *
 * @param options - See {@link ColumnWindowOptions}.
 * @returns The window; every column and no spacers when disabled.
 *
 * @public
 */
export function injectColumnWindow<TRow>(
  options: ColumnWindowOptions<TRow>
): Signal<ColumnWindow<TRow>> {
  if (!options.injector) assertInInjectionContext(injectColumnWindow);
  const injector = options.injector ?? inject(Injector);
  const viewport = signal<ColumnViewport>(
    { start: 0, width: 0 },
    {
      equal: (left, right) =>
        left.start === right.start && left.width === right.width,
    }
  );
  effect(
    (onCleanup) => {
      if (!readMaybe(options.enabled)) return;
      const element = options.getScrollElement();
      if (!element) return;
      const read = (): void => {
        viewport.set(readColumnViewport(element));
      };
      read();
      element.addEventListener("scroll", read, { passive: true });
      const observer =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
      observer?.observe(element);
      onCleanup(() => {
        element.removeEventListener("scroll", read);
        observer?.disconnect();
      });
    },
    { injector }
  );
  return computed(() =>
    columnWindowPlan({
      columns: options.columns(),
      enabled: readMaybe(options.enabled),
      viewport: viewport(),
      widths: options.widths?.(),
      pinnedKeys: options.pinnedKeys?.(),
      overscan: options.overscan,
    })
  );
}
