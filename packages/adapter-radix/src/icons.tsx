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

/** Pencil — the control that opens a row for editing. */
export function EditRowIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M2.5 12.5h2.5L12 6a1.4 1.4 0 0 0-2-2L3 10.5v2z" />
      <path d="M9.5 4.5l2 2" />
    </Svg>
  );
}

/** Check mark — the row-mode save control. */
export function SaveRowIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M3 8l3 3 6-6.5" />
    </Svg>
  );
}

/** Cross — the row-mode cancel control. */
export function CancelRowIcon({ size = 15 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="M3.5 3.5l8 8M11.5 3.5l-8 8" />
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

/**
 * The glyph this kit draws for a row-mode control.
 *
 * `icon` is the host's answer and wins: a node replaces the glyph, `false`
 * asks for the label as text. Only when the host said nothing does the kit
 * choose, by part.
 */
export function iconForRowEditPart(part: string, icon?: unknown): ReactNode {
  return icon === false
    ? undefined
    : ((icon as ReactNode | undefined) ??
        {
          "row-edit-begin": <EditRowIcon />,
          "row-edit-save": <SaveRowIcon />,
          "row-edit-cancel": <CancelRowIcon />,
        }[part]);
}
