import {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "@adapttable/core/adapter";
import { Flex, Text } from "@radix-ui/themes";

function Stats({ parts, className }: SelectionStatsSlotProps) {
  return (
    <Flex
      asChild
      gap="4"
      wrap="wrap"
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <output data-adapttable-part="selection-stats">
        {parts.map((part) => (
          <Text
            as="span"
            key={part.key}
            size="1"
            color="gray"
            data-adapttable-part="selection-stat"
          >
            {part.text}
          </Text>
        ))}
      </output>
    </Flex>
  );
}

/** The kit's stats rendering, shared with the status bar that hosts it. */
export const statsSlots: SelectionStatsSlots = { Stats };

/**
 * Radix-owned status bar for the headless selection statistics.
 *
 * @public
 */
export function SelectionStatsBar(
  props: Readonly<Omit<SelectionStatsChromeProps, "slots">>
) {
  return <SelectionStatsChrome {...props} slots={statsSlots} />;
}
