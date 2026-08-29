import {
  type FilterTreeBuilderProps,
  type FilterTreeButtonProps,
  FilterTreeChrome,
  type FilterTreeDisclosureProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "@adapttable/core/adapter";
import { Button, Input, Stack } from "@chakra-ui/react";

import { NativeSelect } from "./primitives";

export type { FilterTreeBuilderProps };

function TreeSelect({
  label,
  value,
  part,
  options,
  className,
  onChange,
}: FilterTreeSelectProps) {
  return (
    <NativeSelect
      size="sm"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      flex="0 1 8.5rem"
      minW="8.5rem"
      maxW="11rem"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

function TreeInput({
  label,
  value,
  type,
  className,
  onChange,
}: FilterTreeInputProps) {
  return (
    <Input
      size="sm"
      type={type}
      aria-label={label}
      data-adapttable-part="filter-input"
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{ flex: "1 1 7rem", minWidth: "7rem" }}
    />
  );
}

function TreeButton({
  label,
  part,
  className,
  onClick,
}: FilterTreeButtonProps) {
  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function TreeDisclosure({
  label,
  expanded,
  className,
  summaryClassName,
  children,
  onExpandedChange,
}: FilterTreeDisclosureProps) {
  return (
    <Stack
      gap={2}
      mb={1}
      pb={4}
      borderBottomWidth="1px"
      className={className}
      data-adapttable-part="filter-tree"
    >
      <Button
        type="button"
        size="xs"
        variant="ghost"
        justifyContent="space-between"
        className={summaryClassName}
        aria-expanded={expanded}
        data-adapttable-part="filter-tree-summary"
        onClick={() => onExpandedChange(!expanded)}
      >
        {label}
        <span aria-hidden>{expanded ? "▴" : "▾"}</span>
      </Button>
      {expanded ? children : null}
    </Stack>
  );
}

const slots: FilterTreeSlots = {
  Select: TreeSelect,
  Input: TreeInput,
  Button: TreeButton,
  Disclosure: TreeDisclosure,
};

/**
 * Chakra AND/OR builder — compact kit controls, no stacked field labels.
 *
 * @public
 */
export function FilterTreeBuilder<TRow>(
  props: Readonly<FilterTreeBuilderProps<TRow>>
) {
  return <FilterTreeChrome {...props} slots={slots} />;
}
