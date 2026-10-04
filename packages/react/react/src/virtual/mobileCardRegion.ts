/** Keyboard and naming props for a native card scroll section. */
import type { CSSProperties, HTMLAttributes } from "react";

/**
 * Names the card region and includes its keyboard scroll stop only when bounded.
 * Keep these props on the native section that owns overflow, rather than on its
 * list or individual cards. The same focus contract applies to every UI kit.
 *
 * @public
 */
export function mobileCardRegionProps(
  requestedLabel: string | undefined,
  fallbackLabel: string,
  maxHeight: CSSProperties["maxHeight"]
): Pick<HTMLAttributes<HTMLElement>, "aria-label" | "tabIndex"> {
  const label = requestedLabel?.trim() ?? "";
  return {
    "aria-label": label.length > 0 ? label : fallbackLabel,
    tabIndex: maxHeight == null ? undefined : 0,
  };
}
