/** The trailing row-action buttons, shared by rows and cards. */
import {
  type ConfirmHandler,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  runRowAction,
  type TableLabels,
  visibleRowActions,
} from "@adapttable/core";
import { resolveDisabledReason } from "@adapttable/react/adapter";
import { ActionIcon, Button, Group, Menu, Tooltip } from "@mantine/core";
import type { MouseEvent, ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";

interface RowActionButtonsProps<TRow> {
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  layout?: RowActionsLayout;
  render?: RowActionsRenderer<TRow>;
}

function ActionControls<TRow>({
  row,
  actions,
  confirm,
  cancelLabel,
}: Readonly<{
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  cancelLabel: string;
}>): ReactNode {
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      {actions.map((action) => {
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        const handleClick = disabled
          ? undefined
          : (e: MouseEvent) => {
              e.stopPropagation();
              runRowAction(action, row, confirm, cancelLabel);
            };
        const icon = iconForRowAction(action);
        return icon ? (
          <Tooltip
            key={action.key}
            label={reason ?? action.label}
            withArrow
            openDelay={200}
          >
            <ActionIcon
              variant="subtle"
              color={action.color}
              size="sm"
              disabled={disabled}
              aria-label={action.label}
              data-adapttable-part="action-button"
              onClick={handleClick}
            >
              {icon}
            </ActionIcon>
          </Tooltip>
        ) : (
          <Button
            key={action.key}
            variant="subtle"
            color={action.color}
            size="compact-sm"
            disabled={disabled}
            data-adapttable-part="action-button"
            onClick={handleClick}
          >
            {action.label}
          </Button>
        );
      })}
    </Group>
  );
}

function ActionMenu<TRow>({
  row,
  actions,
  confirm,
  labels,
}: Readonly<{
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
}>): ReactNode {
  return (
    <Menu withinPortal position="bottom-end" shadow="sm">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label={labels.rowActionsMenu}
          data-adapttable-part="row-actions-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVerticalIcon />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown
        data-adapttable-part="row-actions-menu"
        onClick={(event) => event.stopPropagation()}
      >
        {actions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(row));
          const disabled =
            reason !== undefined || (action.isDisabled?.(row) ?? false);
          return (
            <Menu.Item
              key={action.key}
              disabled={disabled}
              color={action.color}
              leftSection={iconForRowAction(action)}
              data-adapttable-part="action-button"
              title={reason}
              onClick={() => runRowAction(action, row, confirm, labels.cancel)}
            >
              {action.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

export function RowActionButtons<TRow>({
  row,
  actions,
  confirm,
  labels,
  layout,
  render,
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
        />
      ) : (
        <ActionControls
          row={row}
          actions={visible}
          confirm={confirm}
          cancelLabel={labels.cancel}
        />
      );
  }
  return content;
}
