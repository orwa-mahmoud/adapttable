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

/** Hopper funnel with a neck — Base UI's Filters glyph. */
export function FiltersIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M12 3v3" />
      <path d="M5 8h14l-4 6H9L5 8z" />
      <path d="M10 14v6h4v-6" />
    </Svg>
  );
}

/** Page with a folded corner plus a second sheet. */
export function DuplicateRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M8 7h9v13H8z" />
      <path d="M8 7l4-4h5v4" />
      <path d="M6 9H5v12h9" />
    </Svg>
  );
}

/** Can with a handle on the lid. */
export function DeleteRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M3 7h18" />
      <path d="M8 7V3h8v4" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

/** Needle pin through a bar. */
export function PinTopIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M8 4h8" />
      <path d="M9 4v6l3 2 3-2V4" />
      <path d="M12 12v8" />
    </Svg>
  );
}

/** Needle pin through a bar at the bottom. */
export function PinBottomIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M8 20h8" />
      <path d="M9 20v-6l3-2 3 2v6" />
      <path d="M12 12V4" />
    </Svg>
  );
}

/** Needle pin with a slash. */
export function UnpinRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M8 4h8" />
      <path d="M9 4v6l3 2 3-2V4" />
      <path d="M12 12v8" />
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
