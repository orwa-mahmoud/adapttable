import {
  type FilterTreeBuilderProps,
  type FilterTreeButtonProps,
  FilterTreeChrome,
  type FilterTreeDisclosureProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "@adapttable/core/adapter";
import { Button, Collapse, Input, InputNumber, Select } from "antd";

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
      size="small"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      value={value}
      onChange={onChange}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
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
  if (type === "number") {
    return (
      <InputNumber
        size="small"
        aria-label={label}
        data-adapttable-part="filter-input"
        className={className}
        value={value === "" ? undefined : Number(value)}
        onChange={(next) => onChange(next == null ? "" : String(next))}
        style={{ flex: "1 1 7rem", minWidth: "7rem" }}
      />
    );
  }
  return (
    <Input
      size="small"
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
      type="default"
      size="small"
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
    <Collapse
      ghost
      size="small"
      className={className}
      activeKey={expanded ? ["advanced"] : []}
      data-adapttable-part="filter-tree"
      onChange={(keys) => onExpandedChange(keys.includes("advanced"))}
      style={{
        marginBlockEnd: 4,
        paddingBlockEnd: 16,
        borderBlockEnd: "1px solid var(--ant-color-border-secondary)",
      }}
      items={[
        {
          key: "advanced",
          label: (
            <span
              className={summaryClassName}
              data-adapttable-part="filter-tree-summary"
            >
              {label}
            </span>
          ),
          children,
        },
      ]}
    />
  );
}

const slots: FilterTreeSlots = {
  Select: TreeSelect,
  Input: TreeInput,
  Button: TreeButton,
  Disclosure: TreeDisclosure,
};

/**
 * Ant Design AND/OR builder — compact kit Select / Input / Button, no stacked labels.
 *
 * @public
 */
export function FilterTreeBuilder<TRow>(
  props: Readonly<FilterTreeBuilderProps<TRow>>
) {
  return <FilterTreeChrome {...props} slots={slots} />;
}
