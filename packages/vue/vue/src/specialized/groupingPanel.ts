/** One grouping controller with required Vue adapter slots. */
import {
  createGroupingPanelController,
  declaredAggregates,
  deferGroupingDropToInner,
  focusAfterAggregationRemoval,
  groupingAggregationOptions,
  groupingAvailableColumns,
  groupingColumnName,
  groupingDropPlan,
  groupingPanelAggregations,
  INERT_GROUPING_DROP_HANDLERS,
  parseGroupBy,
} from "@adapttable/core";
import {
  coreGroupingPanel,
  type GroupingPanelSlotProps as NeutralGroupingPanelSlotProps,
  type GroupingPanelSlots as NeutralGroupingPanelSlots,
  groupingPanelState,
} from "@adapttable/core/binding";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onScopeDispose,
  type PropType,
  shallowRef,
  type VNodeChild,
  watch,
  watchEffect,
} from "vue";

import { toVueAttrs } from "../attrs";
import type { ColumnDef } from "../columnDef";
import {
  type GroupingExtras,
  mountGrouping,
  type StaticGroupingExtras,
} from "../features/grouping";
import {
  eraseTableRuntime,
  type StaticTableFeature,
  type TableFeature,
} from "../features/tableFeature";
import { groupingModelKey } from "../hierarchy/models";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import { useExternalStore } from "../store";
import { groupingPanelControlKey, groupingPanelModelKey } from "./contracts";
export { groupingPanelControlKey, groupingPanelModelKey } from "./contracts";
export type GroupingPanelSlots = NeutralGroupingPanelSlots<VNodeChild>;
export type GroupingPanelProps<TRow> = NeutralGroupingPanelSlotProps<
  ColumnDef<TRow>
>;
export interface GroupingPanelChromeProps<
  TRow,
