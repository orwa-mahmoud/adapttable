import {
  type FilterPanelSurfaceProps,
  provideDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h, shallowRef } from "vue";

import { DataTable } from "../src";
import { naiveButton } from "../src/controls/button";
import { naiveSelect } from "../src/controls/select";
import { filters } from "../src/filters";
import { NaiveFilterSurface } from "../src/filters/NaiveFilterSurface";
import { headerFilters } from "../src/header-filters";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [
  { id: "ada", name: "Ada" },
  { id: "grace", name: "Grace" },
];

export function filterHydrationTable(
  mode: "popover" | "drawer",
  mobile: boolean
) {
  const features = [
    filters<Row>(
      [
        {
          key: "name",
          type: "select",
          options: rows.map((row) => ({ value: row.name, label: row.name })),
        },
      ],
      { mode }
    ),
    headerFilters(),
  ];
  return defineComponent({
    render: () =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: mobile,
        features,
      }),
  });
}

export function filterHydrationOverlay(
  modal: boolean,
  accept: () => boolean = () => false,
  close?: FilterPanelSurfaceProps["onClose"]
) {
  return defineComponent({
    setup() {
      provideDataTableClassNames(() => ({}));
      const anchor = shallowRef<HTMLElement | null>(null);
      const open = shallowRef(false);
      const receiveAnchor = (element: HTMLElement | null) => {
        anchor.value = element;
      };
      const requestClose: FilterPanelSurfaceProps["onClose"] = (reason) => {
        close?.(reason);
        if (accept()) open.value = false;
      };
      return () =>
        h("div", [
          naiveButton(
            {
              ref: receiveAnchor,
              onClick: () => {
                open.value = true;
              },
            },
            "Filters"
          ),
          h(NaiveFilterSurface, {
            open: open.value,
            modal,
            anchor: anchor.value,
            dir: "ltr",
            label: "Filters",
            onClose: requestClose,
            children: naiveSelect({
              attrs: { "aria-label": "Status" },
              value: "a",
              options: [{ value: "a", label: "Active" }],
              onChange: () => undefined,
            }),
          }),
        ]);
    },
  });
}
