/** The toolbar, laid out by the binding and drawn with antd's controls. */
import {
  createToolbar,
  type KitButtonProps,
  type KitFiltersButtonProps,
  type KitRowsPerPageProps,
  type KitToolbarFrameProps,
  type KitToolbarProps,
  type KitToolbarSearchProps,
  type KitToolbarSortProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import {
  Badge,
  Button as AntButton,
  Flex,
  Input,
  type InputRef,
  Select,
  Spin,
} from "antd";
import { createContext, forwardRef, useContext } from "react";

import { FiltersIcon, SearchIcon } from "../icons";

/** Whether rows already shown are being refreshed, for the frame's spinner. */
const Refreshing = /* @__PURE__ */ createContext<{
  readonly busy: boolean;
  readonly label: string;
}>({ busy: false, label: "" });

function Frame({ start, search, controls }: Readonly<KitToolbarFrameProps>) {
  const refreshing = useContext(Refreshing);
  return (
    <Flex gap="small" wrap align="center" justify="space-between">
      {start}
      {search}
      <Flex gap="small" wrap align="center">
        {refreshing.busy && <Spin size="small" aria-label={refreshing.label} />}
        {controls}
      </Flex>
    </Flex>
  );
}

const SEARCH_BOX = { flex: 1, minWidth: 160, maxWidth: 360 } as const;

/** Names the wrapper and the icon antd draws around its input. */
function nameSearchParts(input: InputRef | null): void {
  if (input?.nativeElement) {
    input.nativeElement.dataset.adapttablePart = "search-field";
  }
  const icon = input?.input?.previousElementSibling;
  if (icon instanceof HTMLElement) {
    icon.dataset.adapttablePart = "search-icon";
  }
}

function Search({ input }: Readonly<KitToolbarSearchProps>) {
  "use no memo";
  return (
    <Input
      type="search"
      data-adapttable-part="search"
      ref={nameSearchParts}
      allowClear
      prefix={<SearchIcon size={14} />}
      style={SEARCH_BOX}
      aria-label={input["aria-label"]}
      value={input.value}
      placeholder={input.placeholder}
      onChange={input.onChange}
    />
  );
}

const SORT_SELECT = { minWidth: 160 } as const;

function SortSelect({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitToolbarSortProps>) {
  "use no memo";
  return (
    <Select
      style={SORT_SELECT}
      aria-label={label}
      placeholder={label}
      allowClear
      value={value || undefined}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      onChange={(next?: string) => onValueChange(next)}
    />
  );
}

/** The toolbar's buttons: add-row primary at antd's size, the rest small. */
const Button = forwardRef<HTMLButtonElement, KitButtonProps>(function Button(
  {
    elementRef,
    variant,
    tone: _tone,
    fullWidth: _fullWidth,
    justify: _justify,
    busy,
    type: htmlType = "button",
    ...rest
  },
  ref
) {
  "use no memo";
  const primary = variant === "filled";
  return (
    <AntButton
      ref={mergeRefs(ref, elementRef)}
      htmlType={htmlType}
      size={primary ? undefined : "small"}
      type={primary ? "primary" : "default"}
      loading={busy}
      {...rest}
    />
  );
});

const FiltersButton = forwardRef<HTMLButtonElement, KitFiltersButtonProps>(
  function FiltersButton(
    {
      elementRef,
      label,
      count,
      expanded,
      open,
      onPointerDown,
      onClick,
      ...target
    },
    ref
  ) {
    return (
      <Badge count={count} size="small">
        <AntButton
          ref={mergeRefs(ref, elementRef)}
          icon={<FiltersIcon size={16} />}
          aria-expanded={expanded}
          data-adapttable-part="filters-button"
          data-active={open || undefined}
          onPointerDown={onPointerDown}
          onClick={onClick}
          {...target}
        >
          {label}
        </AntButton>
      </Badge>
    );
  }
);

const ROWS_PER_PAGE = { minWidth: 110 } as const;

function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <Select
      style={ROWS_PER_PAGE}
      aria-label={label}
      value={value}
      options={options.map((size) => ({ value: size, label: String(size) }))}
      onChange={(next: number) => onValueChange(next)}
    />
  );
}

const KitToolbar = /* @__PURE__ */ createToolbar({
  Frame,
  Search,
  SortSelect,
  Button,
  FiltersButton,
  filtersPopover: "wrap",
  RowsPerPage,
});

/** The props of antd's toolbar: the binding's, plus the refresh state. */
export interface ToolbarProps<TRow> extends KitToolbarProps<TRow> {
  /** Whether rows already shown are being refreshed. */
  readonly isRefreshing: boolean;
}

/** The toolbar, with a spinner among its controls while rows refresh. */
export function Toolbar<TRow>({
  isRefreshing,
  ...props
}: Readonly<ToolbarProps<TRow>>) {
  return (
    <Refreshing.Provider
      value={{ busy: isRefreshing, label: props.table.labels.loading }}
    >
      <KitToolbar {...props} />
    </Refreshing.Provider>
  );
}
