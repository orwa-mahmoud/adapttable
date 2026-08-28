import {
  type FilterTreeBuilderProps,
  type FilterTreeButtonProps,
  FilterTreeChrome,
  type FilterTreeDisclosureProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "@adapttable/core/adapter";
import { Button, Select, TextInput } from "@mantine/core";

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
    <Select
      size="xs"
      comboboxProps={{ withinPortal: true, zIndex: 10051 }}
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      value={value}
      onChange={(next) => {
        if (next) onChange(next);
      }}
      data={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      allowDeselect={false}
      style={{ flex: "0 1 8.5rem", minWidth: "8.5rem", maxWidth: "11rem" }}
    />
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
    <TextInput
      size="xs"
      type={type}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      data-adapttable-part="filter-input"
      className={className}
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
      size="compact-xs"
      variant="default"
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
    <div
      className={className}
      data-adapttable-part="filter-tree"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBlockEnd: 4,
        paddingBlockEnd: 16,
        borderBlockEnd: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Button
        type="button"
        size="compact-sm"
        variant="transparent"
        color="gray"
        fullWidth
        justify="space-between"
        px={0}
        className={summaryClassName}
        aria-expanded={expanded}
        data-adapttable-part="filter-tree-summary"
        onClick={() => onExpandedChange(!expanded)}
      >
        {label}
        <span aria-hidden>{expanded ? "▴" : "▾"}</span>
      </Button>
      {expanded ? children : null}
    </div>
  );
}

const slots: FilterTreeSlots = {
  Select: TreeSelect,
  Input: TreeInput,
  Button: TreeButton,
  Disclosure: TreeDisclosure,
};

/**
 * Mantine AND/OR builder — compact kit Select / TextInput / Button, no stacked labels.
 *
 * @public
 */
export function FilterTreeBuilder<TRow>(
  props: Readonly<FilterTreeBuilderProps<TRow>>
) {
  return <FilterTreeChrome {...props} slots={slots} />;
}
