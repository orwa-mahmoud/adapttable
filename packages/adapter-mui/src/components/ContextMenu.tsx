import {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "@adapttable/react/adapter";
import { Divider, Menu, MenuItem } from "@mui/material";

/**
 * The kit's own menu, opened at the point the pointer was.
 *
 * Every kit's menu attaches to a trigger rather than to coordinates, so the
 * trigger is a zero-size element parked at the click point. The menu then
 * flips near an edge, portals, traps and restores focus exactly as that
 * kit's menus always do — which is why the chrome does not try to be a menu
 * itself.
 */
function Surface({
  at,
  label,
  onClose,
  children,
  className,
}: Readonly<ContextMenuSurfaceProps>) {
  return (
    <Menu
      open
      anchorReference="anchorPosition"
      anchorPosition={{ top: at.y, left: at.x }}
      onClose={onClose}
      className={className}
      data-adapttable-part="context-menu"
      slotProps={{ list: { "aria-label": label, dense: true } }}
    >
      {children}
    </Menu>
  );
}

function Item({ item, onSelect }: ContextMenuItemProps) {
  return (
    <MenuItem
      disabled={item.disabled}
      data-adapttable-part="context-menu-item"
      sx={item.danger === true ? { color: "error.main" } : undefined}
      onClick={onSelect}
    >
      {item.label}
    </MenuItem>
  );
}

function Separator() {
  return <Divider data-adapttable-part="context-menu-separator" />;
}

const slots: ContextMenuSlots = { Surface, Item, Separator };

/** mui-owned right-click menu. */
export function ContextMenu(
  props: Readonly<Omit<ContextMenuChromeProps, "slots">>
) {
  return <ContextMenuChrome {...props} slots={slots} />;
}
