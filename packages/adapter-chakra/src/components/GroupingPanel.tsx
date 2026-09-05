/** Interactive row-grouping chrome rendered with Chakra UI controls. */
import {
  GripIcon,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelSlots,
} from "@adapttable/react/adapter";
import { Box, Field, Flex, HStack, IconButton, Text } from "@chakra-ui/react";

import { NativeSelect } from "./primitives";

const TOUCH_SIZE = "44px";

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
  DropZone: ({ label, empty, active, dropProps, ...rest }) => (
    <Box
      aria-label={label}
      minH={empty ? TOUCH_SIZE : "28px"}
      minW={empty ? "132px" : "10px"}
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
      {...(dropProps as Record<string, unknown>)}
      {...rest}
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
      alignSelf="flex-end"
      display="grid"
      placeItems="center"
      borderWidth="1px"
      borderRadius="md"
      borderColor={active ? "red.500" : "border"}
      bg={active ? "red.subtle" : undefined}
      color={active ? "red.fg" : "fg.muted"}
      {...(dropProps as Record<string, unknown>)}
      {...rest}
    >
      <Text fontSize="xs" fontWeight="semibold">
        {label}
      </Text>
    </Box>
  ),
};

/** Render the interactive grouping strip with Chakra-native controls. @public */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
) {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
