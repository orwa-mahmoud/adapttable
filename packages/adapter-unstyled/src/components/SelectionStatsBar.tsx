import {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "@adapttable/core/adapter";

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
        opacity: 0.8,
      }}
    >
      {parts.map((part) => (
        <span key={part.key} data-adapttable-part="selection-stat">
          {part.text}
        </span>
      ))}
    </output>
  );
}

/** The kit's stats rendering, shared with the status bar that hosts it. */
export const statsSlots: SelectionStatsSlots = { Stats };

/**
 * Unstyled status bar for the headless selection statistics.
 *
 * @public
 */
export function SelectionStatsBar(
  props: Readonly<Omit<SelectionStatsChromeProps, "slots">>
) {
  return <SelectionStatsChrome {...props} slots={statsSlots} />;
}
