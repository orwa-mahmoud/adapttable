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
import { Button, HStack, IconButton, Menu } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import { KitPortal } from "./kitPortal";
import { Tooltip } from "./primitives";

interface RowActionButtonsProps<TRow> {
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  layout?: RowActionsLayout;
  render?: RowActionsRenderer<TRow>;
  accentColor?: string;
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
  accentColor?: string;
}>): ReactNode {
  return (
    <HStack gap={1} justify="flex-end">
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
              size="sm"
              variant="ghost"
              colorPalette={action.color ?? accentColor}
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
              size="sm"
              variant="ghost"
              colorPalette={action.color ?? accentColor}
              disabled={disabled}
              data-adapttable-part="action-button"
              onClick={handleClick}
            >
              {action.label}
            </Button>
          </Tooltip>
        );
      })}
    </HStack>
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
  accentColor?: string;
}>): ReactNode {
  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <IconButton
          size="sm"
          variant="ghost"
          colorPalette={accentColor}
          aria-label={labels.rowActionsMenu}
          data-adapttable-part="row-actions-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVerticalIcon />
        </IconButton>
      </Menu.Trigger>
      <KitPortal>
        <Menu.Positioner>
          <Menu.Content
            data-adapttable-part="row-actions-menu"
            onClick={(event) => event.stopPropagation()}
          >
            {actions.map((action) => {
              const reason = resolveDisabledReason(
                action.disabledReason?.(row)
              );
              const disabled =
                reason !== undefined || (action.isDisabled?.(row) ?? false);
              return (
                <Menu.Item
                  key={action.key}
                  value={action.key}
                  disabled={disabled}
                  colorPalette={action.color ?? accentColor}
                  data-adapttable-part="action-button"
                  title={reason}
                  onClick={() =>
                    runRowAction(action, row, confirm, labels.cancel)
                  }
                >
                  {iconForRowAction(action)}
                  {action.label}
                </Menu.Item>
              );
            })}
          </Menu.Content>
        </Menu.Positioner>
      </KitPortal>
    </Menu.Root>
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
