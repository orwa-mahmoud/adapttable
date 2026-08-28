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
import { Fragment, type ReactNode, type RefObject, useRef } from "react";

import type { TableLabels } from "../types";
import type { ContextMenuItem } from "./contextMenuModel";
import type { ContextMenuPoint } from "./useContextMenu";

/**
 * Props an adapter's menu surface receives.
 *
 * @public
 */
export interface ContextMenuSurfaceProps {
  /** Where the menu was opened, in viewport coordinates. */
  readonly at: ContextMenuPoint;
  /**
   * A zero-size element sitting at exactly that point.
   *
   * Every kit's menu anchors to an ELEMENT, not to coordinates — that is
   * how it decides which way to flip near an edge and where to portal to.
   * A right-click has coordinates and no element, so core puts one there.
   * Anchor the kit's menu to this and its positioning, flipping and
   * collision handling all work the way that kit's users expect.
   */
  readonly anchorRef: RefObject<HTMLElement | null>;
  /** The accessible name for the menu. */
  readonly label: string;
  /** Close it — bind to the kit's own dismiss channel. */
  readonly onClose: () => void;
  /** Where the kit must portal while fullscreen; `undefined` otherwise. */
  readonly container?: HTMLElement;
  /** The entries, already rendered through the Item and Separator slots. */
  readonly children: ReactNode;
  /** Class for the element. */
  readonly className?: string;
}

/**
 * Props an adapter's menu entry receives.
 *
 * @public
 */
export interface ContextMenuItemProps {
  readonly item: ContextMenuItem;
  /**
   * Bind this rather than `item.onSelect`: it closes the menu first, which
   * an entry that opens a dialog or moves focus depends on.
   */
  readonly onSelect: () => void;
}

/**
 * Adapter-owned rendering for {@link ContextMenuChrome}.
 *
 * @public
 */
export interface ContextMenuSlots {
  /** The kit's menu, positioned at the point it was opened from. */
  readonly Surface: (props: ContextMenuSurfaceProps) => ReactNode;
  /** One entry. */
  readonly Item: (props: ContextMenuItemProps) => ReactNode;
  /** The divider between groups of entries. */
  readonly Separator: () => ReactNode;
}

/**
 * What the context menu needs to render.
 *
 * @public
 */
export interface ContextMenuChromeProps {
  /** The entries. Nothing renders when this is empty. */
  items: readonly ContextMenuItem[];
  /** Where it was opened, or `null` when it is closed. */
  at: ContextMenuPoint | null;
  /** Close it, putting focus back where it came from. */
  onClose: () => void;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** A kit's own class for the menu. */
  className?: string;
  /**
   * Where to portal while the table is fullscreen.
   *
   * The Fullscreen API hides everything outside the promoted element, so a
   * menu portalled to `document.body` is mounted, focused and invisible.
   * `shell.fullscreen.container` is that element while it is on.
   */
  container?: HTMLElement;
  /** Adapter-owned visible components. */
  slots: ContextMenuSlots;
}

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
