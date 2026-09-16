import {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "@adapttable/react/adapter";
import { Menu } from "@mantine/core";

/**
 * The kit's own menu, opened at the point the pointer was.
 *
 * Every kit's menu attaches to a trigger rather than to coordinates, so the
 * trigger is a zero-size element parked at the click point. The menu then
 * flips near an edge, portals, traps and restores focus exactly as that
 * kit's menus always do — which is why the chrome does not try to be a menu
 * itself.
 */
const anchorStyle = (at: { x: number; y: number }) =>
  ({
    position: "fixed",
    left: at.x,
    top: at.y,
    width: 0,
    height: 0,
  }) as const;

function Surface({
  at,
  label,
  onClose,
  children,
  className,
  container,
}: Readonly<ContextMenuSurfaceProps>) {
  return (
    <Menu
      opened
      onClose={onClose}
      position="bottom-start"
      withinPortal
      // Fullscreen hides the rest of the document, so the menu has to
      // portal inside the promoted element rather than onto the body.
      portalProps={container ? { target: container } : undefined}
    >
      <Menu.Target>
        <span aria-hidden="true" style={anchorStyle(at)} />
      </Menu.Target>
      <Menu.Dropdown
        aria-label={label}
        className={className}
        data-adapttable-part="context-menu"
      >
        {children}
      </Menu.Dropdown>
    </Menu>
  );
}

function Item({ item, onSelect }: ContextMenuItemProps) {
  return (
    <Menu.Item
      disabled={item.disabled}
      color={item.danger === true ? "red" : undefined}
      data-adapttable-part="context-menu-item"
      onClick={onSelect}
    >
      {item.label}
    </Menu.Item>
  );
}

function Separator() {
  return <Menu.Divider data-adapttable-part="context-menu-separator" />;
}

const slots: ContextMenuSlots = { Surface, Item, Separator };

/** mantine-owned right-click menu. */
export function ContextMenu(
  props: Readonly<Omit<ContextMenuChromeProps, "slots">>
) {
  return <ContextMenuChrome {...props} slots={slots} />;
}
