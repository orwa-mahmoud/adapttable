/** The pivot configuration panel, in Chakra UI. */
import {
  type PivotAddProps,
  type PivotAggProps,
  type PivotFieldProps,
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
  type PivotPanelSurfaceProps,
  type PivotZoneProps,
} from "@adapttable/core/adapter";
import { Button, HStack, Stack, Text } from "@chakra-ui/react";

import { subtleText } from "../styles";
import { NativeSelect } from "./primitives";

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...rest }: PivotPanelSurfaceProps) => (
    <Stack gap={3} className={className} {...rest}>
      {children}
    </Stack>
  ),
  // `fieldset`/`legend` are how a screen reader learns which zone a field sits
  // in. Chakra's reset strips the browser's frame with them, which leaves three
  // unbounded lists — so the box comes back in Chakra's own tokens.
  Zone: ({ label, children, zone, ...rest }: PivotZoneProps) => (
    <Stack
      as="fieldset"
      gap={1}
      data-pivot-zone={zone}
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      minInlineSize={0}
      px={3}
      pt={1}
      pb={3}
      {...rest}
    >
      <Text
        as="legend"
        fontSize="xs"
        fontWeight="semibold"
        px={1}
        {...subtleText}
      >
        {label}
      </Text>
      {children}
    </Stack>
  ),
  Field: ({
    label,
    onMoveUp,
    onMoveDown,
    onRemove,
    moveUpLabel,
    moveDownLabel,
    removeLabel,
    aggregation,
    ...rest
  }: PivotFieldProps) => (
    <HStack gap={1} {...rest}>
      <Text fontSize="sm" flex="1">
        {label}
      </Text>
      {aggregation}
      <Button
        size="xs"
        variant="outline"
        aria-label={`${moveUpLabel}: ${label}`}
        disabled={!onMoveUp}
        onClick={onMoveUp}
      >
        {"↑"}
      </Button>
      <Button
        size="xs"
        variant="outline"
        aria-label={`${moveDownLabel}: ${label}`}
        disabled={!onMoveDown}
        onClick={onMoveDown}
      >
        {"↓"}
      </Button>
      <Button
        size="xs"
        variant="outline"
        aria-label={`${removeLabel}: ${label}`}
        onClick={onRemove}
      >
        {"✕"}
      </Button>
    </HStack>
  ),
  Add: ({ label, options, onAdd }: PivotAddProps) => (
    <NativeSelect
      size="xs"
      aria-label={label}
      value=""
      placeholder={label}
      onChange={(event) => {
        if (event.target.value) onAdd(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  ),
  Agg: ({ label, value, options, onChange }: PivotAggProps) => (
    <NativeSelect
      size="xs"
      w="90px"
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value as (typeof options)[number]);
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </NativeSelect>
  ),
};

/**
 * Configure a pivot: three zones, and buttons that move fields between them.
 *
 * @public
 */
export function PivotPanel(
  props: Readonly<Omit<PivotPanelChromeProps, "slots">>
) {
  return <PivotPanelChrome {...props} slots={slots} />;
}
