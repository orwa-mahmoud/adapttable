import {
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "@adapttable/core/adapter";

import type { DataTableClassNames } from "../types";
import { ClassNamesProvider, useClassNames } from "./classNamesContext";
import { statsSlots } from "./SelectionStatsBar";

function Bar({ items, stats, className }: StatusBarSlotProps) {
  // The spans inside the strip get their hook from the class map without
  // core's contract having to carry a class for them.
  const { statusItem } = useClassNames();
  return (
    <div
      data-adapttable-part="status-bar"
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px 16px",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {items.map((item) => (
        <span
          key={item.key}
          data-adapttable-part="status-item"
          data-status={item.key}
          data-appearance={item.appearance}
          className={statusItem}
        >
          {item.text}
        </span>
      ))}
      {stats}
    </div>
  );
}

const slots: StatusBarSlots = { Bar, stats: statsSlots };

/**
 * Unstyled status bar: semantic markup with class hooks, no styles.
 *
 * The slot reads the class map from context rather than closing over it, so
 * the strip keeps one component identity across renders instead of remounting
 * on every keystroke in the search box.
 */
export function StatusBar(
  props: Readonly<
    Omit<StatusBarChromeProps, "slots"> & {
      classNames?: DataTableClassNames;
    }
  >
) {
  const { classNames, ...rest } = props;
  return (
    <ClassNamesProvider classNames={classNames}>
      <StatusBarChrome
        {...rest}
        className={classNames?.statusBar}
        slots={slots}
      />
    </ClassNamesProvider>
  );
}
