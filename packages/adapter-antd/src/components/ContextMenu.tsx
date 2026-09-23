import {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "@adapttable/react/adapter";
import { Button, Divider, Popover } from "antd";

/**
 * The kit's own overlay, opened at the point the pointer was.
 *
 * This kit builds its column menu on a Popover rather than a Menu
 * primitive, so the context menu follows it — same portalling, same
 * dismissal, same elevated surface its users already know. The trigger is a
 * one-pixel element parked at the click point, because an overlay attaches
 * to an element and a right-click only has coordinates. antd places a
 * popover only beside an anchor that has a size, so the pixel is real,
 * transparent, and passes pointer events through.
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
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  }) as const;

function Surface({
  at,
  label,
  onClose,
  children,
  className,
}: Readonly<ContextMenuSurfaceProps>) {
  return (
    <Popover
      open
      trigger="click"
      placement="bottomLeft"
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      content={
        <div
          role="menu"
          aria-label={label}
          className={className}
          data-adapttable-part="context-menu"
          style={{ display: "flex", flexDirection: "column", minWidth: 160 }}
        >
          {children}
        </div>
      }
    >
      <span aria-hidden="true" style={anchorStyle(at)} />
    </Popover>
  );
}

function Item({ item, onSelect }: ContextMenuItemProps) {
  return (
    <Button
      type="text"
      role="menuitem"
      block
      danger={item.danger}
      disabled={item.disabled}
      style={{ textAlign: "start" }}
      data-adapttable-part="context-menu-item"
      onClick={onSelect}
    >
      {item.label}
    </Button>
  );
}

function Separator() {
  return (
    <Divider
      style={{ margin: "4px 0" }}
      data-adapttable-part="context-menu-separator"
    />
  );
}

const slots: ContextMenuSlots = { Surface, Item, Separator };

/** antd-owned right-click menu. */
export function ContextMenu(
  props: Readonly<Omit<ContextMenuChromeProps, "slots">>
) {
  return <ContextMenuChrome {...props} slots={slots} />;
}
