/**
 * A polite live region — the one way this library says something out loud.
 *
 * The details are easy to get subtly wrong and invisible when they are:
 * `aria-live="polite"` so it waits for a gap rather than interrupting,
 * `aria-atomic` so the whole phrase is read rather than the diff, and visually
 * hidden by clip rather than `display: none` — a hidden element is not
 * announced at all, which is the classic way this ships broken.
 *
 * The region must also be in the DOM **before** it has anything to say. A
 * region that appears at the same moment as its text is frequently missed
 * entirely, so callers render it empty from the first paint rather than
 * conditionally when a message exists.
 */
import type { ReactElement } from "react";

/** Props for {@link LiveRegion}. */
export interface LiveRegionProps {
  /** What to announce. Empty until there is something. */
  children: string;
  /** `data-adapttable-part`, so a test or a style can find this one. */
  part: string;
  /**
   * Whether this region also claims `role="status"`. It is the default because
   * a status role IS a polite atomic live region, and most callers are the only
   * one on screen. Pass `false` for a region that is present on every table:
   * `aria-live` alone announces identically, and a second permanent status role
   * would make "the table's status" ambiguous to anything that looks for one —
   * assistive technology and tests alike.
   */
  statusRole?: boolean;
}

/**
 * Clipped rather than hidden: a screen reader ignores `display: none` and
 * `visibility: hidden`, so the region has to remain in the layout while taking
 * no visible space.
 */
const VISUALLY_HIDDEN = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/**
 * Announce a message politely, showing nothing.
 *
 * @param props - See {@link LiveRegionProps}.
 */
export function LiveRegion({
  children,
  part,
  statusRole = true,
}: Readonly<LiveRegionProps>): ReactElement {
  // `<output>` IS the status role, so the element carries the semantics instead
  // of an attribute restating them. The region that is present on every table
  // stays a plain `<div>` on purpose: it must announce without becoming a second
  // permanent status landmark beside the empty state and the feature announcers.
  const props = {
    "aria-live": "polite",
    "aria-atomic": "true",
    "data-adapttable-part": part,
    style: VISUALLY_HIDDEN,
  } as const;
  return statusRole ? (
    <output {...props}>{children}</output>
  ) : (
    <div {...props}>{children}</div>
  );
}
