import {
  type DataTableClassNames,
  type SelectionStatsSlots,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlotProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType, type VNode } from "vue";
import { VChip } from "vuetify/components/VChip";
import { VSheet } from "vuetify/components/VSheet";

import { useClassNames } from "../classNamesContext";
import { VuetifySurface } from "../table/VuetifySurface";

type StatsControl = Parameters<SelectionStatsSlots["Stats"]>[0];

function statusItem(
  item: StatusBarSlotProps["items"][number],
  className?: string
): VNode {
  return h(
    VuetifySurface,
    {
      key: item.key,
      component: VChip,
      attrs: {
        tag: "span",
        size: "small",
        variant: "tonal",
        "data-adapttable-part": "status-item",
        "data-status": item.key,
        "data-appearance": item.appearance,
        class: className,
      },
    },
    { default: () => item.text }
  );
}

function statistic(item: StatsControl["parts"][number]): VNode {
  return h(
    VuetifySurface,
    {
      key: item.key,
      component: VChip,
      attrs: {
        tag: "span",
        size: "small",
        variant: "text",
        "data-adapttable-part": "selection-stat",
      },
    },
    { default: () => item.text }
  );
}

function stats(control: StatsControl, className?: string): VNode {
  const content = control.parts.map(statistic);
  return h(
    VuetifySurface,
    {
      component: VSheet,
      attrs: {
        tag: "output",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        "data-adapttable-part": "selection-stats",
        class: className,
      },
    },
    { default: () => content }
  );
}

function bar(control: StatusBarSlotProps, names: DataTableClassNames): VNode {
  const content = [
    ...control.items.map((item) => statusItem(item, names.statusItem)),
    control.stats,
  ];
  return h(
    VuetifySurface,
    {
      component: VSheet,
      attrs: {
        "data-adapttable-part": "status-bar",
        class: ["adapttable-vuetify-status", control.className],
      },
    },
    { default: () => content }
  );
}

export const VuetifyStatusBar = defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useClassNames();
    return () =>
      StatusBarChrome({
        ...props,
        slots: {
          Bar: (control) => bar(control, names.value),
          stats: {
            Stats: (control) => stats(control, names.value.selectionStats),
          },
        },
      });
  },
  {
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
