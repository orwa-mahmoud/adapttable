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
import { resolveDisabledReason } from "@adapttable/core/adapter";
import { Button, Dropdown, Tooltip } from "antd";
import type { ReactNode } from "react";

import { isDangerColor } from "../colors";
import { iconForRowAction, MoreVerticalIcon } from "../icons";

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
    <>
      {actions.map((action) => {
        const reason = resolveDisabledReason(action.disabledReason?.(row));
        const disabled =
          reason !== undefined || (action.isDisabled?.(row) ?? false);
        const icon = iconForRowAction(action);
        return (
          <Tooltip key={action.key} title={reason ?? action.label}>
            <Button
              size="small"
              type="text"
              danger={isDangerColor(action.color)}
              disabled={disabled}
              icon={icon}
              title={reason}
              aria-label={action.label}
              data-adapttable-part="action-button"
              onClick={
                disabled
                  ? undefined
                  : (event) => {
                      event.stopPropagation();
                      runRowAction(action, row, confirm, cancelLabel);
                    }
              }
            >
              {icon ? undefined : action.label}
            </Button>
          </Tooltip>
        );
      })}
    </>
  );
}

/** Tags the dropdown surface with its part name for adapter styling hooks. */
function renderMenuSurface(menu: ReactNode): ReactNode {
  return <div data-adapttable-part="row-actions-menu">{menu}</div>;
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
    <Dropdown
      trigger={["click"]}
      popupRender={renderMenuSurface}
      menu={{
        items: actions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(row));
          const disabled =
            reason !== undefined || (action.isDisabled?.(row) ?? false);
          return {
            key: action.key,
            label: action.label,
            icon: iconForRowAction(action),
            disabled,
            danger: isDangerColor(action.color),
            title: reason,
          };
        }),
        onClick: (info) => {
          const action = actions.find((item) => item.key === info.key);
          if (!action) return;
          runRowAction(action, row, confirm, labels.cancel);
        },
      }}
    >
      <Button
        size="small"
        type="text"
        aria-label={labels.rowActionsMenu}
        data-adapttable-part="row-actions-trigger"
        icon={<MoreVerticalIcon />}
        onClick={(event) => event.stopPropagation()}
      />
    </Dropdown>
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
    content = render({ row, actions, confirm, labels });
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
