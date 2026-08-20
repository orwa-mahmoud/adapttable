import {
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "@adapttable/core/adapter";
import { Flex, Text } from "@radix-ui/themes";

import { statsSlots } from "./SelectionStatsBar";

const slots: StatusBarSlots = {
  Bar: ({ items, stats, className }: StatusBarSlotProps) => (
    <Flex
      gap="4"
      wrap="wrap"
      align="center"
      className={className}
      data-adapttable-part="status-bar"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {items.map((item) => (
        <Text
          as="span"
          key={item.key}
          size="1"
          color="gray"
          data-adapttable-part="status-item"
          data-status={item.key}
          data-appearance={item.appearance}
        >
          {item.text}
        </Text>
      ))}
      {stats}
    </Flex>
  ),
  stats: statsSlots,
};

/** The kit's status bar: row counts, selection count, selection figures. */
export function StatusBar(
  props: Readonly<Omit<StatusBarChromeProps, "slots">>
) {
  return <StatusBarChrome {...props} slots={slots} />;
}
