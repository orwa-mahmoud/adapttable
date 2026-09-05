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
  strokeWidth = 1.8,
  children,
}: Readonly<IconProps & { strokeWidth?: number; children: ReactNode }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Funnel for the Filters button — same glyph the header trigger uses. */
export function FiltersIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
    </Svg>
  );
}

/** Material-style content copy. */
export function DuplicateRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

/** Material-style delete — straight can, lid, no inner stripes. */
export function DeleteRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M4 7h16" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M9 7V5h6v2" />
    </Svg>
  );
}

/** Material push-pin pointing down. */
export function PinTopIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M16 3c-1 2-2 3.5-4 4.5S8 7 7 5" />
      <path d="M7 5l10 10" />
      <path d="M12 12v9" />
      <path d="M9 15h6" />
    </Svg>
  );
}

/** Material push-pin pointing up. */
export function PinBottomIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M8 21c1-2 2-3.5 4-4.5s4 .5 5 2.5" />
      <path d="M17 19L7 9" />
      <path d="M12 12V3" />
      <path d="M9 9h6" />
    </Svg>
  );
}

/** Material push-pin with a slash. */
export function UnpinRowIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M16 3c-1 2-2 3.5-4 4.5S8 7 7 5" />
      <path d="M7 5l10 10" />
      <path d="M12 12v9" />
      <path d="M9 15h6" />
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
