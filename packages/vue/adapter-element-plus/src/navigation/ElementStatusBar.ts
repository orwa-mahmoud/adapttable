import type { Attrs } from "@adapttable/vue";
import {
  StatusBarChrome,
  type StatusBarChromeProps,
} from "@adapttable/vue/adapter";
import { ElText } from "element-plus";
import { defineComponent, h, type PropType, type VNode } from "vue";

import { useClassNames } from "../classNamesContext";

function textItem(
  item: { readonly key: string; readonly text: string },
  attrs: Attrs
): VNode {
  return h(ElText, { ...attrs, key: item.key }, { default: () => item.text });
}

export const ElementStatusBar = defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useClassNames();
    return () =>
      StatusBarChrome({
        ...props,
        slots: {
          Bar: (control) =>
            h(
              "div",
              {
                "data-adapttable-part": "status-bar",
                class: control.className,
              },
              [
                ...control.items.map((item) =>
                  textItem(item, {
                    type: "info",
                    "data-adapttable-part": "status-item",
                    "data-status": item.key,
                    "data-appearance": item.appearance,
                    class: names.value.statusItem,
                  })
                ),
                control.stats,
              ]
            ),
          stats: {
            Stats: (control) =>
              h(
                "output",
                {
                  role: "status",
                  "aria-live": "polite",
                  "aria-atomic": "true",
                  "data-adapttable-part": "selection-stats",
                  class: names.value.selectionStats,
                },
                control.parts.map((item) =>
                  textItem(item, {
                    "data-adapttable-part": "selection-stat",
                  })
                )
              ),
          },
        },
      });
  },
  {
    name: "ElementStatusBar",
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
