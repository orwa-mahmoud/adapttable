/** Interactive row-grouping chrome rendered with Mantine controls. */
import {
  GripIcon,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelSlots,
} from "@adapttable/react/adapter";
import { ActionIcon, Box, Group, Paper, Select, Text } from "@mantine/core";

const TOUCH_SIZE = 44;
/** A caret between chips, grown into something aimable mid-drag. */
const DRAG_TARGET = 28;

/**
 * How wide one insertion boundary is.
 *
 * A caret between chips at rest, an aimable target while a drag is in
 * flight, and the full placeholder when the strip has nothing in it.
 */
function dropZoneWidth(empty: boolean, dragging: boolean): number {
  if (empty) return 132;
  return dragging ? DRAG_TARGET : 10;
}

const slots: GroupingPanelSlots = {
  Surface: ({ children, label, mobile, ...rest }) => (
    <Paper
      component="section"
      role="region"
      aria-label={label}
      withBorder
      radius="md"
      p="xs"
      {...rest}
    >
      <Group
        gap="xs"
        align="flex-end"
        wrap="wrap"
        data-mobile={mobile || undefined}
      >
        {children}
      </Group>
    </Paper>
  ),
  DropZone: ({ label, empty, active, dragging, dropProps, ...rest }) => (
    <Box
      aria-label={label}
      mih={empty ? TOUCH_SIZE : 28}
      miw={dropZoneWidth(empty, dragging)}
      px={empty ? "xs" : 2}
      style={{
        alignSelf: "center",
        display: "grid",
        placeItems: "center",
        border: `1px dashed ${
          active
            ? "var(--mantine-primary-color-filled)"
            : "var(--mantine-color-default-border)"
        }`,
        borderRadius: "var(--mantine-radius-sm)",
        background: active
          ? "var(--mantine-primary-color-light)"
          : "transparent",
        color: "var(--mantine-color-dimmed)",
        transition: "background-color 120ms ease, border-color 120ms ease",
      }}
      {...dropProps}
      {...rest}
    >
      {empty ? (
        <Text size="xs" ta="center">
          {label}
        </Text>
      ) : null}
    </Box>
  ),
  Chip: ({
    label,
    level,
    dragProps,
    keyboardProps,
    onRemove,
    removeLabel,
    ...rest
  }) => (
    <Group
      gap={4}
      wrap="nowrap"
      p={4}
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
        opacity: dragProps["data-grouping-dragging"] ? 0.5 : undefined,
      }}
      {...dragProps}
      {...rest}
    >
      <ActionIcon
        variant="subtle"
        color="gray"
        data-adapttable-part="grouping-chip-handle"
        w={TOUCH_SIZE}
        h={TOUCH_SIZE}
        style={{ cursor: "grab" }}
        {...keyboardProps}
      >
        <GripIcon />
      </ActionIcon>
      <Text size="sm" fw={500}>
        {level}. {label}
      </Text>
      <ActionIcon
        variant="subtle"
        color="gray"
        data-adapttable-part="grouping-chip-remove"
        w={TOUCH_SIZE}
        h={TOUCH_SIZE}
        aria-label={removeLabel}
        onClick={onRemove}
      >
        ×
      </ActionIcon>
    </Group>
  ),
  Select: ({
    label,
    value,
    options,
    onChange,
    disabled,
    "data-adapttable-part": part,
  }) => (
    <Select
      label={label}
      aria-label={label}
      data-adapttable-part={part}
      size="sm"
      miw={160}
      value={part === "grouping-add" && value === "" ? null : value}
      placeholder={part === "grouping-add" ? label : undefined}
      disabled={disabled}
      allowDeselect={false}
      data={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      comboboxProps={{ withinPortal: false }}
      styles={{ input: { minHeight: TOUCH_SIZE } }}
      onChange={(next) => {
        if (next !== null) onChange(next);
      }}
    />
  ),
  RemoveZone: ({ label, active, dropProps, ...rest }) => (
    <Paper
      role="region"
      aria-label={label}
      withBorder
      radius="md"
      mih={TOUCH_SIZE}
      px="sm"
      style={{
        alignSelf: "flex-end",
        display: "grid",
        placeItems: "center",
        borderColor: active
          ? "var(--mantine-color-red-filled)"
          : "var(--mantine-color-default-border)",
        background: active ? "var(--mantine-color-red-light)" : undefined,
        color: active
          ? "var(--mantine-color-red-filled)"
          : "var(--mantine-color-dimmed)",
      }}
      {...dropProps}
      {...rest}
    >
      <Text size="xs" fw={600}>
        {label}
      </Text>
    </Paper>
  ),
};

/** Render the interactive grouping strip with Mantine-native controls. @public */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
) {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
