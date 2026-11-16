/** The toolbar, laid out by the binding and drawn with Chakra's controls. */
import {
  createToolbar,
  type KitFiltersButtonProps,
  type KitRowsPerPageProps,
  type KitToolbarFrameProps,
  type KitToolbarSearchProps,
  type KitToolbarSortProps,
  SearchIcon,
} from "@adapttable/react/adapter";
import {
  Badge,
  Button as ChakraButton,
  HStack,
  Input,
  InputGroup,
} from "@chakra-ui/react";
import { createContext, forwardRef, useContext } from "react";

import { FiltersIcon } from "../icons";
import { useAccentColor } from "./accent";
import { buttonOfSize } from "./kitPrimitives";
import { NativeSelect } from "./primitives";

const SEARCH_ICON_PROPS = {
  "data-adapttable-part": "search-icon",
  "aria-hidden": true,
} as const;

/** The host's class for the toolbar, handed to its frame. */
export const ToolbarClassName = /* @__PURE__ */ createContext<
  string | undefined
>(undefined);

function Frame({ start, search, controls }: Readonly<KitToolbarFrameProps>) {
  const className = useContext(ToolbarClassName);
  return (
    <HStack
      data-adapttable-part="toolbar"
      gap={2}
      flexWrap="wrap"
      rowGap={2}
      justify="space-between"
      align="center"
      className={className}
    >
      {start}
      {search}
      <HStack gap={2} flexWrap="wrap" rowGap={2} align="center">
        {controls}
      </HStack>
    </HStack>
  );
}

function Search({ input }: Readonly<KitToolbarSearchProps>) {
  "use no memo";
  return (
    <InputGroup
      data-adapttable-part="search-field"
      maxW="360px"
      flex="1"
      minW="160px"
      startElement={<SearchIcon />}
      startElementProps={SEARCH_ICON_PROPS}
    >
      <Input
        data-adapttable-part="search"
        size="sm"
        aria-label={input["aria-label"]}
        type="search"
        value={input.value}
        placeholder={input.placeholder}
        onChange={input.onChange}
      />
    </InputGroup>
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
      size="sm"
      w="160px"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(event) => onValueChange(event.target.value || undefined)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

/** The toolbar's buttons: small; add-row (filled) in the table's accent. */
const Button = /* @__PURE__ */ buttonOfSize("sm", useAccentColor);

const FiltersButton = forwardRef<HTMLButtonElement, KitFiltersButtonProps>(
  function FiltersButton(
    {
      elementRef: _elementRef,
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
      <ChakraButton
        ref={ref}
        size="sm"
        variant="outline"
        colorPalette={accent}
        aria-expanded={expanded}
        data-adapttable-part="filters-button"
        data-active={open || undefined}
        onPointerDown={onPointerDown}
        onClick={onClick}
        {...target}
      >
        <FiltersIcon />
        {label}
        {count > 0 && (
          <Badge ml={2} colorPalette={accent} borderRadius="full">
            {count}
          </Badge>
        )}
      </ChakraButton>
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
      size="sm"
      w="90px"
      aria-label={label}
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
    >
      {options.map((size) => (
        <option key={size} value={size}>
          {size}
        </option>
      ))}
    </NativeSelect>
  );
}

/** The toolbar; its frame takes the host's class from `ToolbarClassName`. */
export const Toolbar = /* @__PURE__ */ createToolbar({
  Frame,
  Search,
  SortSelect,
  Button,
  FiltersButton,
  filtersPopover: "wrap",
  RowsPerPage,
});
