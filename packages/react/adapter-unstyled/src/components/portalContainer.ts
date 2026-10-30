import { createContext, useContext } from "react";

const PortalContainerContext = createContext<HTMLElement | undefined>(
  undefined
);

/**
 * Supplies the element every overlay under the table portals into.
 *
 * The Fullscreen API hides the rest of the document, `document.body`
 * included, so a popover, menu or drawer portalled there
 * would open invisibly while the table is fullscreen. Each portal the table
 * opens reads its target from here.
 */
export const PortalContainerProvider = PortalContainerContext.Provider;

/** The fullscreen element while the table is fullscreen, otherwise undefined. */
export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext);
}
