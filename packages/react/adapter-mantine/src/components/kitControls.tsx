/**
 * Each feature's controls, drawn with Mantine's primitives at the size each
 * has always had. The binding owns the structure, glyphs and wiring.
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
  type KitButtonProps,
  restoreFocusSoon,
  type RowEditActionsProps,
  type RowMoveMenuSlotProps,
  type RowReorderButtonsProps,
  type RowReorderHandleProps,
  type TableSource,
  type TreeCellProps,
  type TreeToggleProps,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Button as MantineButton,
  Menu,
  Paper,
  Popover as MantinePopover,
  Portal,
  Stack,
  Text,
} from "@mantine/core";
import { useRef, useState } from "react";

import { FiltersIcon, iconForRowEditPart } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";
import {
  button,
  Checkbox,
  iconButton,
  Popover,
  Select,
  TextInput,
  TooltipIconButton,
} from "./primitives";

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

const Button = /* @__PURE__ */ button("xs");
const IconButton = /* @__PURE__ */ iconButton("sm");
/** A whole touch target for the cards' move-up and move-down. */
const TouchIconButton = /* @__PURE__ */ iconButton("xl");

/**
 * The header multi-choice trigger: Mantine's compact default button, its
 * summary at the start and its chevron at the end.
 */
function HeaderButton({
  elementRef,
  variant: _variant,
  tone: _tone,
  justify: _justify,
  style: _style,
  ...rest
}: Readonly<KitButtonProps>) {
  "use no memo";
  return (
    <MantineButton
      ref={elementRef}
      type="button"
      size="compact-xs"
      variant="default"
      justify="space-between"
      styles={{ label: { minWidth: 0, width: "100%" } }}
      {...rest}
    />
  );
}

const headerKit = {
  TextInput,
  Select,
  Button: HeaderButton,
  Checkbox,
  Popover,
};

/**
 * The filter row under the column headers, drawn with this kit's controls.
 *
 * @public
 */
export const FilterHeaderRow = /* @__PURE__ */ createFilterHeaderRow(headerKit);

/**
 * One column's header filter, drawn with this kit's controls.
 *
 * @public
 */
export const FilterHeaderControl =
  /* @__PURE__ */ createFilterHeaderControl(headerKit);

/** Funnel on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const active = hasActiveHeaderFilter(props);
  const { setOpen, source, sessionProps, resetKey } = useHeaderFilterOverlay(
    props,
    {
      nestedSelector: ".mantine-Popover-dropdown,.mantine-Combobox-dropdown",
    }
  );
  return (
    <span {...sessionProps} style={{ display: "inline-flex" }}>
      <MantinePopover
        key={resetKey}
        onChange={setOpen}
        closeOnClickOutside={false}
        position="bottom-start"
        shadow="md"
      >
        <MantinePopover.Target>
          <ActionIcon
            variant={active ? "light" : "subtle"}
            size="sm"
            aria-label={filterLabel(props.def)}
            data-adapttable-part="filter-header-trigger"
            data-active={active ? "" : undefined}
          >
            <FiltersIcon size={14} />
          </ActionIcon>
        </MantinePopover.Target>
        <MantinePopover.Dropdown
          {...sessionProps}
          data-adapttable-part="filter-header-cell"
          p="sm"
          miw="20rem"
        >
          <AutoFilterForm
            defs={[props.def]}
            source={source as TableSource<TRow>}
            labels={props.labels}
            registry={props.registry}
          />
        </MantinePopover.Dropdown>
      </MantinePopover>
    </span>
  );
}

/**
 * The find bar, drawn with this kit's input and buttons.
 *
 * @public
 */
export const FindBar = /* @__PURE__ */ createFindBar({ TextInput, IconButton });

/**
 * Save and cancel for a row being edited.
 *
 * @public
 */
export const RowEditActions = /* @__PURE__ */ createRowEditActions(
  { Button, IconButton: TooltipIconButton },
  iconForRowEditPart
);

/**
 * The bar that saves or discards a batch of edits.
 *
 * @public
 */
export const BatchEditBar = /* @__PURE__ */ createBatchEditBar({ Button });

/**
 * Approve or reject a pending agent write.
 *
 * @public
 */