> extends GroupingPanelProps<TRow> {
  readonly slots: GroupingPanelSlots;
  readonly classNames?: {
    readonly groupingItem?: string;
    readonly groupingAggregations?: string;
  };
}
/** DOM refs are per rendered panel; nothing is retained across tables. */
const GroupingPanelSurface = /*#__PURE__*/ defineComponent({
  props: {
    model: {
      type: Object as PropType<GroupingPanelChromeProps<unknown>>,
      required: true,
    },
  },
  setup(props) {
    const fieldset = shallowRef<HTMLElement | null>(null);
    let pendingRemoval: number | undefined;
    let live = true;
    onScopeDispose(() => {
      live = false;
    });
    const remove = (key: string) => {
      pendingRemoval = props.model.state.aggregations.items.findIndex(
        (item) => item.columnKey === key
      );
      props.model.state.removeAggregate(key);
    };
    watch(
      () =>
        props.model.state.aggregations.items
          .map((item) => item.columnKey)
          .join("\0"),
      () => {
        const index = pendingRemoval;
        pendingRemoval = undefined;
        if (index === undefined) return;
        void nextTick(() => {
          if (live)
            focusAfterAggregationRemoval(
              fieldset.value,
              props.model.state.aggregations.items.map(
                (item) => item.columnKey
              ),
              index
            );
        });
      }
    );
    return () => {
      const {
        state,
        columns,
        labels,
        mobile,
        dir,
        slots,
        classNames = {},
      } = props.model;
      for (const key of [
        "Surface",
        "DropZone",
        "Chip",
        "Select",
        "RemoveZone",
        "AggregationItem",
        "AggregationRemove",
        "AggregationPicker",
        "AggregationRestore",
      ] as const)
        if (typeof slots[key] !== "function")
          throw new Error(
            `AdaptTable: required grouping control slot "${key}" is missing.`
          );
      const available = groupingAvailableColumns(columns, state.groupBy);
      const name = (key: string) => {
        const column = columns.find((candidate) => candidate.key === key);
        return column ? groupingColumnName(column) : key;
      };
      const plan = groupingDropPlan(state.groupBy, state.drag);
      const boundary = (index: number, empty: boolean) =>
        slots.DropZone({
          label: labels.groupingDropColumns,
          empty,
          active: !plan.inert(index) && state.drag?.overIndex === index,
          dragging: !plan.inert(index) && state.drag !== undefined,
          dropProps: plan.inert(index)
            ? INERT_GROUPING_DROP_HANDLERS
            : state.dropProps(index),
          "data-adapttable-part": "grouping-drop-zone",
        });
      const items = state.aggregations.items;
      const offered = state.aggregations.candidates;
      return slots.Surface({
        label: labels.groupingPanel,
        mobile,
        dir,
        ...(mobile || plan.panelTarget === undefined
          ? {}
          : deferGroupingDropToInner(state.dropProps(plan.panelTarget))),
        "data-adapttable-part": "grouping-panel",
        children: [
          ...state.groupBy.map((key, index) => {
            const target = plan.chipTarget(index);
            let chipDrop = {};
            if (!mobile)
              chipDrop =
                target === undefined
                  ? INERT_GROUPING_DROP_HANDLERS
                  : deferGroupingDropToInner(state.dropProps(target));
            return h(
              "span",
              {
                key,
                class: classNames.groupingItem,
                "data-adapttable-part": "grouping-item",
                style: { display: "inline-flex", alignItems: "center" },
                ...toVueAttrs(chipDrop),
              },
              [
                !mobile ? boundary(index, false) : null,
                slots.Chip({
                  label: name(key),
                  level: index + 1,
                  dragProps: state.chipDragProps(key),
                  keyboardProps: state.chipKeyboardProps(key, name(key)),
                  onRemove: () => state.remove(key),
                  removeLabel: labels.removeGroupingColumn(name(key)),
                  "data-adapttable-part": "grouping-chip",
                }),
                !mobile && index === state.groupBy.length - 1
                  ? boundary(index + 1, false)
                  : null,
              ]
            );
          }),
          !mobile && !state.groupBy.length ? boundary(0, true) : null,
          slots.Select({
            label: labels.addGroupingColumn,
            value: "",
            options: available,
            onChange: state.add,
            disabled: !available.length,
            "data-adapttable-part": "grouping-add",
          }),
          state.groupBy.length && (items.length || offered.length)
            ? h(
                "fieldset",
                {
                  ref: fieldset,
                  class: classNames.groupingAggregations,
                  "aria-label": labels.groupingAggregations,
                  "data-adapttable-part": "grouping-aggregations",
                },
                [
                  ...items.map((item) =>
                    h(
                      "span",
                      {
                        key: item.columnKey,
                        "data-adapttable-aggregation": item.columnKey,
                      },
                      [
                        slots.AggregationItem({
                          label: name(item.columnKey),
                          readOnly: !item.editable,
                          readOnlyLabel: labels.groupingAggregationReadOnly,
                          "data-adapttable-part": "grouping-aggregation-item",
                          children: item.editable
                            ? [
                                slots.Select({
                                  label: labels.groupingAggregationFor(
                                    name(item.columnKey)
                                  ),
                                  value: item.operationId ?? "",
                                  options: groupingAggregationOptions(
                                    item,
                                    labels
                                  ),
                                  onChange: (value) => {
                                    if (value)
                                      state.setAggregateOperation(
                                        item.columnKey,
                                        value
                                      );
                                  },
                                  disabled: !state.canSetAggregates,
                                  "data-adapttable-part":
                                    "grouping-aggregation-operation",
                                }),
                                slots.AggregationRemove({
                                  label: labels.groupingRemoveAggregation(
                                    name(item.columnKey)
                                  ),
                                  onRemove: () => remove(item.columnKey),
                                  "data-adapttable-part":
                                    "grouping-aggregation-remove",
                                }),
                              ]
                            : null,
                        }),
                      ]
                    )
                  ),
                  slots.AggregationPicker({
                    label: labels.groupingAddAggregation,
                    options: offered.map((candidate) => ({
                      value: candidate.columnKey,
                      label: name(candidate.columnKey),
                      checked: candidate.active,
                    })),
                    onToggle: (key, checked) => {
                      if (checked) state.addAggregate(key);
                      else remove(key);
                    },
                    disabled: !state.canSetAggregates || !offered.length,
                    "data-adapttable-part": "grouping-aggregation-add",
                  }),
                  state.aggregations.hasDefaults &&
                  !state.aggregations.atDefaults
                    ? slots.AggregationRestore({
                        label: labels.groupingRestoreAggregations,
                        disabled: !state.canSetAggregates,
                        onRestore: state.restoreAggregateDefaults,
                        "data-adapttable-part": "grouping-aggregations-restore",
                      })
                    : null,
                ]
              )
            : null,
          h(
            "span",
            {
              "aria-live": "polite",
              "data-adapttable-part": "grouping-announcer",
              style: {
                position: "absolute",
                width: "1px",
                height: "1px",
                overflow: "hidden",
                clipPath: "inset(50%)",
              },
            },
            state.announcement
          ),
          state.drag?.source === "chip"
            ? slots.RemoveZone({
                label: labels.groupingDropToRemove,
                active: state.drag.overRemove === true,
                dropProps: state.removeDropProps(),
                "data-adapttable-part": "grouping-remove-zone",
              })
            : null,
        ],
      });
    };
  },
});
export function GroupingPanelChrome<TRow>(
  props: GroupingPanelChromeProps<TRow>
): VNodeChild {
  return h(GroupingPanelSurface, {
    model: props as unknown as GroupingPanelChromeProps<unknown>,
  });
}
export function groupingPanel(
  initialGroupBy?: string | readonly string[],
  extras?: StaticGroupingExtras
): StaticTableFeature;
export function groupingPanel<TRow>(
  initialGroupBy?: string | readonly string[],
  extras?: GroupingExtras<TRow>
): TableFeature<TRow>;
export function groupingPanel<TRow>(
  initialGroupBy?: string | readonly string[],
  extras: GroupingExtras<TRow> = {}
): TableFeature<TRow> {
  const base = coreGroupingPanel<TRow>(initialGroupBy, extras);
  return {
    id: base.id,
    requiredSlots: [groupingPanelControlKey<never>()],
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
    }),
    mount: (context) => {
      mountGrouping(context);
      let disposed = false;
      onScopeDispose(() => {
        disposed = true;
      });
      const neutralRuntime = eraseTableRuntime(context.runtime);
      const setGroupBy: typeof context.source.value.setGroupBy = (value) => {
        if (disposed || !context.active.value) return;
        const state = neutralRuntime.view()?.groupingState;
        if (!state) return;
        state.setGroupBy(value);
        if (disposed || !context.active.value) return;
        (context.options.value as GroupingExtras<TRow>).onGroupByChange?.(
          parseGroupBy(value)
        );
      };
      const runtime = {
        ...neutralRuntime,
        view: () => {
          if (disposed || !context.active.value) return undefined;
          const view = neutralRuntime.view();
          return view?.groupingState
            ? {
                ...view,
                groupingState: { ...view.groupingState, setGroupBy },
              }
            : view;
        },
      };
      const controller = createGroupingPanelController({
        runtime,
        groupAggregates: extras.groupAggregates,
      });
      const snapshot = useExternalStore(controller, { active: context.active });
      const grouped = context.state.get(groupingModelKey<TRow>());
      watch(
        context.active,
        (active) => {
          if (active) controller.initialize(initialGroupBy);
        },
        { immediate: true, flush: "sync" }
      );
      watch(
        () => controller.reconcileKey(),
        () => {
          if (context.active.value) controller.reconcile();
        },
        { immediate: true, flush: "sync" }
      );
      const model = computed(() => {
        const declared = declaredAggregates(extras.groupAggregates);
        const state = groupingPanelState({
          interactions: controller.interactions(snapshot.value, declared),
          groupBy: parseGroupBy(context.source.value.groupBy),
          columns: context.table.allColumns.value,
          source: context.source.value,
        });
        if (!state) return undefined;
        return {
          state: {
            ...state,
            aggregations: groupingPanelAggregations({
              source: context.source.value,
              columns: context.table.allColumns.value,
              declared,
              entries: grouped.value?.entries,
            }),
          },
          columns: context.table.allColumns.value,
          labels: context.table.labels.value,
          mobile: context.table.isMobile.value,
          dir: context.table.dir.value,
        };
      });
      watchEffect(
        () => context.state.set(groupingPanelModelKey<TRow>(), model.value),
        { flush: "sync" }
      );
    },
  };
}
