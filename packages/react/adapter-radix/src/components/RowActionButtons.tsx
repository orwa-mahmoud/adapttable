/** A row's actions, decided by the binding and drawn with Radix's controls. */
import {
  createRowActionButtons,
  type KitRowActionMenuProps,
  type KitRowActionProps,
} from "@adapttable/react/adapter";
import { Button, DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import type { ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import { useAccentColor } from "./accent";
import { usePortalContainer } from "./portalContainer";
import { Tooltip } from "./primitives";

const targetOf = (size: number | undefined) => ({
  minWidth: size,
  minHeight: size,
});

/** One action: a glyph or a caption, explaining itself in a tooltip. */
function Action({
  label,
  icon,
  disabled,
  reason,
  minTargetSize,
  onClick,
}: Readonly<KitRowActionProps>) {
  const accent = useAccentColor();
  const shared = {
    size: "1",
    variant: "ghost",
    disabled,
    style: targetOf(minTargetSize),
    "data-adapttable-part": "action-button",
    onClick,
  } as const;
  return (
    <Tooltip label={reason ?? label}>
      {icon ? (
        <IconButton {...shared} color={accent ?? "gray"} aria-label={label}>
          {icon}
        </IconButton>
      ) : (
        <Button {...shared} color={accent}>
          {label}
        </Button>
      )}
    </Tooltip>
  );
}

function Strip({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <Flex gap="1" justify="end">
      {children}
    </Flex>
  );
}

function Menu({
  label,
  minTargetSize,
  items,
}: Readonly<KitRowActionMenuProps>) {
  const portalContainer = usePortalContainer();
  const accent = useAccentColor();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          size="1"
          variant="ghost"
          color={accent ?? "gray"}
          aria-label={label}
          style={targetOf(minTargetSize)}
          data-adapttable-part="row-actions-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVerticalIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        container={portalContainer}
        data-adapttable-part="row-actions-menu"
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item) => (
          <DropdownMenu.Item
            key={item.key}
            disabled={item.disabled}
            color={item.color === "red" ? "red" : undefined}
            style={targetOf(item.minTargetSize)}
            data-adapttable-part="action-button"
            title={item.reason}
            onSelect={item.onSelect}
          >
            {item.icon}
            {item.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

/** A row's actions as Radix buttons or one menu. */
export const RowActionButtons = /* @__PURE__ */ createRowActionButtons({
  Action,
  Strip,
  Menu,
  iconFor: iconForRowAction,
});
