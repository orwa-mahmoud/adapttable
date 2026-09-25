/**
 * The two colours the table paints on top of the page: the opaque surface
 * behind sticky and pinned cells, and the hairline that separates rows and
 * underlines the header.
 *
 * These are read from CSS custom properties so an app whose surface is not
 * Mantine's body colour — a dark window chrome, a tinted panel, a modal — can
 * override them by declaring the variable on any ancestor:
 *
 * ```css
 * .my-panel { --adapttable-surface: #101418; }
 * ```
 *
 * They were inline literals before, and an inline style beats every consumer
 * stylesheet, so overriding meant `!important`. The Mantine values remain the
 * fallbacks, so rendering is unchanged for anyone who sets nothing.
 */

/** Opaque background behind sticky headers, pinned cells and the toolbar. */
export const SURFACE = "var(--adapttable-surface, var(--mantine-color-body))";

/** Hairline for row separators, the header underline and group headers. */
export const HAIRLINE =
  "var(--adapttable-header-border, var(--mantine-color-default-border))";
