import {
  type ActiveFilterChip,
  type Direction,
  type FilterDef,
  type FilterTypeRegistry,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import type { FilterTreeBuilderProps } from "@adapttable/core/binding";
import { h, type VNodeChild } from "vue";
export interface FilterTriggerProps {
  readonly label: string;
  readonly count: number;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly triggerRef: (element: HTMLElement | null) => void;
  readonly onPointerDown: () => void;
  readonly onClick: () => void;
}
export interface FilterPanelButtonProps {
  readonly disabled?: boolean;
  readonly label: string;
  readonly part: string;
  readonly onClick: () => void;
}
export interface FilterPanelSurfaceProps {
  readonly className?: string;
  readonly open: boolean;
  readonly label: string;
  readonly dir: Direction;
  readonly anchor: HTMLElement | null;
  readonly container?: HTMLElement | null;
  readonly children: VNodeChild;
  readonly onClose: (reason?: "escape" | "outside" | "done") => void;
}
export interface FilterPanelModel<TRow> {
  readonly openPanel?: () => void;
  readonly chips?: readonly ActiveFilterChip[];
  readonly open: boolean;
  readonly mode: "popover" | "drawer";
  readonly dir: Direction;
  readonly labels: Required<TableLabels>;
  readonly count: number;
  readonly defs: readonly FilterDef<TRow>[];
  readonly registry: FilterTypeRegistry;
  readonly source: TableSource<TRow>;
  readonly trigger: FilterTriggerProps;
  readonly tree?: FilterTreeBuilderProps<TRow>;
  readonly anchor: HTMLElement | null;
  readonly container?: HTMLElement | null;
  readonly clear: () => void;
  readonly close: FilterPanelSurfaceProps["onClose"];
}
export interface FilterPanelSlots<TRow> {
  readonly Trigger: (props: FilterTriggerProps) => VNodeChild;
  readonly Tree?: (props: FilterTreeBuilderProps<TRow>) => VNodeChild;
  readonly Button: (props: FilterPanelButtonProps) => VNodeChild;
  readonly Field: (props: {
    readonly def: FilterDef<TRow>;
    readonly source: TableSource<TRow>;
    readonly labels: Required<TableLabels>;
    readonly registry: FilterTypeRegistry;
  }) => VNodeChild;
  readonly Popover: (props: FilterPanelSurfaceProps) => VNodeChild;
  readonly Drawer: (props: FilterPanelSurfaceProps) => VNodeChild;
}
/** The kit's surface owns positioning, portals and dismissal listeners. */
export interface FilterPanelClassNames {
  readonly filtersForm?: string;
  readonly filtersPanel?: string;
  readonly filtersPopover?: string;
  readonly filtersActions?: string;
  readonly filtersToolbar?: string;
  readonly filtersAnchor?: string;
  readonly filtersHeader?: string;
  readonly filtersTitle?: string;
  readonly filtersBody?: string;
  readonly filtersFooter?: string;
}
export function FilterPanelChrome<TRow>(props: {
  readonly classNames?: FilterPanelClassNames;
  readonly model: FilterPanelModel<TRow>;
  readonly controls: FilterPanelSlots<TRow>;
}): VNodeChild {
  const { model, controls } = props;
  for (const key of [
    "Trigger",
    "Button",
    "Field",
    "Popover",
    "Drawer",
  ] as const)
    if (typeof controls[key] !== "function")
      throw new Error(
        `AdaptTable: FilterPanelChrome requires the ${key} control slot.`
      );
  if (model.tree && !controls.Tree)
    throw new Error(
      "AdaptTable: FilterPanelChrome requires the Tree control slot."
    );
  const fields = h(
    "div",
    {
      "data-adapttable-part": "filters-form",
      class: props.classNames?.filtersForm,
      dir: model.dir,
    },
    model.defs.map((def) =>
      h("div", { key: def.key }, [
        controls.Field({
          def,
          source: model.source,
          labels: model.labels,
          registry: model.registry,
        }),
      ])
    )
  );
  const children = h("div", null, [
    h(
      "header",
      {
        "data-adapttable-part": "filters-header",
        class: props.classNames?.filtersHeader,
      },
      [
        h(
          "h3",
          {
            "data-adapttable-part": "filters-title",
            class: props.classNames?.filtersTitle,
          },
          model.labels.filters
        ),
        model.mode === "drawer"
          ? controls.Button({
              label: model.labels.cancel,
              part: "filters-close",
              onClick: () => model.close("done"),
            })
          : null,
      ]
    ),
    h(
      "div",
      {
        "data-adapttable-part": "filters-body",
        class: props.classNames?.filtersBody,
      },
      [fields, model.tree ? controls.Tree?.(model.tree) : null]
    ),
    h(
      "footer",
      {
        "data-adapttable-part": "filters-footer",
        class: [
          props.classNames?.filtersActions,
          props.classNames?.filtersFooter,
        ],
      },
      [
        controls.Button({
          label: model.labels.clearAll,
          part: "filters-clear",
          disabled: model.count === 0,
          onClick: model.clear,
        }),
        controls.Button({
          label: model.labels.filtersDone,
          part: "filters-done",
          onClick: () => model.close("done"),
        }),
      ]
    ),
  ]);
  const surface = model.mode === "drawer" ? controls.Drawer : controls.Popover;
  return h(
    "div",
    {
      "data-adapttable-part": "filters-anchor",
      class: [
        props.classNames?.filtersToolbar,
        props.classNames?.filtersAnchor,
      ],
    },
    [
      controls.Trigger(model.trigger),
      surface({
        className:
          model.mode === "drawer"
            ? props.classNames?.filtersPanel
            : props.classNames?.filtersPopover,
        open: model.open,
        label: model.labels.filters,
        dir: model.dir,
        anchor: model.anchor,
        container: model.container,
        children,
        onClose: model.close,
      }),
    ]
  );
}
