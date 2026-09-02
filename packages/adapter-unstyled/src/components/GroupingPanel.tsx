/** The interactive row-grouping strip, in native HTML. */
import {
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "@adapttable/core/adapter";
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
  } else if (part === "grouping-aggregate-controls") {
    className = classNames.groupingAggregateControls;
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
  dropProps,
  ...rest
}: Readonly<GroupingPanelDropZoneProps>): ReactElement {
  const classNames = useClassNames();
  return (
    <div
      role="group"
      aria-label={label}
      data-empty={empty || undefined}
      data-active={active || undefined}
      className={classNames.groupingDropZone}
      {...dropProps}
      {...rest}
    >
      {empty ? label : <span aria-hidden="true">│</span>}
    </div>
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
    "grouping-aggregate-column": classNames.groupingAggregateColumn,
    "grouping-aggregate": classNames.groupingAggregate,
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
    <div
      role="group"
      aria-label={label}
      data-active={active || undefined}
      className={classNames.groupingRemoveZone}
      {...dropProps}
      {...rest}
    >
      {label}
    </div>
  );
}

const slots: GroupingPanelSlots = {
  Surface,
  DropZone,
  Chip,
  Select,
  RemoveZone,
};

/** Configure row grouping with native, keyboard-complete controls. @public */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
): ReactNode {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
