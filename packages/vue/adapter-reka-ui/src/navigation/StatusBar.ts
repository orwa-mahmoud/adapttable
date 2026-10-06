import {
  type SelectionStatsSlots,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlots,
} from "@adapttable/vue/adapter";
import { Primitive } from "reka-ui";
import { defineComponent, h } from "vue";

import { useRekaClasses } from "../context";

export const RekaStatusBar = defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useRekaClasses();
    const stats: SelectionStatsSlots = {
      Stats: (control) =>
        h(
          Primitive,
          {
            as: "span",
            "data-adapttable-part": "selection-stats",
            class: [
              "at-reka-selection-stats",
              names.value.selectionStats,
              control.className,
            ],
          },
          {
            default: () =>
              control.parts.map((part) =>
                h("span", { key: part.key, "data-stat": part.key }, part.text)
              ),
          }
        ),
    };
    const slots: StatusBarSlots = {
      stats,
      Bar: (control) =>
        h(
          Primitive,
          {
            as: "div",
            role: "status",
            "aria-live": "polite",
            "data-adapttable-part": "status-bar",
            class: [
              "at-reka-status-bar",
              names.value.statusBar,
              control.className,
            ],
          },
          {
            default: () => [
              ...control.items.map((item) =>
                h(
                  "span",
                  {
                    key: item.key,
                    "data-adapttable-part": "status-item",
                    "data-kind": item.key,
                    "data-appearance": item.appearance,
                    class: names.value.statusItem,
                  },
                  item.text
                )
              ),
              control.stats,
            ],
          }
        ),
    };
    return () => StatusBarChrome({ ...props, slots });
  },
  {
    name: "RekaStatusBar",
    props: [
      "enabled",
      "shown",
      "page",
      "limit",
      "total",
      "selected",
      "stats",
      "labels",
      "locale",
      "className",
      "notices",
    ],
  }
);
