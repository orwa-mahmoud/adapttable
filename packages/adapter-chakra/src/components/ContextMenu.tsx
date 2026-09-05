import {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "@adapttable/react/adapter";
import {
  Button,
  Popover,
  Separator as ChakraSeparator,
} from "@chakra-ui/react";

import { KitPortal } from "./kitPortal";

/**
 * The kit's own overlay, opened at the point the pointer was.
 *
 * This kit builds its column menu on a Popover rather than a Menu
 * primitive, so the context menu follows it — same portalling, same
 * dismissal, same elevated surface its users already know. The trigger is a
 * zero-size element parked at the click point, because an overlay attaches
 * to an element and a right-click only has coordinates.
 *
 * `role="menu"` and the entries' `menuitem` roles are set here: a Popover
 * has no menu semantics of its own, and a list of actions that does not
 * announce itself as one is a menu only to people who can see it.
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
    <Popover.Root
      open
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
      positioning={{ placement: "bottom-start" }}
    >
      <Popover.Trigger asChild>
        <span aria-hidden="true" style={anchorStyle(at)} />
      </Popover.Trigger>
      <KitPortal>
        <Popover.Positioner>
          <Popover.Content
            role="menu"
            aria-label={label}
            className={className}
            data-adapttable-part="context-menu"
            minW="10rem"
            p={1}
          >
            {children}
          </Popover.Content>
        </Popover.Positioner>
      </KitPortal>
    </Popover.Root>
  );
}

function Item({ item, onSelect }: ContextMenuItemProps) {
  return (
    <Button
      role="menuitem"
      variant="ghost"
      size="sm"
      width="100%"
      justifyContent="flex-start"
      disabled={item.disabled}
      colorPalette={item.danger === true ? "red" : undefined}
      data-adapttable-part="context-menu-item"
      onClick={onSelect}
    >
      {item.label}
    </Button>
  );
}

function Separator() {
  return (
    <ChakraSeparator my={1} data-adapttable-part="context-menu-separator" />
  );
}

const slots: ContextMenuSlots = { Surface, Item, Separator };

/** chakra-owned right-click menu. */
export function ContextMenu(
  props: Readonly<Omit<ContextMenuChromeProps, "slots">>
) {
  return <ContextMenuChrome {...props} slots={slots} />;
}