export const AgentApproval = /* @__PURE__ */ createAgentApproval({ Button });

/**
 * The expand/collapse control on a tree row.
 *
 * @public
 */
export const TreeToggle = /* @__PURE__ */ createTreeToggle({ IconButton });

/**
 * A tree row's first cell: indentation, toggle and content.
 *
 * @public
 */
export const TreeCell = /* @__PURE__ */ createTreeCell({ IconButton });

/**
 * The control that collapses a grouped column header.
 *
 * @public
 */
export const ColumnGroupToggle = /* @__PURE__ */ createColumnGroupToggle({
  IconButton,
});

/**
 * The control that reveals the rest of a truncated group.
 *
 * @public
 */
export const GroupMoreButton = /* @__PURE__ */ createGroupMoreButton({
  Button,
});

/**
 * Mantine's own move menu: the destinations stay open while a row is moved,
 * and a confirmation is a centred sheet rather than a popover.
 */
function RowMoveMenu({
  label,
  items,
  confirmation,
}: Readonly<RowMoveMenuSlotProps>) {
  const [opened, setOpened] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const setMenuOpen = (next: boolean) => {
    setOpened(next);
    if (!next) queueMicrotask(() => restoreFocusSoon(triggerRef.current));
  };
  const finish = (callback: () => void) => {
    callback();
    setOpened(false);
    queueMicrotask(() => restoreFocusSoon(triggerRef.current));
  };
  if (confirmation) {
    return (
      <>
        <span data-adapttable-part="row-move-menu">
          <ActionIcon
            ref={triggerRef}
            type="button"
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded="true"
            data-adapttable-part="row-move-menu-trigger"
          >
            ⋮
          </ActionIcon>
        </span>
        <Portal>
          <Paper
            shadow="md"
            p="sm"
            data-adapttable-part="row-move-menu-content"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              minWidth: "12rem",
              transform: "translate(-50%, -50%)",
              zIndex: 400,
            }}
          >
            <Stack
              gap="xs"
              role="alertdialog"
              aria-label={confirmation.title}
              data-adapttable-part="row-move-confirmation"
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                finish(confirmation.onCancel);
              }}
            >
              <Text fw={600} size="sm">
                {confirmation.title}
              </Text>
              <Text size="sm">{confirmation.description}</Text>
              <MantineButton
                type="button"
                size="compact-xs"
                onClick={() => finish(confirmation.onConfirm)}
              >
                {confirmation.confirmLabel}
              </MantineButton>
              <MantineButton
                type="button"
                size="compact-xs"
                variant="default"
                onClick={() => finish(confirmation.onCancel)}
              >
                {confirmation.cancelLabel}
              </MantineButton>
            </Stack>
          </Paper>
        </Portal>
      </>
    );
  }
  return (
    <span data-adapttable-part="row-move-menu">
      <Menu
        withinPortal
        position="bottom-start"
        shadow="sm"
        opened={opened}
        onChange={setMenuOpen}
        closeOnItemClick={false}
      >
        <Menu.Target>
          <ActionIcon
            ref={triggerRef}
            type="button"
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={opened}
            data-adapttable-part="row-move-menu-trigger"
          >
            ⋮
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown
          aria-label={label}
          data-adapttable-part="row-move-menu-content"
          miw="12rem"
          p="xs"
        >
          {items.map((item) => (
            <Menu.Item
              key={item.id}
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
          ))}
        </Menu.Dropdown>
      </Menu>
    </span>
  );
}

/**
 * The drag handle for reordering a row.
 *
 * @public
 */
export const RowReorderHandle = /* @__PURE__ */ createRowReorderHandle({
  IconButton,
  MoveMenu: RowMoveMenu,
});

/**
 * Keyboard-reachable move-up and move-down for a row.
 *
 * @public
 */
export const RowReorderButtons = /* @__PURE__ */ createRowReorderButtons({
  IconButton: TouchIconButton,
  MoveMenu: RowMoveMenu,
});

/** This kit's controls for the editable-cell gate. */
export const editableCellSlots: EditableCellSlots =
  /* @__PURE__ */ createEditableCellSlots({ Button });
