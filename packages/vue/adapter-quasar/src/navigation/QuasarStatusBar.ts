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
import { defineComponent, h } from "vue";

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
