/** The trailing row-action buttons, shared by rows and cards. */
import type {
  ConfirmHandler,
  RowAction,
  RowActionsLayout,
  RowActionsRenderer,
  TableLabels,
} from "@adapttable/core";
import { runRowAction, visibleRowActions } from "@adapttable/core";
import { resolveDisabledReason } from "@adapttable/react/adapter";
import type { MouseEvent, ReactNode, RefObject } from "react";
import { useRef } from "react";

import type { DataTableClassNames } from "../types";
import { iconForRowAction, MoreVerticalIcon } from "./icons";

interface RowActionButtonsProps<TRow> {
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  layout?: RowActionsLayout;
  render?: RowActionsRenderer<TRow>;
}

interface ActionItemProps<TRow> {
  action: RowAction<TRow>;
  row: TRow;
  confirm: ConfirmHandler;
  cancelLabel: string;
  className: string | undefined;
  /** Close a parent `<details>` after the click (menu layout). */
  detailsRef?: RefObject<HTMLDetailsElement | null>;
}

function ActionItem<TRow>({
  action,
  row,
  confirm,
  cancelLabel,
  className,
  detailsRef,
}: Readonly<ActionItemProps<TRow>>) {
  const reason = resolveDisabledReason(action.disabledReason?.(row));
  const disabled = reason !== undefined || (action.isDisabled?.(row) ?? false);
  const handleClick = disabled
    ? undefined
    : (e: MouseEvent) => {
        e.stopPropagation();
        detailsRef?.current?.removeAttribute("open");
        runRowAction(action, row, confirm, cancelLabel);
      };
  const icon = iconForRowAction(action);
  return (
    <button
      type="button"
      disabled={disabled}
      title={reason ?? (icon ? action.label : undefined)}
      aria-label={action.label}
      data-adapttable-part="action-button"
      data-color={action.color}
      className={className}
      onClick={handleClick}
    >
      {icon ?? action.label}
    </button>
  );
}

function ActionStrip<TRow>({
  row,
  actions,
  confirm,
  cancelLabel,
  className,
}: Readonly<{
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  cancelLabel: string;
  className: string | undefined;
}>): ReactNode {
  return (
    <>
      {actions.map((action) => (
        <ActionItem
          key={action.key}
          action={action}
          row={row}
          confirm={confirm}
          cancelLabel={cancelLabel}
          className={className}
        />
      ))}
    </>
  );
}

function ActionMenu<TRow>({
  row,
  actions,
  confirm,
  labels,
  classNames,
}: Readonly<{
  row: TRow;
  actions: readonly RowAction<TRow>[];
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
}>): ReactNode {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={detailsRef}
      data-adapttable-part="row-actions-menu"
      className={classNames.rowActionsMenu}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <summary
        data-adapttable-part="row-actions-trigger"
        className={classNames.rowActionsTrigger}
        aria-label={labels.rowActionsMenu}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVerticalIcon />
      </summary>
      {actions.map((action) => (
        <ActionItem
          key={action.key}
          action={action}
          row={row}
          confirm={confirm}
          cancelLabel={labels.cancel}
          className={classNames.actionButton}
          detailsRef={detailsRef}
        />
      ))}
    </details>
  );
}

export function RowActionButtons<TRow>({
  row,
  actions,
  confirm,
  labels,
  classNames,
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
          classNames={classNames}
        />
      ) : (
        <ActionStrip
          row={row}
          actions={visible}
          confirm={confirm}
          cancelLabel={labels.cancel}
          className={classNames.actionButton}
        />
      );
  }
  return content;
}
