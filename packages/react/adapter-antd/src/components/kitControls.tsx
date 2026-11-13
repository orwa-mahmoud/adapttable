/**
 * antd's small controls: each one the binding builds from antd's
 * primitives, plus the header filter trigger and the row move menu, which use
 * antd's own components.
 */
import { useHeaderFilterOverlay } from "@adapttable/react";
import {
  type AgentApprovalProps,
  type BatchEditBarProps,
  type ColumnGroupToggleProps,
  createAgentApproval,
  createBatchEditBar,
  createColumnGroupToggle,
  createEditableCellSlots,
  createFilterHeaderControl,
  createFilterHeaderRow,
  createFindBar,
  createGroupMoreButton,
  createRowEditActions,
  createRowReorderButtons,
  createRowReorderHandle,
  createTreeCell,
  createTreeToggle,
  type EditableCellSlots,
  type FilterHeaderControlProps,
  type FilterHeaderRowProps,
  filterLabel,
  type FindBarProps,
  type GroupMoreButtonProps,
  hasActiveHeaderFilter,
  restoreFocusSoon,
  type RowEditActionsProps,
  type RowMoveMenuSlotProps,
  type RowReorderButtonsProps,
  type RowReorderHandleProps,
  type TreeCellProps,
  type TreeToggleProps,
} from "@adapttable/react/adapter";
import {
  Button as AntButton,
  Popover as AntPopover,
  Typography as AntTypography,
} from "antd";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FiltersIcon, iconForRowEditPart } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";
import {
  Button,
  Checkbox,
  IconButton,
  Popover,
  Select,
  TextButton,
  TextInput,
} from "./kitPrimitives";

export type {
  AgentApprovalProps,
  BatchEditBarProps,
  ColumnGroupToggleProps,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
  FindBarProps,
  GroupMoreButtonProps,
  RowEditActionsProps,
  RowReorderButtonsProps,
  RowReorderHandleProps,
  TreeCellProps,
  TreeToggleProps,
};

const headerKit = { TextInput, Select, Button, Checkbox, Popover };

/** The filter row under the column headers. */
export const FilterHeaderRow = /* @__PURE__ */ createFilterHeaderRow(headerKit);

/** One column's header filter. */
export const FilterHeaderControl =
  /* @__PURE__ */ createFilterHeaderControl(headerKit);

/** Funnel on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const active = hasActiveHeaderFilter(props);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();
  const label = filterLabel(props.def);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(
    null
  );
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(
    props,
    {
      nestedSelector:
        ".ant-dropdown,.ant-select-dropdown,.ant-picker-dropdown,[role='listbox']",
    }
  );
  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    const update = (): void => {
      const box = triggerRef.current?.getBoundingClientRect();
      if (box == null) return;
      setAnchor({ top: box.bottom + 4, left: box.left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);
  return (
    <>
      <span
        {...sessionProps}
        ref={triggerRef}
        style={{ display: "inline-flex" }}
      >
        <AntButton
          type={active ? "primary" : "text"}
          size="small"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          data-adapttable-part="filter-header-trigger"
          data-active={active ? "" : undefined}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(!open);
          }}
        >
          <FiltersIcon size={14} />
        </AntButton>
      </span>
      {open &&
        anchor != null &&
        createPortal(
          <dialog
            {...sessionProps}
            id={panelId}
            open
            aria-label={label}
            data-adapttable-part="filter-header-cell"
            style={{
              position: "fixed",
              top: anchor.top,
              left: anchor.left,
              right: "auto",
              bottom: "auto",
              margin: 0,
              border: "none",
              zIndex: 1050,
              minWidth: "20rem",
              padding: 12,
              background: "var(--ant-color-bg-elevated, #fff)",
              boxShadow:
                "var(--ant-box-shadow-secondary, 0 6px 16px rgba(0,0,0,0.08))",
              borderRadius: 8,
            }}
          >
            <AutoFilterForm
              defs={[props.def]}
              source={source}
              labels={props.labels}
              registry={props.registry}
            />
          </dialog>,
          // Fullscreen hides everything outside the promoted element, the body
          // included; the field opens inside it while it is up.
          (document.fullscreenElement as HTMLElement | null) ?? document.body
        )}
    </>
  );
}

/** Find in the table. */
export const FindBar = /* @__PURE__ */ createFindBar({ TextInput, IconButton });

