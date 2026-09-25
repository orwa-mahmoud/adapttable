/**
 * Package-local defaults. Adapters may override per-table via props; these
 * are the headless fallbacks.
 */

/** Viewport width (px) below which `"auto"` pagination flips to infinite. */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * Default rows-per-page.
 *
 * @public
 */
export const DEFAULT_LIMIT = 25;

/**
 * Page-size options offered by adapter pagination controls.
 *
 * @public
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Page-size options to render in a rows-per-page selector, guaranteeing every
 * given size is present. Pass the active `limit` alone, or `[limit,
 * defaultLimit]` so a host default (scale's 500, a shared-URL 15) stays
 * listed after the user picks 10 / 25 / 50 / 100 — otherwise it vanishes
 * and cannot be selected again.
 *
 * Off-list values are prepended in the order given, de-duplicated.
 *
 * @param limit - The currently-active page size, or several sizes that must
 *   stay listed (active + the table's default page size).
 * @param sizes - The standard options to offer (defaults to {@link PAGE_SIZE_OPTIONS}).
 * @returns The options to render, with every given size guaranteed present.
 *
 * @public
 */
export function pageSizeOptions(
  limit: number | readonly number[],
  sizes: readonly number[] = PAGE_SIZE_OPTIONS
): readonly number[] {
  const extras = (typeof limit === "number" ? [limit] : limit).filter(
    (n, i, all) => !sizes.includes(n) && all.indexOf(n) === i
  );
  return extras.length > 0 ? [...extras, ...sizes] : sizes;
}

/**
 * Default debounce (ms) for the search input before it commits to state.
 *
 * @public
 */
export const SEARCH_DEBOUNCE_MS = 300;

/** Default row-height estimate (px) for virtualized desktop tables. */
export const DEFAULT_ROW_SIZE_PX = 56;

/**
 * Default card-height estimate (px) for virtualized mobile layouts.
 *
 * @public
 */
export const DEFAULT_CARD_SIZE_PX = 132;

/** Default extra rows/cards rendered above and below the virtual window. */
export const VIRTUAL_OVERSCAN = 8;
