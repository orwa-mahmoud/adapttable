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

import { Checkbox, NativeSelect } from "./primitives";

const TOUCH_SIZE = "44px";
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
        align="flex-end"
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
    <Field.Root minW="160px" w="auto" disabled={disabled}>
      <Field.Label fontSize="xs">{label}</Field.Label>
      <NativeSelect
        size="sm"
        minW="160px"
        minH={TOUCH_SIZE}
        aria-label={label}
        data-adapttable-part={part}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {part === "grouping-add" ? <option value="">{label}</option> : null}
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
      px={2}
      py={1}
      borderWidth="1px"
      borderRadius="md"
      data-read-only={readOnly || undefined}
      {...rest}
    >
      <Text fontSize="sm" fontWeight="medium">
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
  AggregationPicker: ({ label, options, onToggle, disabled, ...rest }) => (
    <Flex
      as="fieldset"
      wrap="wrap"
      align="center"
      gap={2}
      aria-label={label}
      {...rest}
    >
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      {options.map((option) => (
        <Text as="label" key={option.value} fontSize="sm">
          <HStack gap={1}>
            <Checkbox
              size="sm"
              aria-label={option.label}
              checked={option.checked}
              onToggle={
                disabled
                  ? undefined
                  : () => onToggle(option.value, !option.checked)
              }
              data-adapttable-part="grouping-aggregation-option"
            />
            {option.label}
          </HStack>
        </Text>
      ))}
    </Flex>
  ),
  AggregationRestore: ({ label, disabled, onRestore, ...rest }) => (
    <Button
      variant="ghost"
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
