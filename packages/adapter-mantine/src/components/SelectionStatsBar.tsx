import {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "@adapttable/core/adapter";
import { Group, Text } from "@mantine/core";

function Stats({ parts, className }: SelectionStatsSlotProps) {
  return (
    <Group
      component="output"
      gap="xs"
      wrap="wrap"
      className={className}
      data-adapttable-part="selection-stats"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {parts.map((part) => (
        <Text
          component="span"
          key={part.key}
          size="xs"
          c="dimmed"
          data-adapttable-part="selection-stat"
        >
          {part.text}
        </Text>
      ))}
    </Group>
  );
}

/** The kit's stats rendering, shared with the status bar that hosts it. */
export const statsSlots: SelectionStatsSlots = { Stats };

/**
 * Mantine-owned status bar for the headless selection statistics.
 *
 * @public
 */
export function SelectionStatsBar(
  props: Readonly<Omit<SelectionStatsChromeProps, "slots">>
) {
  return <SelectionStatsChrome {...props} slots={statsSlots} />;
}
