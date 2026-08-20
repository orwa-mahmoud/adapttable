import {
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "@adapttable/core/adapter";
import { Group, Text } from "@mantine/core";

import { statsSlots } from "./SelectionStatsBar";

const slots: StatusBarSlots = {
  Bar: ({ items, stats, className }: StatusBarSlotProps) => (
    <Group
      gap="md"
      wrap="wrap"
      align="center"
      className={className}
      data-adapttable-part="status-bar"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {items.map((item) => (
        <Text
          component="span"
          key={item.key}
          size="xs"
          c="dimmed"
          data-adapttable-part="status-item"
          data-status={item.key}
          data-appearance={item.appearance}
        >
          {item.text}
        </Text>
      ))}
      {stats}
    </Group>
  ),
  stats: statsSlots,
};

/** The kit's status bar: row counts, selection count, selection figures. */
export function StatusBar(
  props: Readonly<Omit<StatusBarChromeProps, "slots">>
) {
  return <StatusBarChrome {...props} slots={slots} />;
}
