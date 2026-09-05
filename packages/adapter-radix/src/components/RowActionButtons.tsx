/** The trailing row-action buttons, shared by rows and cards. */
import { runRowAction, visibleRowActions } from "@adapttable/core";
import type {
  ConfirmHandler,
  RowAction,
  RowActionsLayout,
  RowActionsRenderer,
  TableLabels,
} from "@adapttable/core";
import { resolveDisabledReason } from "@adapttable/react/adapter";
import { Button, DropdownMenu, Flex, IconButton } from "@radix-ui/themes";
import type { ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import type { RadixAccentColor } from "../types";
import { Tooltip } from "./primitives";

interface RowActionButtonsProps<TRow> {
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  layout?: RowActionsLayout;
  render?: RowActionsRenderer<TRow>;
  accentColor?: RadixAccentColor;
}

function ActionStrip<TRow>({
  row,
  actions,
  confirm,
  cancelLabel,
  accentColor,
}: Readonly<{
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  cancelLabel: string;
  accentColor?: RadixAccentColor;
}>): ReactNode {
  return (
    <Flex gap="1" justify="end">
      {actions.map((action) => {
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        const handleClick = disabled
          ? undefined
          : (e: React.MouseEvent) => {
              e.stopPropagation();
              runRowAction(action, row, confirm, cancelLabel);
            };
        const icon = iconForRowAction(action);
        return icon ? (
          <Tooltip key={action.key} label={reason ?? action.label}>
            <IconButton
              size="1"
              variant="ghost"
              color={accentColor ?? "gray"}
              disabled={disabled}
              aria-label={action.label}
              data-adapttable-part="action-button"
              onClick={handleClick}
            >
              {icon}
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip key={action.key} label={reason ?? action.label}>
            <Button
              size="1"
              variant="ghost"
              color={accentColor}
              disabled={disabled}
              data-adapttable-part="action-button"
              onClick={handleClick}
            >
              {action.label}
            </Button>
          </Tooltip>
        );
      })}
    </Flex>
  );
}

function ActionMenu<TRow>({
  row,
  actions,
  confirm,
  labels,
  accentColor,
}: Readonly<{
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  accentColor?: RadixAccentColor;
}>): ReactNode {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          size="1"
          variant="ghost"
          color={accentColor ?? "gray"}
          aria-label={labels.rowActionsMenu}
          data-adapttable-part="row-actions-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVerticalIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        data-adapttable-part="row-actions-menu"
        onClick={(event) => event.stopPropagation()}
      >
        {actions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(row));
          const disabled =
            reason !== undefined || (action.isDisabled?.(row) ?? false);
          return (
            <DropdownMenu.Item
              key={action.key}
              disabled={disabled}
              color={action.color === "red" ? "red" : undefined}
              data-adapttable-part="action-button"
              title={reason}
              onSelect={() => runRowAction(action, row, confirm, labels.cancel)}
            >
              {iconForRowAction(action)}
              {action.label}
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export function RowActionButtons<TRow>({
  row,
  actions,
  confirm,
  labels,
  layout,
  render,
  accentColor,
}: Readonly<RowActionButtonsProps<TRow>>): ReactNode {
  const visible = visibleRowActions(actions, row);
  let content: ReactNode = null;
  if (render) {
    content = render({ row, actions, confirm, labels }) as ReactNode;
  } else if (visible.length > 0) {
    content =
      layout === "menu" ? (
        <ActionMenu
          row={row}
          actions={visible}
          confirm={confirm}
          labels={labels}
          accentColor={accentColor}
        />
      ) : (
        <ActionStrip
          row={row}
          actions={visible}
          confirm={confirm}
          cancelLabel={labels.cancel}
          accentColor={accentColor}
        />
      );
  }
  return content;
}
