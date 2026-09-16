import {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "@adapttable/react/adapter";
import { DropdownMenu } from "@radix-ui/themes";

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
}: Readonly<ContextMenuSurfaceProps>) {
  return (
    <DropdownMenu.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DropdownMenu.Trigger>
        <span aria-hidden="true" style={anchorStyle(at)} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        aria-label={label}
        className={className}
        data-adapttable-part="context-menu"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function Item({ item, onSelect }: ContextMenuItemProps) {
  return (
    <DropdownMenu.Item
      disabled={item.disabled}
      color={item.danger === true ? "red" : undefined}
      data-adapttable-part="context-menu-item"
      onSelect={onSelect}
    >
      {item.label}
    </DropdownMenu.Item>
  );
}

function Separator() {
  return (
    <DropdownMenu.Separator data-adapttable-part="context-menu-separator" />
  );
}

const slots: ContextMenuSlots = { Surface, Item, Separator };

/** radix-owned right-click menu. */
export function ContextMenu(
  props: Readonly<Omit<ContextMenuChromeProps, "slots">>
) {
  return <ContextMenuChrome {...props} slots={slots} />;
}
