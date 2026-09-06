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
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  type PaperProps,
  Stack,
  Tooltip,
} from "@mui/material";
import { type MouseEvent, type ReactNode, useState } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import { muiColor } from "./DesktopTable";

interface RowActionButtonsProps<TRow> {
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  layout?: RowActionsLayout;
  render?: RowActionsRenderer<TRow>;
}

function ActionStrip<TRow>({
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
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
      {actions.map((action) => {
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        const icon = iconForRowAction(action);
        const color = muiColor(action.color);
        const handleClick = disabled
          ? undefined
          : (e: MouseEvent) => {
              e.stopPropagation();
              runRowAction(action, row, confirm, cancelLabel);
            };
        return (
          <Tooltip key={action.key} title={reason ?? action.label}>
            <span>
              {icon ? (
                <IconButton
                  size="small"
                  color={color}
                  disabled={disabled}
                  aria-label={action.label}
                  data-adapttable-part="action-button"
                  onClick={handleClick}
                >
                  {icon}
                </IconButton>
              ) : (
                <Button
                  size="small"
                  color={color === "error" ? "error" : "inherit"}
                  disabled={disabled}
                  data-adapttable-part="action-button"
                  onClick={handleClick}
                >
                  {action.label}
                </Button>
              )}
            </span>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

function ActionsMenuPaper(props: Readonly<PaperProps>) {
  return <Paper {...props} data-adapttable-part="row-actions-menu" />;
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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        size="small"
        aria-label={labels.rowActionsMenu}
        data-adapttable-part="row-actions-trigger"
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      >
        <MoreVerticalIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slots={{ paper: ActionsMenuPaper }}
        onClick={(event) => event.stopPropagation()}
      >
        {actions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(row));
          const disabled =
            reason !== undefined || (action.isDisabled?.(row) ?? false);
          const color = muiColor(action.color);
          return (
            <MenuItem
              key={action.key}
              disabled={disabled}
              title={reason}
              data-adapttable-part="action-button"
              sx={color === "error" ? { color: "error.main" } : undefined}
              onClick={() => {
                setAnchor(null);
                runRowAction(action, row, confirm, labels.cancel);
              }}
            >
              {iconForRowAction(action)}
              {action.label}
            </MenuItem>
          );
        })}
      </Menu>
    </>
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
        <ActionStrip
          row={row}
          actions={visible}
          confirm={confirm}
          cancelLabel={labels.cancel}
        />
      );
  }
  return content;
}
