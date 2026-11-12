/** A row's actions, decided by the binding and drawn with Mantine's controls. */
import {
  createRowActionButtons,
  type KitRowActionMenuProps,
  type KitRowActionProps,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Button,
  Group,
  Menu as MantineMenu,
  Tooltip,
} from "@mantine/core";
import type { ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";

const targetOf = (size: number | undefined) => ({
  minWidth: size,
  minHeight: size,
});

/** One action: a glyph named in a tooltip, or a compact caption. */
function Action({
  label,
  icon,
  color,
  disabled,
  reason,
  minTargetSize,
  onClick,
}: Readonly<KitRowActionProps>) {
  "use no memo";
  if (!icon) {
    return (
      <Button
        variant="subtle"
        color={color}
        size="compact-sm"
        disabled={disabled}
        style={targetOf(minTargetSize)}
        data-adapttable-part="action-button"
        onClick={onClick}
      >
        {label}
      </Button>
    );
  }
  return (
    <Tooltip label={reason ?? label} withArrow openDelay={200}>
      <ActionIcon
        variant="subtle"
        color={color}
        size="sm"
        disabled={disabled}
        aria-label={label}
        style={targetOf(minTargetSize)}
        data-adapttable-part="action-button"
        onClick={onClick}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}

function Strip({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      {children}
    </Group>
  );
}

function Menu({
  label,
  minTargetSize,
  items,
}: Readonly<KitRowActionMenuProps>) {
  "use no memo";
  return (
    <MantineMenu withinPortal position="bottom-end" shadow="sm">
      <MantineMenu.Target>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label={label}
          style={targetOf(minTargetSize)}
          data-adapttable-part="row-actions-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVerticalIcon />
        </ActionIcon>
      </MantineMenu.Target>
      <MantineMenu.Dropdown
        data-adapttable-part="row-actions-menu"
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item) => (
          <MantineMenu.Item
            key={item.key}
            disabled={item.disabled}
            color={item.color}
            leftSection={item.icon}
            style={targetOf(item.minTargetSize)}
            data-adapttable-part="action-button"
            title={item.reason}
            onClick={item.onSelect}
          >
            {item.label}
          </MantineMenu.Item>
        ))}
      </MantineMenu.Dropdown>
    </MantineMenu>
  );
}

/** A row's actions as Mantine buttons or one menu. */
export const RowActionButtons = /* @__PURE__ */ createRowActionButtons({
  Action,
  Strip,
  Menu,
  iconFor: iconForRowAction,
});
