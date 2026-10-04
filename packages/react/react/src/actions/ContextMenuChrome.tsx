/**
 * The context menu itself: the entries, in order, inside the kit's own menu.
 *
 * What this deliberately does NOT do is manage focus. Every kit here ships a
 * menu primitive that already does — MUI's `Menu`, Mantine's, antd's
 * `Dropdown`, Radix's and Base UI's menus, and a native `<dialog>`-less
 * fallback in unstyled — and each of them handles the roving tab stop, the
 * typeahead, the portal, the z-index and the outside click the way its own
 * users expect. A second implementation layered on top would fight all of
 * them, which is the same trap the filters popover documents.
 *
 * So the division is: core decides WHAT is in the menu and in what order,
 * names the parts, and settles the one ordering question a kit would get
 * wrong — a menu closes before its entry runs, never after. The kit decides
 * how a menu looks and behaves, because that is what its users installed it
 * for.
 *
 * Closing before running matters more than it looks. An entry that opens a
 * dialog, moves focus, or re-renders the row underneath it will do so while
 * the menu is still mounted otherwise, and the menu's own focus restoration
 * then fights whatever the action just did.
 */

import type {
  ContextMenuChromeProps as NeutralContextMenuChromeProps,
  ContextMenuSlots as NeutralContextMenuSlots,
  ContextMenuSurfaceProps as NeutralContextMenuSurfaceProps,
} from "@adapttable/core/binding";
import { Fragment, type ReactNode, useRef } from "react";

export type { ContextMenuPoint } from "./useContextMenu";
export type { ContextMenuItem } from "@adapttable/core";
export type { ContextMenuItemProps } from "@adapttable/core/binding";

/**
 * Props an adapter's menu surface receives — `@adapttable/core`'s
 * `ContextMenuSurfaceProps` drawing React nodes.
 *
 * @public
 */
export type ContextMenuSurfaceProps = NeutralContextMenuSurfaceProps<ReactNode>;

/**
 * Adapter-owned rendering for {@link ContextMenuChrome} —
 * `@adapttable/core`'s `ContextMenuSlots` drawing React nodes.
 *
 * @public
 */
export type ContextMenuSlots = NeutralContextMenuSlots<ReactNode>;

/**
 * What the context menu needs to render — `@adapttable/core`'s
 * `ContextMenuChromeProps` with React's slots.
 *
 * @public
 */
export type ContextMenuChromeProps = NeutralContextMenuChromeProps<ReactNode>;

/**
 * Renders the open context menu, or nothing.
 *
 * @param props - The entries, where they were opened, and the kit's slots.
 * @returns The menu.
 *
 * @public
 */
export function ContextMenuChrome(props: Readonly<ContextMenuChromeProps>) {
  const { at, items, onClose, slots } = props;
  const anchorRef = useRef<HTMLElement | null>(null);
  if (!at || items.length === 0) return null;
  return (
    <>
      {/* The anchor. Fixed rather than absolute because the coordinates
          came from a pointer event and are viewport-relative; zero-size and
          `pointer-events: none` so it can never take a click of its own. */}
      <span
        ref={anchorRef}
        aria-hidden="true"
        data-adapttable-part="context-menu-anchor"
        style={{
          position: "fixed",
          left: at.x,
          top: at.y,
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      />
      <slots.Surface
        at={at}
        anchorRef={anchorRef}
        label={props.labels?.contextMenu ?? "Table actions"}
        onClose={onClose}
        container={props.container}
        className={props.className}
      >
        {items.map((item) => (
          // A Fragment, not an element: anything between `role="menu"` and
          // its items breaks the menu's own keyboard navigation, and every
          // kit's menu relies on that structure being exactly what it looks
          // like. The part name goes on the kit's entry, not on a wrapper.
          <Fragment key={item.key}>
            {item.separatorBefore === true && <slots.Separator />}
            <slots.Item
              item={item}
              onSelect={() => {
                // Close first. An entry that opens a dialog or moves focus
                // would otherwise do it under a menu that is still mounted,
                // and the menu's own focus restoration undoes the action's.
                onClose();
                item.onSelect();
              }}
            />
          </Fragment>
        ))}
      </slots.Surface>
    </>
  );
}
