/**
 * Chakra's small controls: each one the binding builds from Chakra's
 * primitives, plus the header filter trigger and the row move menu, which
 * use Chakra's own popover and menu.
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
  Button as ChakraButton,
  IconButton as ChakraIconButton,
  Menu,
  Popover as ChakraPopover,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

import { FiltersIcon, iconForRowEditPart } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";
import { KitPortal } from "./kitPortal";
import {
  Button,
  Checkbox,
  IconButton,
  Popover,
  Select,
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
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(props);
  return (
    <ChakraPopover.Root
      open={open}
      onOpenChange={(event) => setOpen(event.open)}
      positioning={{ placement: "bottom-start" }}
      closeOnInteractOutside={false}
      lazyMount
    >
      <ChakraPopover.Trigger asChild>
        <ChakraIconButton
          {...sessionProps}
          type="button"
          size="xs"
          variant={active ? "solid" : "ghost"}
          aria-label={filterLabel(props.def)}
          data-adapttable-part="filter-header-trigger"
          data-active={active ? "" : undefined}
        >
          <FiltersIcon size={14} />
        </ChakraIconButton>
      </ChakraPopover.Trigger>
      <KitPortal>
        <ChakraPopover.Positioner>
          <ChakraPopover.Content
            {...sessionProps}
            aria-label={filterLabel(props.def)}
            width="max-content"
            minWidth="20rem"
            p={2}
            data-adapttable-part="filter-header-cell"
          >
            <AutoFilterForm
              defs={[props.def]}
              source={source}
              labels={props.labels}
              registry={props.registry}
            />
          </ChakraPopover.Content>
        </ChakraPopover.Positioner>
      </KitPortal>
    </ChakraPopover.Root>
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
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hadConfirmationRef = useRef(false);
  useEffect(() => {
    const shouldOpen = Boolean(confirmation) && !hadConfirmationRef.current;
    hadConfirmationRef.current = Boolean(confirmation);
    if (shouldOpen) setOpen(true);
  }, [confirmation]);
  const setMenuOpen = (next: boolean) => {
    setOpen(next);
    if (!next) queueMicrotask(() => restoreFocusSoon(triggerRef.current));
  };
  const finish = (callback: () => void) => {
    callback();
    setMenuOpen(false);
  };
  return (
    <span data-adapttable-part="row-move-menu">
      <Menu.Root
        open={open}
        onOpenChange={(event) => setMenuOpen(event.open)}
        closeOnSelect={false}
        positioning={{ placement: "bottom-start" }}
      >
        <Menu.Trigger asChild>
          <ChakraIconButton
            ref={triggerRef}
            type="button"
            size="xs"
            variant="ghost"
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={open}
            data-adapttable-part="row-move-menu-trigger"
          >
            ⋮
          </ChakraIconButton>
        </Menu.Trigger>
        <KitPortal>
          <Menu.Positioner>
            <Menu.Content
              aria-label={label}
              data-adapttable-part="row-move-menu-content"
              minW="12rem"
              p={2}
            >
              {confirmation ? (
                <Stack
                  gap={2}
                  role="alertdialog"
                  aria-label={confirmation.title}
                  data-adapttable-part="row-move-confirmation"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.stopPropagation();
                      return;
                    }
                    if (event.key !== "Escape") return;
                    event.preventDefault();
                    finish(confirmation.onCancel);
                  }}
                >
                  <Text fontWeight="semibold" fontSize="sm">
                    {confirmation.title}
                  </Text>
                  <Text fontSize="sm">{confirmation.description}</Text>
                  <ChakraButton
                    type="button"
                    size="xs"
                    onClick={() => finish(confirmation.onConfirm)}
                  >
                    {confirmation.confirmLabel}
                  </ChakraButton>
                  <ChakraButton
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => finish(confirmation.onCancel)}
                  >
                    {confirmation.cancelLabel}
                  </ChakraButton>
                </Stack>
              ) : (
                items.map((item) => (
                  <Menu.Item
                    key={item.id}
                    value={item.id}
                    disabled={item.disabled}
                    title={item.disabledReason}
                    data-adapttable-part="row-move-menu-item"
                    onClick={item.onSelect}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </Menu.Item>
                ))
              )}
            </Menu.Content>
          </Menu.Positioner>
        </KitPortal>
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
