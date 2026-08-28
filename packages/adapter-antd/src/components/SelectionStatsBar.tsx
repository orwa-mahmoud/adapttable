import {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "@adapttable/core/adapter";
import { Typography } from "antd";

function Stats({ parts, className }: SelectionStatsSlotProps) {
  return (
    <output
      className={className}
      data-adapttable-part="selection-stats"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 16px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {parts.map((part) => (
        <Typography.Text
          key={part.key}
          type="secondary"
          data-adapttable-part="selection-stat"
        >
          {part.text}
        </Typography.Text>
      ))}
    </output>
  );
}

/** The kit's stats rendering, shared with the status bar that hosts it. */
export const statsSlots: SelectionStatsSlots = { Stats };

/**
 * Ant Design-owned status bar for the headless selection statistics.
 *
 * @public
 */
export function SelectionStatsBar(
  props: Readonly<Omit<SelectionStatsChromeProps, "slots">>
) {
  return <SelectionStatsChrome {...props} slots={statsSlots} />;
}
