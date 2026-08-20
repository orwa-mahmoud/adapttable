import {
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "@adapttable/core/adapter";
import { Typography } from "antd";

import { statsSlots } from "./SelectionStatsBar";

const slots: StatusBarSlots = {
  Bar: ({ items, stats, className }: StatusBarSlotProps) => (
    <div
      className={className}
      data-adapttable-part="status-bar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px 16px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {items.map((item) => (
        <Typography.Text
          key={item.key}
          type="secondary"
          data-adapttable-part="status-item"
          data-status={item.key}
          data-appearance={item.appearance}
        >
          {item.text}
        </Typography.Text>
      ))}
      {stats}
    </div>
  ),
  stats: statsSlots,
};

/** The kit's status bar: row counts, selection count, selection figures. */
export function StatusBar(
  props: Readonly<Omit<StatusBarChromeProps, "slots">>
) {
  return <StatusBarChrome {...props} slots={slots} />;
}
