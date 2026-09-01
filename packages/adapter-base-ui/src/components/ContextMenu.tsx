import {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "@adapttable/core/adapter";
import { Popover } from "@base-ui/react/popover";

import { Button } from "../ui";

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
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Popover.Trigger
        render={<span aria-hidden="true" style={anchorStyle(at)} />}
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start">
          <Popover.Popup
            role="menu"
            aria-label={label}
            className={className}
            data-adapttable-part="context-menu"
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 160,
              padding: 4,
              background: "var(--at-surface, #fff)",
              border: "1px solid var(--at-border, #d0d7de)",
              borderRadius: 8,
            }}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Item({ item, onSelect }: ContextMenuItemProps) {
  return (
    <Button
      role="menuitem"
      variant="ghost"
      size="1"
      disabled={item.disabled}
      color={item.danger === true ? "red" : undefined}
      data-adapttable-part="context-menu-item"
      onClick={onSelect}
    >
      {item.label}
    </Button>
  );
}

function Separator() {
  return (
    <hr
      data-adapttable-part="context-menu-separator"
      style={{ margin: "4px 0", border: 0, borderTop: "1px solid #e5e7eb" }}
    />
  );
}

const slots: ContextMenuSlots = { Surface, Item, Separator };

/** base-ui-owned right-click menu. */
export function ContextMenu(
  props: Readonly<Omit<ContextMenuChromeProps, "slots">>
) {
  return <ContextMenuChrome {...props} slots={slots} />;
}
