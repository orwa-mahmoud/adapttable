/** The toolbar, laid out by the binding and drawn with Radix's controls. */
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
  pageSizeOptions,
  SearchIcon,
} from "@adapttable/react/adapter";
import {
  Badge,
  Box,
  Button as UiButton,
  Flex,
  TextField,
} from "@radix-ui/themes";
import { createContext, forwardRef, useContext } from "react";

import { FiltersIcon } from "../icons";
import { useAccentColor } from "./accent";
import { NativeSelect, type SelectOption } from "./primitives";

/** Name the actual input wrapper owned by the kit. */
function nameSearchField(input: HTMLInputElement | null): void {
  input?.parentElement?.setAttribute("data-adapttable-part", "search-field");
}

export function pageSizeSelectOptions(
  limit: number,
  defaultLimit: number = limit
): SelectOption[] {
  return pageSizeOptions([limit, defaultLimit]).map((n) => ({
    value: String(n),
    label: String(n),
  }));
}

/** The host's class for the toolbar, handed to its frame. */
export const ToolbarClassName = /* @__PURE__ */ createContext<
  string | undefined
>(undefined);

function Frame({ start, search, controls }: Readonly<KitToolbarFrameProps>) {
  const className = useContext(ToolbarClassName);
  return (
    <Flex
      data-adapttable-part="toolbar"
      gap="2"
      wrap="wrap"
      justify="between"
      align="center"
      className={className}
    >
      {start}
      {search}
      <Flex gap="2" wrap="wrap" align="center">
        {controls}
      </Flex>
    </Flex>
  );
}

const SEARCH_BOX = { flex: 1, minWidth: 160, maxWidth: 360 } as const;

function Search({ input }: Readonly<KitToolbarSearchProps>) {
  "use no memo";
  return (
    <Box style={SEARCH_BOX}>
      <TextField.Root
        data-adapttable-part="search"
        ref={nameSearchField}
        size="2"
        aria-label={input["aria-label"]}
        type="search"
        value={input.value}
        placeholder={input.placeholder}
        onChange={input.onChange}
      >
        <TextField.Slot side="left" data-adapttable-part="search-icon">
          <SearchIcon />
        </TextField.Slot>
      </TextField.Root>
    </Box>
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
    <NativeSelect
      size="2"
      width="160px"
      aria-label={label}
      placeholder={label}
      value={value}
      // The kit's select has no empty option of its own; this one clears
      // the sort.
      options={[{ value: "", label }, ...options]}
      onValueChange={(next) => onValueChange(next || undefined)}
    />
  );
}

/** The toolbar's buttons: outlined; add-row solid in the table's accent. */
const Button = forwardRef<HTMLButtonElement, KitButtonProps>(function Button(
  {
    elementRef,
    variant,
    tone: _tone,
    fullWidth: _fullWidth,
    justify: _justify,
    busy,
    ...rest
  },
  ref
) {
  "use no memo";
  const accent = useAccentColor();
  return (
    <UiButton
      ref={mergeRefs(ref, elementRef)}
      type="button"
      size="2"
      variant={variant === "filled" ? "solid" : "outline"}
      color={variant === "filled" ? accent : undefined}
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
    const accent = useAccentColor();
    return (
      <UiButton
        ref={mergeRefs(ref, elementRef)}
        size="2"
        variant="outline"
        color={accent}
        aria-expanded={expanded}
        data-active={open || undefined}
        onPointerDown={onPointerDown}
        onClick={onClick}
        {...target}
      >
        <FiltersIcon />
        {label}
        {count > 0 && (
          <Badge color={accent} radius="full">
            {count}
          </Badge>
        )}
      </UiButton>
    );
  }
);

function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <NativeSelect
      size="2"
      width="90px"
      aria-label={label}
      value={String(value)}
      options={options.map((size) => ({
        value: String(size),
        label: String(size),
      }))}
      onValueChange={(next) => onValueChange(Number(next))}
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

/** The props of Radix's toolbar: the binding's, plus the host's class. */
export interface ToolbarProps<TRow> extends KitToolbarProps<TRow> {
  readonly className?: string;
}

/** The toolbar, with the host's class on its root. */
export function Toolbar<TRow>({
  className,
  ...props
}: Readonly<ToolbarProps<TRow>>) {
  return (
    <ToolbarClassName.Provider value={className}>
      <KitToolbar {...props} />
    </ToolbarClassName.Provider>
  );
}
