/** The toolbar, drawn by the binding with Mantine's controls. */
import {
  createToolbar,
  type KitButtonProps,
  type KitFiltersButtonProps,
  type KitRowsPerPageProps,
  type KitToolbarFrameProps,
  type KitToolbarSearchProps,
  type KitToolbarSortProps,
} from "@adapttable/react/adapter";
import {
  Badge,
  Button as MantineButton,
  Group,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { type ButtonHTMLAttributes, forwardRef, type Ref } from "react";

import { FiltersIcon, SearchIcon } from "../icons";

/** Search on one side, the controls on the other. */
function Frame({ start, search, controls }: Readonly<KitToolbarFrameProps>) {
  "use no memo";
  return (
    <Group gap="sm" justify="space-between" align="center">
      {start}
      {search}
      <Group gap="xs" align="center">
        {controls}
      </Group>
    </Group>
  );
}

const SEARCH_WIDTH = { flex: 1, minWidth: 160, maxWidth: 360 } as const;
const SEARCH_ICON_PART = {
  section: { "data-adapttable-part": "search-icon" },
} as const;
const SEARCH_FIELD_PART = { "data-adapttable-part": "search-field" } as const;
const NO_PORTAL = { withinPortal: false } as const;

function Search({ input }: Readonly<KitToolbarSearchProps>) {
  "use no memo";
  return (
    <TextInput
      {...input}
      data-adapttable-part="search"
      wrapperProps={SEARCH_FIELD_PART}
      attributes={SEARCH_ICON_PART}
      leftSection={<SearchIcon size={14} />}
      size="sm"
      style={SEARCH_WIDTH}
    />
  );
}

function SortSelect({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitToolbarSortProps>) {
  "use no memo";
  return (
    <Select
      aria-label={label}
      placeholder={label}
      data={options}
      value={value || null}
      onChange={(next) => onValueChange(next ?? undefined)}
      clearable
      size="sm"
      w={160}
      comboboxProps={NO_PORTAL}
    />
  );
}

/**
 * The toolbar's button: default, or light for add-row. While busy it shows
 * Mantine's own loader, which reads as "working" rather than as switched off.
 */
export function Button({
  elementRef,
  variant,
  tone: _tone,
  justify: _justify,
  fullWidth: _fullWidth,
  busy,
  ...rest
}: Readonly<KitButtonProps>) {
  "use no memo";
  return (
    <MantineButton
      ref={elementRef}
      type="button"
      size="sm"
      variant={variant === "filled" ? "light" : "default"}
      loading={busy}
      {...rest}
    />
  );
}

/**
 * The filters button, with the active count in a badge. The popover wraps it:
 * it anchors through the forwarded ref and adds its own ARIA (popup, controls,
 * id) on top of the button's.
 */
const FiltersButton = forwardRef(function FiltersButton(
  {
    elementRef,
    label,
    count,
    expanded,
    open,
    onPointerDown,
    onClick,
    ...target
  }: Readonly<
    KitFiltersButtonProps &
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof KitFiltersButtonProps>
  >,
  ref: Ref<HTMLButtonElement>
) {
  "use no memo";
  return (
    <MantineButton
      ref={(node: HTMLButtonElement | null) => {
        assign(elementRef, node);
        assign(ref, node);
      }}
      variant="default"
      size="sm"
      aria-expanded={expanded}
      data-active={open || undefined}
      leftSection={<FiltersIcon size={16} />}
      rightSection={
        count > 0 ? (
          <Badge size="sm" circle>
            {count}
          </Badge>
        ) : undefined
      }
      onPointerDown={onPointerDown}
      onClick={onClick}
      {...target}
    >
      {label}
    </MantineButton>
  );
});

function assign<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <Group gap="xs" align="center">
      <Text fz="xs" c="dimmed">
        {label}
      </Text>
      <Select
        aria-label={label}
        data={options.map((size) => ({
          value: String(size),
          label: String(size),
        }))}
        value={String(value)}
        onChange={(next) => onValueChange(Number(next))}
        size="sm"
        w={80}
        allowDeselect={false}
        comboboxProps={NO_PORTAL}
      />
    </Group>
  );
}

/** The toolbar: search, sort, filters, menus, extras and page size. */
export const Toolbar = /* @__PURE__ */ createToolbar({
  Frame,
  Search,
  SortSelect,
  Button,
  FiltersButton,
  filtersPopover: "wrap",
  RowsPerPage,
});
