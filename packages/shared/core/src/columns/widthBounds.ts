/**
 * Shared column-width limits.
 *
 * Auto-size and resize both clamp to these. They live here so neither
 * module has to import the other to know the bounds.
 */

/** Minimum column width (px) a resize or auto-size will not go below. */
export const MIN_COLUMN_WIDTH = 60;

/**
 * Upper bound for a persisted or measured column width — generous enough
 * for any real drag on an ultra-wide display, tight enough that a hostile
 * `colW=1e9` cannot blow the layout.
 */
export const MAX_COLUMN_WIDTH = 4000;
