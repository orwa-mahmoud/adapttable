import {
  type SelectionStatsSlots,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlots,
} from "@adapttable/vue/adapter";
import { Primitive } from "reka-ui";
import { defineComponent, h, type PropType } from "vue";

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
                h(
                  "span",
                  {
                    key: part.key,
                    "data-adapttable-part": "selection-stat",
                    "data-stat": part.key,
                  },
                  part.text
                )
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
    props: {
      enabled: {
        type: Boolean as PropType<
          Omit<StatusBarChromeProps, "slots">["enabled"]
        >,
        default: undefined,
      },
      shown: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["shown"]>,
      },
      page: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["page"]>,
      },
      limit: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["limit"]>,
      },
      total: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["total"]>,
      },
      selected: {
        type: Number as PropType<
          Omit<StatusBarChromeProps, "slots">["selected"]
        >,
      },
      stats: {
        type: Object as PropType<Omit<StatusBarChromeProps, "slots">["stats"]>,
      },
      labels: {
        type: Object as PropType<Omit<StatusBarChromeProps, "slots">["labels"]>,
      },
      locale: {
        type: String as PropType<Omit<StatusBarChromeProps, "slots">["locale"]>,
      },
      className: {
        type: String as PropType<
          Omit<StatusBarChromeProps, "slots">["className"]
        >,
      },
      notices: {
        type: Array as PropType<Omit<StatusBarChromeProps, "slots">["notices"]>,
      },
    },
  }
);
