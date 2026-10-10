import {
  type SelectionStatPart,
  type SelectionStatsSlots,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarItem,
  type StatusBarSlots,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { QBadge, QBar } from "quasar";
import { defineComponent, h, type PropType } from "vue";

function statBadge(part: SelectionStatPart) {
  return h(
    QBadge,
    {
      key: part.key,
      "data-adapttable-part": "selection-stat",
      "data-stat": part.key,
      outline: true,
    },
    () => part.text
  );
}
function statusBadge(item: StatusBarItem, className: string | undefined) {
  return h(
    QBadge,
    {
      key: item.key,
      "data-adapttable-part": "status-item",
      "data-kind": item.key,
      "data-appearance": item.appearance,
      class: className,
      outline: true,
    },
    () => item.text
  );
}

export const QuasarStatusBar = defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useDataTableClassNames();
    const stats: SelectionStatsSlots = {
      Stats: (control) =>
        h(
          QBar,
          {
            class: [names.value.selectionStats, control.className],
            "data-adapttable-part": "selection-stats",
          },
          () => control.parts.map(statBadge)
        ),
    };
    const slots: StatusBarSlots = {
      stats,
      Bar: (control) =>
        h(
          QBar,
          {
            role: "status",
            "aria-live": "polite",
            "data-adapttable-part": "status-bar",
            class: [names.value.statusBar, control.className],
          },
          () => [
            ...control.items.map((item) =>
              statusBadge(item, names.value.statusItem)
            ),
            control.stats,
          ]
        ),
    };
    return () => StatusBarChrome({ ...props, slots });
  },
  {
    name: "QuasarStatusBar",
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
