/** The interactive row-grouping strip, in native HTML. */
import {
  type GroupingPanelAggregationItemProps,
  type GroupingPanelAggregationRemoveProps,
  type GroupingPanelChecklistProps,
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelRestoreProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "@adapttable/react/adapter";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import type { DataTableClassNames } from "../types";
import { useClassNames } from "./classNamesContext";

/**
 * Core owns two structural wrappers inside the surface. Add this kit's class
 * hooks without moving that structure out of shared chrome.
 */
function classChromeWrapper(
  child: ReactNode,
  classNames: DataTableClassNames
): ReactElement {
  if (!isValidElement<Record<string, unknown>>(child)) return <>{child}</>;
  const part = child.props["data-adapttable-part"];
  let className: string | undefined;
  if (part === "grouping-item") {
    className = classNames.groupingItem;
  } else if (part === "grouping-aggregations") {
    className = classNames.groupingAggregations;
  }
  return cloneElement(child, className ? { className } : {});
}

function classChromeWrappers(
  children: ReactNode,
  classNames: DataTableClassNames
): ReactNode {
  return Children.map(children, (child) =>
    classChromeWrapper(child, classNames)
  );
}

function Surface({
  children,
  label,
  mobile,
  ...rest
}: Readonly<GroupingPanelSurfaceProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <section
      aria-label={label}
      data-mobile={mobile || undefined}
      className={classNames.groupingPanel}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
      {...rest}
    >
      {classChromeWrappers(children, classNames)}
    </section>
  );
}

function DropZone({
  label,
  empty,
  active,
  dragging,
  dropProps,
  ...rest
}: Readonly<GroupingPanelDropZoneProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <fieldset
      aria-label={label}
      data-empty={empty || undefined}
      data-active={active || undefined}
      data-dragging={dragging || undefined}
      className={classNames.groupingDropZone}
      // The way out of a grouping owns its row: a reader with a chip in the
      // air has one obvious place to let go of it.
      style={{
        border: 0,
        margin: 0,
        padding: 0,
        minInlineSize: 0,
        flex: "1 1 auto",
      }}
      {...dropProps}
      {...rest}
    >
      {empty ? label : <span aria-hidden="true">│</span>}
    </fieldset>
  );
}

function Chip({
  label,
  level,
  dragProps,
  keyboardProps,
  onRemove,
  removeLabel,
  ...rest
}: Readonly<GroupingPanelChipProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <span
      data-level={level}
      className={classNames.groupingChip}
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      {...rest}
    >
      <button
        type="button"
        data-adapttable-part="grouping-chip-handle"
        className={classNames.groupingChipHandle}
        {...dragProps}
        {...keyboardProps}
      >
        <span aria-hidden="true">⋮⋮</span> {label}
      </button>
      <button
        type="button"
        aria-label={removeLabel}
        data-adapttable-part="grouping-chip-remove"
        className={classNames.groupingChipRemove}
        onClick={onRemove}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </span>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
  "data-adapttable-part": part,
}: Readonly<GroupingPanelSelectProps>): ReactElement {
  const classNames = useClassNames();
  const className = {
    "grouping-add": classNames.groupingAdd,
    "grouping-aggregation-operation": classNames.groupingAggregationOperation,
  }[part];
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      data-adapttable-part={part}
      className={className}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {part === "grouping-add" ? <option value="">{label}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RemoveZone({
  label,
  active,
  dropProps,
  ...rest
}: Readonly<GroupingPanelRemoveZoneProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <fieldset
      aria-label={label}
      data-active={active || undefined}
      className={classNames.groupingRemoveZone}
      style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }}
      {...dropProps}
      {...rest}
    >
      {label}
    </fieldset>
  );
}

function AggregationItem({
  label,
  readOnly,
  readOnlyLabel,
  children,
  ...rest
}: Readonly<GroupingPanelAggregationItemProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <span
      data-read-only={readOnly || undefined}
      className={classNames.groupingAggregationItem}
      {...rest}
    >
      <span>{label}</span>
      {readOnly ? <span>{readOnlyLabel}</span> : children}
    </span>
  );
}

function AggregationRemove({
  label,
  onRemove,
  ...rest
}: Readonly<GroupingPanelAggregationRemoveProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onRemove}
      className={classNames.groupingAggregationRemove}
      {...rest}
    >
      {"\u00d7"}
    </button>
  );
}

function AggregationPicker({
  label,
  options,
  onToggle,
  disabled,
  ...rest
}: Readonly<GroupingPanelChecklistProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <fieldset
      aria-label={label}
      className={classNames.groupingAggregationAdd}
      style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }}
      {...rest}
    >
      <span>{label}</span>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="checkbox"
            checked={option.checked}
            disabled={disabled}
            aria-label={option.label}
            onChange={(event) => onToggle(option.value, event.target.checked)}
            data-adapttable-part="grouping-aggregation-option"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

function AggregationRestore({
  label,
  disabled,
  onRestore,
  ...rest
}: Readonly<GroupingPanelRestoreProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onRestore}
      className={classNames.groupingAggregationsRestore}
      {...rest}
    >
      {label}
    </button>
  );
}

const slots: GroupingPanelSlots = {
  Surface,
  DropZone,
  Chip,
  Select,
  RemoveZone,
  AggregationItem,
  AggregationRemove,
  AggregationPicker,
  AggregationRestore,
};

/** Configure row grouping with native, keyboard-complete controls. @public */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
): ReactNode {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
