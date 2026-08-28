import type { ReactElement } from "react";

/**
 * Shared chrome glyphs (currentColor, no icon-lib dependency) used by the
 * toolbar across adapters — a funnel for the Filters button and a magnifier
 * for the search field. Centralising them keeps every adapter's toolbar
 * identical and avoids cross-adapter duplication of the SVG markup.
 */

/**
 * Three-line funnel glyph for the Filters button.
 *
 * @internal
 */
export function FiltersIcon(): ReactElement {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

/**
 * Magnifier glyph for the search field.
 *
 * @internal
 */
export function SearchIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

/**
 * Inline expand chevron: points into the row (flipped for RTL) and rotates to
 * point down while the detail panel is open. Shared by every adapter's
 * desktop row + mobile card so the expand affordance is identical.
 *
 * @internal
 */
export function ExpandChevron({
  open,
  dir,
}: Readonly<{ open: boolean; dir?: "rtl" | "ltr" }>): ReactElement {
  let transform: string | undefined;
  if (open) transform = "rotate(90deg)";
  else if (dir === "rtl") transform = "rotate(180deg)";
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      style={{ transform, transition: "transform 0.2s ease" }}
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
