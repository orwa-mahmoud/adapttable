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

function Svg({
  size = 16,
  children,
}: Readonly<IconProps & { children: ReactNode }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Sliders with knobs — Chakra's Filters glyph, not a copied funnel. */
export function FiltersIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M4 8h16" />
      <circle cx="8" cy="8" r="2.5" />
      <path d="M4 16h16" />
      <circle cx="16" cy="16" r="2.5" />
    </Svg>
  );
}

/** Overlapping rounded cards. */
export function DuplicateRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <rect x="7" y="7" width="13" height="13" rx="3" />
      <path d="M7 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

/** Rounded trash. */
export function DeleteRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M4 8h16" />
      <path d="M9 4h6" />
      <path d="M7 8v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8" />
      <path d="M10 12v5M14 12v5" />
    </Svg>
  );
}

/** Rounded pin head with a stem. */
export function PinTopIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v8" />
    </Svg>
  );
}

/** Pin head at the bottom. */
export function PinBottomIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="16" r="5" />
      <path d="M12 11V3" />
    </Svg>
  );
}

/** Pin with a slash. */
export function UnpinRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v8" />
      <path d="M4 4l16 16" />
    </Svg>
  );
}

/** Three vertical dots — the row-actions menu trigger. */
export function MoreVerticalIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </Svg>
  );
}

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
