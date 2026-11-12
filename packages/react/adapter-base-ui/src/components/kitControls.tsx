/**
 * Base UI's small controls: each one the binding builds from Base UI's
 * primitives, plus the header filter trigger and the row move menu, which use
 * Base UI's own popover and menu.
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
import { Menu } from "@base-ui/react/menu";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { useEffect, useRef, useState } from "react";

import { FiltersIcon, iconForRowEditPart } from "../icons";
import { Button as UiButton, IconButton as UiIconButton, Text } from "../ui";
import { AutoFilterForm } from "./AutoFilterForm";
import {
  Button,
  Checkbox,
  IconButton,
  Popover,
  Select,
  TextInput,
} from "./kitPrimitives";
import { usePortalContainer } from "./portalContainer";

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

/** What this kit hands a close handler. @internal */
export interface OverlayCloseDetails {
  readonly reason: string;
  readonly cancel: () => void;
}

/**
 * Close handler for a header filter's popover.
 *
 * The kit reports a close whenever focus leaves the trigger, and the field it
 * draws opens its own listbox in a portal — so choosing an option reads as
 * focus leaving and the popover would shut under the reader's hand. Both of
 * those reasons are the field being used; Escape and an explicit press still
 * close it.
 *
 * A named handler rather than an inline one so the decision can be exercised
 * without a real focus event, which jsdom delivers or drops depending on how
 * loaded the machine is.
 *
 * @internal
 */
export function headerFilterOpenChange(setOpen: (open: boolean) => void) {
  return (next: boolean, details: OverlayCloseDetails): void => {
    if (
      !next &&
      (details.reason === "outside-press" || details.reason === "focus-out")
    ) {
      details.cancel();
      return;
    }
    setOpen(next);
  };
}

/**
 * Close handler for a row-move menu.
 *
 * While a confirmation is standing in the menu, its confirm and cancel
 * controls live inside it, so pressing one is an `item-press` that would
 * close the menu before the answer is read. With nothing to confirm the menu
 * closes as any menu does, and a close that gets through cancels whatever was
 * being asked and puts focus back on the trigger.
 *
 * @internal
 */
export function rowMoveMenuOpenChange(wiring: {
  readonly setOpen: (open: boolean) => void;
  readonly confirming: () => { readonly onCancel: () => void } | undefined;
  readonly restoreTriggerFocus: () => void;
}) {
  return (next: boolean, details: OverlayCloseDetails): void => {
    const standing = wiring.confirming();
    if (
      !next &&
      standing &&
      (details.reason === "focus-out" || details.reason === "item-press")
    ) {
      details.cancel();
      return;
    }
    if (!next) {
      standing?.onCancel();
      wiring.restoreTriggerFocus();
    }
    wiring.setOpen(next);
  };
}

/** Funnel on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const portalContainer = usePortalContainer();
  const active = hasActiveHeaderFilter(props);
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(
    props,
    { nestedSelector: "[role='listbox'],[data-base-ui-portal]" }
  );
  return (
    <BasePopover.Root
      open={open}
      onOpenChange={headerFilterOpenChange(setOpen)}
    >
      <BasePopover.Trigger
        render={
          <UiIconButton
            {...sessionProps}
            type="button"
            size="1"
            variant={active ? "soft" : "ghost"}
            aria-label={filterLabel(props.def)}
            data-adapttable-part="filter-header-trigger"
            data-active={active ? "" : undefined}
          >
            <FiltersIcon size={14} />
          </UiIconButton>
        }
      />
      <BasePopover.Portal container={portalContainer}>
        <BasePopover.Positioner side="bottom" align="start" sideOffset={4}>
          <BasePopover.Popup
            {...sessionProps}
            aria-label={filterLabel(props.def)}
            data-adapttable-part="filter-header-cell"
            style={{ minWidth: "20rem", padding: 8 }}
          >
            <AutoFilterForm
              defs={[props.def]}
              source={source}
              labels={props.labels}
              registry={props.registry}
            />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

/** Find in the table. */
export const FindBar = /* @__PURE__ */ createFindBar({ TextInput, IconButton });

/** A row's edit, save and cancel buttons. */
export const RowEditActions = /* @__PURE__ */ createRowEditActions(
  { Button, IconButton },
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
  const portalContainer = usePortalContainer();
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

  return (
    <span data-adapttable-part="row-move-menu">
      <Menu.Root
        open={open}
        onOpenChange={rowMoveMenuOpenChange({
          setOpen,
          confirming: () => confirmationRef.current,
          restoreTriggerFocus,
        })}
      >
        <Menu.Trigger
          render={
            <UiIconButton
              ref={triggerRef}
              type="button"
              size="1"
              variant="ghost"
              aria-label={label}
              data-adapttable-part="row-move-menu-trigger"
              onClick={(event) => event.stopPropagation()}
            >
              ⋮
            </UiIconButton>
          }
        />
        <Menu.Portal container={portalContainer}>
          <Menu.Positioner side="bottom" align="start" sideOffset={4}>
            <Menu.Popup
              aria-label={label}
              finalFocus={triggerRef}
              data-adapttable-part="row-move-menu-content"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minWidth: "12rem",
                padding: 8,
                background: "var(--at-surface, #fff)",
                border: "1px solid var(--at-border, #d0d7de)",
                borderRadius: 8,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {confirmation ? (
                <div
                  role="alertdialog"
                  aria-label={confirmation.title}
                  data-adapttable-part="row-move-confirmation"
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Text weight="bold">{confirmation.title}</Text>
                  <Text>{confirmation.description}</Text>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <UiButton
                      type="button"
                      size="1"
                      variant="soft"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmation.onCancel();
                        close();
                      }}
                    >
                      {confirmation.cancelLabel}
                    </UiButton>
                    <UiButton
                      type="button"
                      size="1"
                      variant="solid"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmation.onConfirm();
                        close();
                      }}
                    >
                      {confirmation.confirmLabel}
                    </UiButton>
                  </div>
                </div>
              ) : (
                items.map((item) => (
                  <Menu.Item
                    key={item.id}
                    disabled={item.disabled}
                    closeOnClick={false}
                    title={item.disabledReason}
                    data-adapttable-part="row-move-menu-item"
                    style={{
                      height: "auto",
                      justifyContent: "flex-start",
                      textAlign: "start",
                      whiteSpace: "normal",
                    }}
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
                        alignItems: "flex-start",
                      }}
                    >
                      <Text>{item.label}</Text>
                      {item.disabledReason ? (
                        <Text size="1" color="gray">
                          {item.disabledReason}
                        </Text>
                      ) : null}
                    </span>
                  </Menu.Item>
                ))
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
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
