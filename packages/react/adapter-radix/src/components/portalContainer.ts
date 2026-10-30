import { createContext, useContext } from "react";

const PortalContainerContext = createContext<HTMLElement | undefined>(
  undefined
);

/**
 * Supplies the element every overlay under the table portals into.
 *
 * The Fullscreen API hides the rest of the document, `document.body`
 * included, so a popover, menu, select, dialog or tooltip portalled there
 * would open invisibly while the table is fullscreen. Radix Themes takes the
 * target per overlay, so each one reads it from here.
 */
export const PortalContainerProvider = PortalContainerContext.Provider;

/** The fullscreen element while the table is fullscreen, otherwise undefined. */
export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext);
}
