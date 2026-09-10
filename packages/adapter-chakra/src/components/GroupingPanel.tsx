/** Interactive row-grouping chrome rendered with Chakra UI controls. */
import {
  GripIcon,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelSlots,
} from "@adapttable/react/adapter";
import {
  Box,
  Button,
  Field,
  Flex,
  HStack,
  IconButton,
  Text,
} from "@chakra-ui/react";

import { NativeSelect } from "./primitives";

const TOUCH_SIZE = "44px";

/** Closed add control: the shown placeholder plus the kit chevron. */
function addControlWidth(label: string): string {
  return `calc(${Math.max(label.length, 1)}ch + 2.75rem)`;
}
/** A caret between chips, grown into something aimable mid-drag. */
// One width, dragging or not: a caret that grows on dragstart moves the chips
// after it out from under the reader's cursor.
const CARET = "10px";

/**
 * How wide one insertion boundary is.
 *
 * A caret between chips at rest, an aimable target while a drag is in
 * flight, and the full placeholder when the strip has nothing in it.
 */
function dropZoneWidth(empty: boolean): string {
  return empty ? "132px" : CARET;
}

const slots: GroupingPanelSlots = {
  Surface: ({ children, label, mobile, ...rest }) => (
    <Box
      as="section"
      role="region"
      aria-label={label}
      borderWidth="1px"
      borderRadius="md"
      p={2}
      {...rest}
    >
      <Flex
        gap={2}
        align="center"
        wrap="wrap"
        data-mobile={mobile || undefined}
      >
        {children}
      </Flex>
    </Box>
  ),
  DropZone: ({ label, empty, active, dragging, dropProps, ...rest }) => (
    <Box
      aria-label={label}
      minH={empty ? TOUCH_SIZE : "28px"}
      minW={dropZoneWidth(empty)}
      px={empty ? 2 : 0.5}
      alignSelf="center"
      display="grid"
      placeItems="center"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor={active ? "colorPalette.solid" : "border"}
      borderRadius="sm"
      bg={active ? "colorPalette.subtle" : "transparent"}
      color="fg.muted"
      transition="background-color 120ms ease, border-color 120ms ease"
      {...dropProps}
      {...rest}
      data-dragging={dragging || undefined}
    >
      {empty ? (
        <Text fontSize="xs" textAlign="center">
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
    <HStack
      gap={1}
      p={1}
      borderWidth="1px"
      borderRadius="md"
      opacity={dragProps["data-grouping-dragging"] ? 0.5 : undefined}
      {...dragProps}
      {...rest}
    >
      <IconButton
        variant="ghost"
        data-adapttable-part="grouping-chip-handle"
        minW={TOUCH_SIZE}
        h={TOUCH_SIZE}
        cursor="grab"
        {...keyboardProps}
      >
        <GripIcon />
      </IconButton>
      <Text fontSize="sm" fontWeight="medium">
        {level}. {label}
      </Text>
      <IconButton
        variant="ghost"
        data-adapttable-part="grouping-chip-remove"
        minW={TOUCH_SIZE}
        h={TOUCH_SIZE}
        aria-label={removeLabel}
        onClick={onRemove}
      >
        ×
      </IconButton>
    </HStack>
  ),
  Select: ({
    label,
    value,
    options,
    onChange,
    disabled,
    "data-adapttable-part": part,
  }) => (
    <Field.Root
      w="auto"
      maxW="100%"
      disabled={disabled}
      style={
        part === "grouping-add"
          ? { width: addControlWidth(label), flex: "0 0 auto" }
          : undefined
      }
    >
      <NativeSelect
        size="sm"
        w={part === "grouping-add" ? addControlWidth(label) : "auto"}
        maxW="100%"
        minW={part === "grouping-add" ? undefined : "4.75rem"}
        minH={part === "grouping-add" ? TOUCH_SIZE : "32px"}
        aria-label={label}
        data-adapttable-part={part}
        value={value}
        placeholder={part === "grouping-add" ? label : undefined}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </Field.Root>
  ),
  RemoveZone: ({ label, active, dropProps, ...rest }) => (
    <Box
      role="region"
      aria-label={label}
      minH={TOUCH_SIZE}
      px={3}
      flex="1 1 auto"
      alignSelf="stretch"
      display="grid"
      placeItems="center"
      borderWidth="1px"
      borderStyle="dashed"
      borderRadius="md"
      borderColor="red.500"
      bg={active ? "red.subtle" : undefined}
      color="red.fg"
      {...dropProps}
      {...rest}
    >
      <Text fontSize="xs" fontWeight="semibold">
        {label}
      </Text>
    </Box>
  ),
  AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...rest }) => (
    <HStack
      gap={1}
      pl={3}
      pr={1}
      minH="36px"
      borderRadius="full"
      bg="bg.muted"
      maxW="100%"
      data-read-only={readOnly || undefined}
      {...rest}
    >
      <Text fontSize="sm" fontWeight="semibold" whiteSpace="nowrap">
        {label}
      </Text>
      {readOnly ? (
        <Text fontSize="xs" color="fg.muted">
          {readOnlyLabel}
        </Text>
      ) : (
        children
      )}
    </HStack>
  ),
  AggregationRemove: ({ label, onRemove, ...rest }) => (
    <IconButton
      variant="ghost"
      size="xs"
      minW={TOUCH_SIZE}
      minH={TOUCH_SIZE}
      aria-label={label}
      onClick={onRemove}
      {...rest}
    >
      {"\u00d7"}
    </IconButton>
  ),
  AggregationPicker: ({ label, options, onToggle, disabled, ...rest }) => {
    const available = options.filter((option) => !option.checked);
    return (
      <NativeSelect
        size="sm"
        minH={TOUCH_SIZE}
        w={addControlWidth(label)}
        maxW="100%"
        flex="0 0 auto"
        aria-label={label}
        placeholder={label}
        disabled={disabled === true || available.length === 0}
        value=""
        onChange={(event) => {
          const value = event.currentTarget.value;
          if (value) onToggle(value, true);
        }}
        {...rest}
      >
        {available.map((option) => (
          <option
            key={option.value}
            value={option.value}
            data-adapttable-part="grouping-aggregation-option"
          >
            {option.label}
          </option>
        ))}
      </NativeSelect>
    );
  },
  AggregationRestore: ({ label, disabled, onRestore, ...rest }) => (
    <Button
      variant="outline"
      size="xs"
      minH={TOUCH_SIZE}
      disabled={disabled}
      onClick={onRestore}
      {...rest}
    >
      {label}
    </Button>
  ),
};

/** Render the interactive grouping strip with Chakra-native controls. @public */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
) {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
