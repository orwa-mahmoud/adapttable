import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  UNPIN_ROW_ACTION_KEY,
} from "@adapttable/react";
import type { ReactNode } from "react";

interface IconProps {
  size?: number;
}

function Svg({ size = 16, children }: IconProps & { children: ReactNode }) {
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
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Funnel / filter icon for the Filters button. */
export const FiltersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </Svg>
);

/** Magnifying-glass search icon for the search field's prefix. */
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

/** Right-pointing chevron for the row-expansion toggles. */
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

/** Two stacked sheets — Ant Design CopyOutlined-ish. */
export const DuplicateRowIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="14" rx="1" />
    <path d="M16 8V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h4" />
  </Svg>
);

/** Outlined trash without inner stripes — Ant Design DeleteOutlined-ish. */
export const DeleteRowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6h14" />
    <path d="M10 6V4h4v2" />
    <path d="M6 6v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6" />
  </Svg>
);

/** Thumbtack — Ant Design PushpinOutlined-ish. */
export const PinTopIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 17v5" />
    <path d="M8 3h8l-1 6 3 3v2H6v-2l3-3z" />
  </Svg>
);

/** Thumbtack pointing down. */
export const PinBottomIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2v5" />
    <path d="M8 21h8l-1-6 3-3V10H6v2l3 3z" />
  </Svg>
);

/** Thumbtack with a slash. */
export const UnpinRowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 17v5" />
    <path d="M8 3h8l-1 6 3 3v2H6v-2l3-3z" />
    <path d="M4 4l16 16" />
  </Svg>
);

/** Three vertical dots — the row-actions menu trigger. */
export const MoreVerticalIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </Svg>
);

/**
 * Host `icon` wins. Built-in duplicate / delete / pin keys get this kit's
 * glyph so core can stay a key + label.
 */
export function iconForRowAction(
  action: Readonly<{ key: string; icon?: unknown }>
): ReactNode | undefined {
  return (
    (action.icon as ReactNode | undefined) ??
    {
      [DUPLICATE_ROW_ACTION_KEY]: <DuplicateRowIcon />,
      [DELETE_ROW_ACTION_KEY]: <DeleteRowIcon />,
      [PIN_TOP_ACTION_KEY]: <PinTopIcon />,
      [PIN_BOTTOM_ACTION_KEY]: <PinBottomIcon />,
      [UNPIN_ROW_ACTION_KEY]: <UnpinRowIcon />,
    }[action.key]
  );
}
