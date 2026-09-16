/** The interactive row-grouping panel, in Base UI. */
import {
  GripIcon,
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

import { Button, IconButton, Text } from "../ui";
import { NativeSelect } from "./primitives";

/** Closed add control: the shown placeholder plus the kit chevron. */
function addControlWidth(label: string): string {
  return `calc(${Math.max(label.length, 1)}ch + 2.75rem)`;
}

const slots: GroupingPanelSlots = {
  Surface: ({
    children,
    label,
    mobile,
    ...rest
  }: GroupingPanelSurfaceProps) => (
    <section
      aria-label={label}
      className="adapttable-grouping-panel"
      data-mobile={mobile ? true : undefined}
      {...rest}
    >
      {children}
    </section>
  ),
  DropZone: ({
    label,
    empty,
    active,
    dragging,
    dropProps,
    ...rest
  }: GroupingPanelDropZoneProps) => (
    <fieldset
      aria-label={label}
      className="adapttable-grouping-drop-zone"
      data-empty={empty ? true : undefined}
      data-active={active ? true : undefined}
      data-dragging={dragging ? true : undefined}
      {...dropProps}
      {...rest}
    >
      {empty ? label : <span aria-hidden="true" />}
    </fieldset>
  ),
  Chip: ({
    label,
    level,
    dragProps,
    keyboardProps,
    onRemove,
    removeLabel,
    ...rest
  }: GroupingPanelChipProps) => (
    <span className="adapttable-grouping-chip" data-level={level} {...rest}>
      <Button
        type="button"
        size="1"
        variant="ghost"
        data-adapttable-part="grouping-chip-handle"
        className="adapttable-grouping-chip__handle"
        {...dragProps}
        {...keyboardProps}
      >
        <GripIcon />
        <span>{label}</span>
      </Button>
      <IconButton
        type="button"
        size="1"
        variant="ghost"
        color="gray"
        data-adapttable-part="grouping-chip-remove"
        aria-label={removeLabel}
        className="adapttable-grouping-chip__remove"
        data-no-group-drag=""
        onClick={onRemove}
      >
        {"\u00d7"}
      </IconButton>
    </span>
  ),
  Select: ({
    label,
    value,
    options,
    onChange,
    disabled,
    ...rest
  }: GroupingPanelSelectProps) => (
    <NativeSelect
      size="1"
      aria-label={label}
      value={value}
      placeholder={label}
      disabled={disabled}
      options={options}
      onValueChange={onChange}
      {...rest}
      width={
        rest["data-adapttable-part"] === "grouping-add"
          ? addControlWidth(label)
          : undefined
      }
    />
  ),
  RemoveZone: ({
    label,
    active,
    dropProps,
    ...rest
  }: GroupingPanelRemoveZoneProps) => (
    <fieldset
      aria-label={label}
      className="adapttable-grouping-remove-zone"
      data-active={active ? true : undefined}
      {...dropProps}
      {...rest}
    >
      {label}
    </fieldset>
  ),
  AggregationItem: ({
    label,
    readOnly,
    readOnlyLabel,
    children,
    ...rest
  }: GroupingPanelAggregationItemProps) => (
    <span
      className="adapttable-grouping-aggregation-item"
      data-read-only={readOnly || undefined}
      {...rest}
    >
      <Text>{label}</Text>
      {readOnly ? <Text>{readOnlyLabel}</Text> : children}
    </span>
  ),
  AggregationRemove: ({
    label,
    onRemove,
    ...rest
  }: GroupingPanelAggregationRemoveProps) => (
    <IconButton aria-label={label} onClick={onRemove} {...rest}>
      {"\u00d7"}
    </IconButton>
  ),
  AggregationPicker: ({
    label,
    options,
    onToggle,
    disabled,
    ...rest
  }: GroupingPanelChecklistProps) => {
    const available = options.filter((option) => !option.checked);
    return (
      <NativeSelect
        size="1"
        aria-label={label}
        value=""
        placeholder={label}
        disabled={disabled === true || available.length === 0}
        options={available}
        onValueChange={(value) => {
          if (value) onToggle(value, true);
        }}
        className="adapttable-btn"
        {...rest}
        width={addControlWidth(label)}
      />
    );
  },
  AggregationRestore: ({
    label,
    disabled,
    onRestore,
    ...rest
  }: GroupingPanelRestoreProps) => (
    <Button variant="outline" disabled={disabled} onClick={onRestore} {...rest}>
      {label}
    </Button>
  ),
};

/**
 * Configure row grouping by adding, reordering, and removing columns.
 *
 * @public
 */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
) {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
