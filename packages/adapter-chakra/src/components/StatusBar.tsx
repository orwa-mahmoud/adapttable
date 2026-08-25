import {
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "@adapttable/core/adapter";
import { HStack, Text } from "@chakra-ui/react";

import { statsSlots } from "./SelectionStatsBar";

const slots: StatusBarSlots = {
  Bar: ({ items, stats, className }: StatusBarSlotProps) => (
    <HStack
      gap={4}
      flexWrap="wrap"
      alignItems="center"
      className={className}
      data-adapttable-part="status-bar"
      fontVariantNumeric="tabular-nums"
    >
      {items.map((item) => (
        <Text
          as="span"
          key={item.key}
          textStyle="xs"
          color="fg.muted"
          data-adapttable-part="status-item"
          data-status={item.key}
          data-appearance={item.appearance}
        >
          {item.text}
        </Text>
      ))}
      {stats}
    </HStack>
  ),
  stats: statsSlots,
};

/** The kit's status bar: row counts, selection count, selection figures. */
export function StatusBar(
  props: Readonly<Omit<StatusBarChromeProps, "slots">>
) {
  return <StatusBarChrome {...props} slots={slots} />;
}
