/**
 * Touch-sized controls inside the mobile cards.
 *
 * The cards wrap their rows in {@link MobileTarget}; a control that sits in a
 * row reads {@link useMobileTarget} and grows to a 44 px target there, while
 * the same control in the desktop table keeps its kit's size.
 */
import { createContext, type CSSProperties, useContext } from "react";

/**
 * Whether the controls below sit in a mobile card.
 *
 * @public
 */
export const MobileTarget = /* @__PURE__ */ createContext(false);

const TOUCH_TARGET: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  flexShrink: 0,
};

/**
 * The touch-target style for a control in a mobile card, or nothing on
 * desktop.
 *
 * @public
 */
export function useMobileTarget(): CSSProperties | undefined {
  return useContext(MobileTarget) ? TOUCH_TARGET : undefined;
}
