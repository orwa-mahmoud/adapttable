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
  size = 15,
  children,
}: Readonly<IconProps & { children: ReactNode }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Geometric funnel — Radix-sharp corners, not the shared filled path. */
export function FiltersIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M2 3h11L9 8v4H6V8z" />
    </Svg>
  );
}

/** Offset squares. */
export function DuplicateRowIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <rect x="5.5" y="5.5" width="7" height="7" />
      <path d="M3.5 9.5H2.5V2.5H9.5V3.5" />
    </Svg>
  );
}

/** Angular trash. */
export function DeleteRowIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M2.5 4.5h10" />
      <path d="M5.5 4.5V3h4v1.5" />
      <path d="M4 4.5v8h7v-8" />
    </Svg>
  );
}

/** Chevron-pin pointing down. */
export function PinTopIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M7.5 1.5 11 6H4z" />
      <path d="M7.5 6v8" />
    </Svg>
  );
}

/** Chevron-pin pointing up. */
export function PinBottomIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M7.5 13.5 4 9h7z" />
      <path d="M7.5 9V1" />
    </Svg>
  );
}

/** Chevron-pin with a slash. */
export function UnpinRowIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M7.5 1.5 11 6H4z" />
      <path d="M7.5 6v8" />
      <path d="M2 2l11 11" />
    </Svg>
  );
}

/** Three vertical dots — the row-actions menu trigger. */
export function MoreVerticalIcon({ size = 15 }: Readonly<IconProps>) {
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
