/**
 * Radix's small controls: each one the binding builds from Radix's
 * primitives, plus the header filter trigger and the row move menu, which use
 * Radix's own popover and dropdown menu.
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
  Button as UiButton,
  DropdownMenu,
  Flex,
  IconButton as UiIconButton,
  Popover as RadixPopover,
  Text,
} from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";

import { FiltersIcon, iconForRowEditPart } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";
import {
  AccentIconButton,
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

/** Funnel on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const portalContainer = usePortalContainer();
  const active = hasActiveHeaderFilter(props);
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(
    props,
    {
      nestedSelector: "[role='listbox']",
    }
  );
  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger>
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
      </RadixPopover.Trigger>
      <RadixPopover.Content
        container={portalContainer}
        {...sessionProps}
        aria-label={filterLabel(props.def)}
        align="start"
        sideOffset={4}
        data-adapttable-part="filter-header-cell"
        style={{ minWidth: "20rem", padding: 8 }}
        onPointerDownOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <AutoFilterForm
          defs={[props.def]}
          source={source}
          labels={props.labels}
          registry={props.registry}
        />
      </RadixPopover.Content>
    </RadixPopover.Root>
  );
}

/** Find in the table. */
export const FindBar = /* @__PURE__ */ createFindBar({ TextInput, IconButton });

/** A row's edit, save and cancel buttons. */
export const RowEditActions = /* @__PURE__ */ createRowEditActions(
  { Button, IconButton: AccentIconButton },
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
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
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
      <DropdownMenu.Root
        open={open}
        dir={direction}
        onOpenChange={(next) => {
          if (next) {
            setDirection(
              triggerRef.current?.closest('[dir="rtl"]') ? "rtl" : "ltr"
            );
          } else {
            setTimeout(() => confirmationRef.current?.onCancel(), 0);
            restoreTriggerFocus();
          }
          setOpen(next);
        }}
      >
        <DropdownMenu.Trigger>
          <UiIconButton
            ref={triggerRef}
            type="button"
            size="1"
            variant="ghost"
            color="gray"
            aria-label={label}
            data-adapttable-part="row-move-menu-trigger"
            onClick={(event) => event.stopPropagation()}
          >
            ⋮
          </UiIconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          container={portalContainer}
          aria-label={label}
          align="start"
          sideOffset={4}
          data-adapttable-part="row-move-menu-content"
          style={{ minWidth: "12rem", padding: 8 }}
          onClick={(event) => event.stopPropagation()}
        >
          {confirmation ? (
            <Flex
              role="alertdialog"
              aria-label={confirmation.title}
              direction="column"
              gap="2"
              data-adapttable-part="row-move-confirmation"
            >
              <Text weight="bold">{confirmation.title}</Text>
              <Text>{confirmation.description}</Text>
              <Flex justify="end" gap="2">
                <UiButton
                  type="button"
                  size="1"
                  variant="soft"
                  color="gray"
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
              </Flex>
            </Flex>
          ) : (
            <Flex direction="column" gap="1">
              {items.map((item) => (
                <DropdownMenu.Item
                  key={item.id}
                  disabled={item.disabled}
                  title={item.disabledReason}
                  data-adapttable-part="row-move-menu-item"
                  style={{
                    height: "auto",
                    justifyContent: "flex-start",
                    textAlign: "start",
                    whiteSpace: "normal",
                  }}
                  onSelect={(event) => {
                    event.preventDefault();
                    item.onSelect();
                    setTimeout(() => {
                      if (!confirmationRef.current) close();
                    }, 0);
                  }}
                >
                  <Flex direction="column" align="start">
                    <Text>{item.label}</Text>
                    {item.disabledReason ? (
                      <Text size="1" color="gray">
                        {item.disabledReason}
                      </Text>
                    ) : null}
                  </Flex>
                </DropdownMenu.Item>
              ))}
            </Flex>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
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
