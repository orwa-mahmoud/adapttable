/** A row's actions, decided by the binding and drawn with Base UI's controls. */
import {
  createRowActionButtons,
  type KitRowActionMenuProps,
  type KitRowActionProps,
} from "@adapttable/react/adapter";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import { Button, Flex, IconButton } from "../ui";
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
  color,
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
        <IconButton
          {...shared}
          color={color ?? accent ?? "gray"}
          aria-label={label}
        >
          {icon}
        </IconButton>
      ) : (
        <Button {...shared} color={color ?? accent}>
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

const MENU_POPUP = {
  minWidth: 160,
  padding: 4,
  background: "var(--at-surface, #fff)",
  border: "1px solid var(--at-border, #d0d7de)",
  borderRadius: 8,
} as const;

function Menu({
  label,
  minTargetSize,
  items,
}: Readonly<KitRowActionMenuProps>) {
  const portalContainer = usePortalContainer();
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        render={
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            aria-label={label}
            style={targetOf(minTargetSize)}
            data-adapttable-part="row-actions-trigger"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVerticalIcon />
          </IconButton>
        }
      />
      <BaseMenu.Portal container={portalContainer}>
        <BaseMenu.Positioner side="bottom" align="end">
          <BaseMenu.Popup
            data-adapttable-part="row-actions-menu"
            style={MENU_POPUP}
            onClick={(event) => event.stopPropagation()}
          >
            {items.map((item) => (
              <BaseMenu.Item
                key={item.key}
                disabled={item.disabled}
                data-adapttable-part="action-button"
                title={item.reason}
                onClick={item.onSelect}
                style={{
                  ...targetOf(item.minTargetSize),
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  width: "100%",
                  padding: "6px 8px",
                  color: item.color === "red" ? "#c10007" : undefined,
                }}
              >
                {item.icon}
                {item.label}
              </BaseMenu.Item>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

/** A row's actions as Base UI buttons or one menu. */
export const RowActionButtons = /* @__PURE__ */ createRowActionButtons({
  Action,
  Strip,
  Menu,
  iconFor: iconForRowAction,
});
