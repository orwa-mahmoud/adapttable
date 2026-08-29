import {
  type FilterTreeBuilderProps,
  type FilterTreeButtonProps,
  FilterTreeChrome,
  type FilterTreeDisclosureProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "@adapttable/core/adapter";
import type { ChangeEvent } from "react";

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
    <select
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      value={value}
      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
        onChange(event.target.value)
      }
      style={{ flex: "0 1 8.5rem", minWidth: "8.5rem", maxWidth: "11rem" }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
    <input
      aria-label={label}
      data-adapttable-part="filter-input"
      className={className}
      type={type}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
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
    <button
      type="button"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
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
    <details
      open={expanded}
      className={className}
      data-adapttable-part="filter-tree"
      onToggle={(event) => onExpandedChange(event.currentTarget.open)}
      style={{
        marginBlockEnd: 4,
        paddingBlockEnd: 16,
        borderBlockEnd:
          "1px solid color-mix(in srgb, currentColor 14%, transparent)",
      }}
    >
      <summary
        className={summaryClassName}
        data-adapttable-part="filter-tree-summary"
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontWeight: 600,
          fontSize: "0.8125rem",
          paddingBlock: 4,
          listStyle: "none",
        }}
      >
        {label}
        <span aria-hidden>{expanded ? "▴" : "▾"}</span>
      </summary>
      {children}
    </details>
  );
}

const slots: FilterTreeSlots = {
  Select: TreeSelect,
  Input: TreeInput,
  Button: TreeButton,
  Disclosure: TreeDisclosure,
};

/**
 * Native AND/OR builder — compact unlabeled row; native is unstyled's kit.
 *
 * @public
 */
export function FilterTreeBuilder<TRow>(
  props: Readonly<FilterTreeBuilderProps<TRow>>
) {
  return <FilterTreeChrome {...props} slots={slots} />;
}
