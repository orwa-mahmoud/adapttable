import {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "@adapttable/core/adapter";
import { HStack, Text } from "@chakra-ui/react";

function Stats({ parts, className }: SelectionStatsSlotProps) {
  return (
    <HStack
      as="output"
      gap={4}
      flexWrap="wrap"
      className={className}
      data-adapttable-part="selection-stats"
      fontVariantNumeric="tabular-nums"
    >
      {parts.map((part) => (
        <Text
          as="span"
          key={part.key}
          textStyle="xs"
          color="fg.muted"
          data-adapttable-part="selection-stat"
        >
          {part.text}
        </Text>
      ))}
    </HStack>
  );
}

/** The kit's stats rendering, shared with the status bar that hosts it. */
export const statsSlots: SelectionStatsSlots = { Stats };

/**
 * Chakra-owned status bar for the headless selection statistics.
 *
 * @public
 */
export function SelectionStatsBar(
  props: Readonly<Omit<SelectionStatsChromeProps, "slots">>
) {
  return <SelectionStatsChrome {...props} slots={statsSlots} />;
}
