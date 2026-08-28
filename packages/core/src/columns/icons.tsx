import type { ReactElement } from "react";

/**
 * Shared column-menu glyphs (currentColor, no icon-lib dependency) so every
 * adapter's column popover looks identical: a drag grip, an eye visibility
 * toggle, and a pin.
 */

/**
 * Six-dot drag grip.
 *
 * @internal
 */
export function GripIcon(): ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="9" cy="6" r="1.6" />
        <circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" />
        <circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" />
        <circle cx="15" cy="18" r="1.6" />
      </g>
    </svg>
  );
}

/**
 * Eye (visible) / eye with slash (hidden) toggle glyph.
 *
 * @internal
 */
export function EyeIcon({
  off = false,
}: Readonly<{ off?: boolean }>): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

/**
 * Pin glyph.
 *
 * @internal
 */
export function PinIcon(): ReactElement {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />
      <path d="M12 15v5" />
    </svg>
  );
}
