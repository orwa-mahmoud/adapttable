/**
 * The SVG frame every Base UI glyph draws in, and the chevron the base table's
 * selects use. Kept apart from the feature icons so a plain table loads only
 * the glyph it draws.
 */
import type { ReactNode } from "react";

export interface IconProps {
  size?: number;
}

export function Svg({
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

/** Downward chevron: the open affordance on selects and disclosures. */
export function ChevronDownIcon({ size = 16 }: Readonly<IconProps>) {
  return (
    <Svg size={size}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}
