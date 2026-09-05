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
import { Menu } from "@base-ui/react/menu";
import type { ReactNode } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import type { BaseUiAccentColor } from "../types";
import { Button, Flex, IconButton } from "../ui";
import { Tooltip } from "./primitives";

interface RowActionButtonsProps<TRow> {
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  layout?: RowActionsLayout;
  render?: RowActionsRenderer<TRow>;
  accentColor?: BaseUiAccentColor;
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
  accentColor?: BaseUiAccentColor;
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
}: Readonly<{
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
}>): ReactNode {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            aria-label={labels.rowActionsMenu}
            data-adapttable-part="row-actions-trigger"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVerticalIcon />
          </IconButton>
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end">
          <Menu.Popup
            data-adapttable-part="row-actions-menu"
            style={{
              minWidth: 160,
              padding: 4,
              background: "var(--at-surface, #fff)",
              border: "1px solid var(--at-border, #d0d7de)",
              borderRadius: 8,
            }}
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
                  disabled={disabled}
                  data-adapttable-part="action-button"
                  title={reason}
                  onClick={() =>
                    runRowAction(action, row, confirm, labels.cancel)
                  }
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    width: "100%",
                    padding: "6px 8px",
                    color: action.color === "red" ? "#c10007" : undefined,
                  }}
                >
                  {iconForRowAction(action)}
                  {action.label}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
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