/** A row's edit, save and cancel buttons. */
export const RowEditActions = /* @__PURE__ */ createRowEditActions(
  { Button: TextButton, IconButton },
  iconForRowEditPart
);

/** Save or discard a batch of edits. */
export const BatchEditBar = /* @__PURE__ */ createBatchEditBar({ Button });

/** Approve or reject a pending agent write. */
export const AgentApproval = /* @__PURE__ */ createAgentApproval({ Button });

/** A tree row's expand toggle. */
export const TreeToggle = /* @__PURE__ */ createTreeToggle({ IconButton });

/** A tree row's first cell. */
export const TreeCell = /* @__PURE__ */ createTreeCell({ IconButton });

/** A column group's collapse toggle. */
export const ColumnGroupToggle = /* @__PURE__ */ createColumnGroupToggle({
  IconButton,
});

/** Reveal more groups or rows. */
export const GroupMoreButton = /* @__PURE__ */ createGroupMoreButton({
  Button,
});

function RowMoveMenu({
  label,
  items,
  confirmation,
}: Readonly<RowMoveMenuSlotProps>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef(confirmation);
  confirmationRef.current = confirmation;
  useEffect(() => {
    if (confirmation) setOpen(true);
  }, [confirmation]);

  const restoreTriggerFocus = () => {
    queueMicrotask(() => restoreFocusSoon(triggerRef.current));
  };
  const close = () => {
    setOpen(false);
    restoreTriggerFocus();
  };

  const content = (
    <div
      role={confirmation ? undefined : "menu"}
      aria-label={confirmation ? undefined : label}
      data-adapttable-part="row-move-menu-content"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: "12rem",
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          // Closing the popover is the single cancel path: its
          // `onOpenChange` abandons the pending move.
          close();
        }
      }}
    >
      {confirmation ? (
        <div
          role="alertdialog"
          aria-label={confirmation.title}
          data-adapttable-part="row-move-confirmation"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <AntTypography.Text strong>{confirmation.title}</AntTypography.Text>
          <AntTypography.Text>{confirmation.description}</AntTypography.Text>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <AntButton
              size="small"
              onClick={() => {
                confirmation.onCancel();
                close();
              }}
            >
              {confirmation.cancelLabel}
            </AntButton>
            <AntButton
              type="primary"
              size="small"
              onClick={() => {
                confirmation.onConfirm();
                close();
              }}
            >
              {confirmation.confirmLabel}
            </AntButton>
          </div>
        </div>
      ) : (
        items.map((item) => (
          <AntButton
            key={item.id}
            type="text"
            role="menuitem"
            block
            disabled={item.disabled}
            title={item.disabledReason}
            data-adapttable-part="row-move-menu-item"
            style={{ height: "auto", textAlign: "start", whiteSpace: "normal" }}
            onClick={() => {
              item.onSelect();
              setTimeout(() => {
                if (!confirmationRef.current) close();
              }, 0);
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              <AntTypography.Text>{item.label}</AntTypography.Text>
              {item.disabledReason ? (
                <AntTypography.Text type="secondary">
                  {item.disabledReason}
                </AntTypography.Text>
              ) : null}
            </span>
          </AntButton>
        ))
      )}
    </div>
  );

  return (
    <span data-adapttable-part="row-move-menu">
      <AntPopover
        open={open}
        trigger="click"
        placement="bottomLeft"
        content={content}
        destroyOnHidden
        onOpenChange={(next) => {
          if (!next) {
            confirmationRef.current?.onCancel();
            restoreTriggerFocus();
          }
          setOpen(next);
        }}
      >
        <AntButton
          ref={triggerRef}
          type="text"
          size="small"
          aria-label={label}
          data-adapttable-part="row-move-menu-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          ⋮
        </AntButton>
      </AntPopover>
    </span>
  );
}

const rowMove = { IconButton, MoveMenu: RowMoveMenu };

/** A row's drag handle. */
export const RowReorderHandle = /* @__PURE__ */ createRowReorderHandle(rowMove);

/** A row's move up and down buttons. */
export const RowReorderButtons =
  /* @__PURE__ */ createRowReorderButtons(rowMove);

/** The editable cell's activation target and its gate buttons. */
export const editableCellSlots: EditableCellSlots =
  /* @__PURE__ */ createEditableCellSlots({ Button });
