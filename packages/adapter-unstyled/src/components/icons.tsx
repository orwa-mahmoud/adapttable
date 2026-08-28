import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  UNPIN_ROW_ACTION_KEY,
} from "@adapttable/core";
import type { ReactNode } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({
  size = 16,
  className,
  children,
}: Readonly<IconProps & { children: ReactNode }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/**
 * Magnifying-glass search glyph (inline SVG, `currentColor`).
 *
 * @public
 */
export const SearchIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

/**
 * Funnel glyph for the Filters button (inline SVG, `currentColor`).
 *
 * @public
 */
export const FiltersIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
  </Svg>
);

/**
 * Right-pointing chevron (▸) for the expand-row button. The button carries a
 * `data-expanded` attribute so consumers rotate the glyph with their own CSS
 * (e.g. `[data-expanded] svg { transform: rotate(90deg) }`).
 */
export const ChevronIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

/** Two offset rectangles. */
export const DuplicateRowIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="1.5" />
    <rect x="4" y="4" width="11" height="11" rx="1.5" />
  </Svg>
);

/** Trash with a single inner line. */
export const DeleteRowIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <path d="M5 7h14" />
    <path d="M9 7V5h6v2" />
    <path d="M7 7v12h10V7" />
    <path d="M12 11v5" />
  </Svg>
);

/** Three vertical dots — the row-actions menu trigger. */
export const MoreVerticalIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </Svg>
);

/** Map-pin drop pointing down (pin to top of the list). */
export const PinTopIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10z" />
    <circle cx="12" cy="11" r="2" />
  </Svg>
);

/** Map-pin drop pointing up (pin to bottom of the list). */
export const PinBottomIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <path d="M12 3s6 5.4 6 10a6 6 0 1 1-12 0c0-4.6 6-10 6-10z" />
    <circle cx="12" cy="13" r="2" />
  </Svg>
);

/** Map pin with a slash. */
export const UnpinRowIcon = (p: Readonly<IconProps>) => (
  <Svg {...p}>
    <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10z" />
    <circle cx="12" cy="11" r="2" />
    <path d="M4 4l16 16" />
  </Svg>
);

/**
 * Host `icon` wins. Built-in duplicate / delete / pin keys get this kit's
 * glyph so core can stay a key + label.
 */
export function iconForRowAction(
  action: Readonly<{ key: string; icon?: ReactNode }>
): ReactNode | undefined {
  return (
    action.icon ??
    {
      [DUPLICATE_ROW_ACTION_KEY]: <DuplicateRowIcon />,
      [DELETE_ROW_ACTION_KEY]: <DeleteRowIcon />,
      [PIN_TOP_ACTION_KEY]: <PinTopIcon />,
      [PIN_BOTTOM_ACTION_KEY]: <PinBottomIcon />,
      [UNPIN_ROW_ACTION_KEY]: <UnpinRowIcon />,
    }[action.key]
  );
}
