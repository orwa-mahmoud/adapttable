/** Interactive row-grouping chrome rendered with Mantine controls. */
import {
  GripIcon,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelSlots,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  MultiSelect,
  Paper,
  Select,
  Text,
} from "@mantine/core";

const TOUCH_SIZE = 44;

/** Closed add control: the shown placeholder plus the kit chevron. */
function addControlWidth(label: string): string {
  return `calc(${Math.max(label.length, 1)}ch + 2.75rem)`;
}
/** A caret between chips, grown into something aimable mid-drag. */
// One width, dragging or not. A caret that grows when a drag starts shoves
// every chip after it sideways, and the reader is then aiming at a chip that
// has moved — which is why the drop is taken by the chip and the strip too.
const CARET = 10;

/**
 * How wide one insertion boundary is.
 *
 * A caret between chips at rest, an aimable target while a drag is in
 * flight, and the full placeholder when the strip has nothing in it.
 */
function dropZoneWidth(empty: boolean): number {
  return empty ? 132 : CARET;
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
        align="center"
        wrap="wrap"
        data-mobile={mobile || undefined}
        styles={{
          root: {
            minWidth: 0,
          },
        }}
      >
        {children}
      </Group>
    </Paper>
  ),
  DropZone: ({ label, empty, active, dragging, dropProps, ...rest }) => (
    <Box
      aria-label={label}
      mih={empty ? TOUCH_SIZE : 28}
      miw={dropZoneWidth(empty)}
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
      data-dragging={dragging || undefined}
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
  }) => {
    const addControl = part === "grouping-add";
    return (
      <Select
        aria-label={label}
        data-adapttable-part={part}
        size="sm"
        w={addControl ? addControlWidth(label) : undefined}
        maw={addControl ? "100%" : undefined}
        flex={addControl ? "0 0 auto" : "0 1 auto"}
        value={addControl && value === "" ? null : value}
        placeholder={addControl ? label : undefined}
        disabled={disabled}
        allowDeselect={false}
        data={options.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        comboboxProps={{ withinPortal: false }}
        variant={addControl ? "default" : "unstyled"}
        styles={{
          root: addControl ? undefined : { width: "auto", maxWidth: "8.5rem" },
          input: {
            minHeight: addControl ? TOUCH_SIZE : 32,
            minWidth: addControl ? undefined : "4.75rem",
            paddingInline: addControl ? undefined : 6,
            fontWeight: addControl ? undefined : 500,
          },
        }}
        onChange={(next) => {
          if (next !== null) onChange(next);
        }}
      />
    );
  },
  RemoveZone: ({ label, active, dropProps, ...rest }) => (
    <Paper
      role="region"
      aria-label={label}
      withBorder
      radius="md"
      mih={TOUCH_SIZE}
      px="sm"
      style={{
        // The way out of a grouping owns its row: a reader with a chip in the
        // air has one obvious place to let go of it.
        flex: "1 1 auto",
        alignSelf: "stretch",
        display: "grid",
        placeItems: "center",
        // Dashed and in the danger colour before the pointer arrives: this
        // target only exists mid-drag, and it has to say what it does.
        borderStyle: "dashed",
        borderColor: "var(--mantine-color-red-filled)",
        background: active ? "var(--mantine-color-red-light)" : undefined,
        color: "var(--mantine-color-red-filled)",
      }}
      {...dropProps}
      {...rest}
    >
      <Text size="xs" fw={600}>
        {label}
      </Text>
    </Paper>
  ),
  AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...rest }) => (
    <Group
      gap={0}
      wrap="nowrap"
      pl={12}
      pr={4}
      mih={36}
      maw="100%"
      style={{
        borderRadius: 999,
        background: "var(--mantine-color-default-hover)",
        minWidth: 0,
      }}
      data-read-only={readOnly || undefined}
      {...rest}
    >
      <Text
        size="sm"
        fw={600}
        pr={readOnly ? 8 : 0}
        style={{ whiteSpace: "nowrap" }}
      >
        {label}
      </Text>
      {readOnly ? (
        <Text size="xs" c="dimmed" pr={8} style={{ whiteSpace: "nowrap" }}>
          {readOnlyLabel}
        </Text>
      ) : (
        <>
          <Box
            aria-hidden
            w={1}
            h={14}
            mx={4}
            style={{ background: "var(--mantine-color-default-border)" }}
          />
          {children}
        </>
      )}
    </Group>
  ),
  AggregationRemove: ({ label, onRemove, ...rest }) => (
    <ActionIcon
      variant="subtle"
      color="gray"
      w={TOUCH_SIZE}
      h={TOUCH_SIZE}
      aria-label={label}
      onClick={onRemove}
      {...rest}
    >
      ×
    </ActionIcon>
  ),
  AggregationPicker: ({ label, options, onToggle, disabled, ...rest }) => {
    const available = options.filter((option) => !option.checked);
    return (
      <MultiSelect
        aria-label={label}
        placeholder={label}
        size="sm"
        searchable
        maxDropdownHeight={240}
        disabled={disabled === true || available.length === 0}
        data={available.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={[]}
        onChange={(values) => {
          for (const value of values) onToggle(value, true);
        }}
        comboboxProps={{ withinPortal: false }}
        nothingFoundMessage={label}
        style={{
          flex: "0 0 auto",
          width: addControlWidth(label),
          maxWidth: "100%",
        }}
        styles={{ input: { minHeight: TOUCH_SIZE } }}
        {...rest}
      />
    );
  },
  AggregationRestore: ({ label, disabled, onRestore, ...rest }) => (
    <Button
      variant="light"
      size="compact-sm"
      radius="xl"
      mih={TOUCH_SIZE}
      disabled={disabled}
      onClick={onRestore}
      {...rest}
    >
      {label}
    </Button>
  ),
};

/** Render the interactive grouping strip with Mantine-native controls. @public */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
) {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
