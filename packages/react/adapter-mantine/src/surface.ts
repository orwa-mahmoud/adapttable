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

/**
 * Paint for a pinned body cell: the opaque surface, with the row's hover tint
 * layered on top while {@link PIN_HOVER_CSS} sets `--adapttable-pin-tint`, so
 * a pinned cell lights up with the rest of its row.
 */
export const PINNED_BODY_PAINT = `linear-gradient(var(--adapttable-pin-tint, transparent), var(--adapttable-pin-tint, transparent)), ${SURFACE}`;

/** Class on the table that scopes {@link PIN_HOVER_CSS} to its own rows. */
export const PIN_HOVER_CLASS = "adapttable-mantine-table";

/** Hands Mantine's row hover colour to the row's pinned cells. */
export const PIN_HOVER_CSS = `@media (hover: hover){.${PIN_HOVER_CLASS}>tbody>tr[data-hover]:hover>td{--adapttable-pin-tint:var(--tr-hover-bg)}}@media (hover: none){.${PIN_HOVER_CLASS}>tbody>tr[data-hover]:active>td{--adapttable-pin-tint:var(--tr-hover-bg)}}`;

/** Hairline for row separators, the header underline and group headers. */
export const HAIRLINE =
  "var(--adapttable-header-border, var(--mantine-color-default-border))";

/**
 * A cell inside the selected range: Mantine's light primary fill under a 1px
 * primary outline, so the range is drawn by an outline as well as a colour.
 */
export const SELECTED_CELL_STYLE = {
  background: "var(--mantine-primary-color-light)",
  outline: "1px solid var(--mantine-primary-color-filled)",
  outlineOffset: "-1px",
} as const;
