/** The interactive row-grouping panel, in Base UI. */
import {
  GripIcon,
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "@adapttable/core/adapter";

import { Button, IconButton, Text } from "../ui";
import { NativeSelect } from "./primitives";

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
      <Text
        as="span"
        size="1"
        weight="bold"
        color="gray"
        className="adapttable-grouping-panel__label"
      >
        {label}
      </Text>
      {children}
    </section>
  ),
  DropZone: ({
    label,
    empty,
    active,
    dropProps,
    ...rest
  }: GroupingPanelDropZoneProps) => (
    <div
      role="group"
      aria-label={label}
      className="adapttable-grouping-drop-zone"
      data-empty={empty ? true : undefined}
      data-active={active ? true : undefined}
      {...dropProps}
      {...rest}
    >
      {empty ? label : <span aria-hidden="true" />}
    </div>
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
    />
  ),
  RemoveZone: ({
    label,
    active,
    dropProps,
    ...rest
  }: GroupingPanelRemoveZoneProps) => (
    <div
      role="group"
      aria-label={label}
      className="adapttable-grouping-remove-zone"
      data-active={active ? true : undefined}
      {...dropProps}
      {...rest}
    >
      {label}
    </div>
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
