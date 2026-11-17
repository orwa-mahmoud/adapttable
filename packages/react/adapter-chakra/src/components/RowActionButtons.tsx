/** A row's actions, decided by the binding and drawn with Chakra's controls. */
import {
  createRowActionButtons,
  type KitRowActionMenuProps,
  type KitRowActionProps,
} from "@adapttable/react/adapter";
import {
  Button,
  HStack,
  IconButton,
  Menu as ChakraMenu,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import { useAccentColor } from "./accent";
import { KitPortal } from "./kitPortal";
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
    size: "sm",
    variant: "ghost",
    colorPalette: color ?? accent,
    disabled,
    style: targetOf(minTargetSize),
    "data-adapttable-part": "action-button",
    onClick,
  } as const;
  return (
    <Tooltip label={reason ?? label}>
      {icon ? (
        <IconButton {...shared} aria-label={label}>
          {icon}
        </IconButton>
      ) : (
        <Button {...shared}>{label}</Button>
      )}
    </Tooltip>
  );
}

function Strip({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <HStack gap={1} justify="flex-end">
      {children}
    </HStack>
  );
}

function Menu({
  label,
  minTargetSize,
  items,
}: Readonly<KitRowActionMenuProps>) {
  const accent = useAccentColor();
  return (
    <ChakraMenu.Root positioning={{ placement: "bottom-end" }}>
      <ChakraMenu.Trigger asChild>
        <IconButton
          size="sm"
          variant="ghost"
          colorPalette={accent}
          aria-label={label}
          style={targetOf(minTargetSize)}
          data-adapttable-part="row-actions-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVerticalIcon />
        </IconButton>
      </ChakraMenu.Trigger>
      <KitPortal>
        <ChakraMenu.Positioner>
          <ChakraMenu.Content
            data-adapttable-part="row-actions-menu"
            onClick={(event) => event.stopPropagation()}
          >
            {items.map((item) => (
              <ChakraMenu.Item
                key={item.key}
                value={item.key}
                disabled={item.disabled}
                colorPalette={item.color ?? accent}
                style={targetOf(item.minTargetSize)}
                data-adapttable-part="action-button"
                title={item.reason}
                onClick={item.onSelect}
              >
                {item.icon}
                {item.label}
              </ChakraMenu.Item>
            ))}
          </ChakraMenu.Content>
        </ChakraMenu.Positioner>
      </KitPortal>
    </ChakraMenu.Root>
  );
}

/** A row's actions as Chakra buttons or one menu. */
export const RowActionButtons = /* @__PURE__ */ createRowActionButtons({
  Action,
  Strip,
  Menu,
  iconFor: iconForRowAction,
});
