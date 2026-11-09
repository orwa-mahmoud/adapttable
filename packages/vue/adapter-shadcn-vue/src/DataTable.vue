<script setup lang="ts" generic="TRow">
import type {
  ColumnLayoutState,
  DataTableHandle,
  TableDensity,
} from "@adapttable/vue";
import {
  type DataTableProps,
  type DataTableSlots,
  DataTableSurfaceChrome,
  defaultConfirm,
  FULLSCREEN_MODEL,
  GROUP_ROW,
  groupRowSlotKey,
  provideDataTableClassNames,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
  withKitEnvironment,
} from "@adapttable/vue/adapter";
import { ConfigProvider } from "reka-ui";
import {
  computed,
  h,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  watch,
} from "vue";

import { resolveShadcnClassNames } from "./classNames";
import { shadcnSelectionCheckbox } from "./controls";
import { provideShadcnPortalContainer } from "./lib/portal";
import { useShadcnLibrary } from "./libraryEnvironment";
import { ROW_ACTIONS_CONTROL, rowActionsControlKey } from "./rows/slot";
import { shadcnSurfaceControls } from "./surfaceControls";
import { shadcnTableControls } from "./tableControls";

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<DataTableProps<TRow>>(), {
  searchable: true,
  forceMobile: undefined,
  urlSync: undefined,
  selectable: undefined,
  multiSort: undefined,
  fitColumns: undefined,
  collapsibleColumnGroups: undefined,
  isLoading: undefined,
  isFetching: undefined,
});
const emit = defineEmits<{
  "update:selectedIds": [ids: string[]];
  "update:columnLayout": [layout: ColumnLayoutState];
  "update:density": [density: TableDensity];
}>();
const slots = defineSlots<DataTableSlots<TRow>>();
const footer = shallowRef(slots.footer);
onBeforeUpdate(() => {
  footer.value = slots.footer;
});
const kit = useShadcnLibrary();
const shell = useDataTableShell<TRow>(() =>
  withKitEnvironment(
    {
      ...props,
      footer: footer.value,
      confirm: props.confirm ?? defaultConfirm,
      onDensityChange: (value: TableDensity) => {
        props.onDensityChange?.(value);
        emit("update:density", value);
      },
      onSelectionChange:
        props.selectable ||
        props.selectedIds !== undefined ||
        props.defaultSelectedIds !== undefined
          ? (ids: string[]) => emit("update:selectedIds", ids)
          : undefined,
      onColumnLayoutChange: (layout: ColumnLayoutState) =>
        emit("update:columnLayout", layout),
    },
    kit.value
  )
);
const names = computed(() => resolveShadcnClassNames(props.classNames));
provideDataTableClassNames(() => names.value);
const fullscreen = shell.state.get(FULLSCREEN_MODEL);
provideShadcnPortalContainer(() => fullscreen.value?.container);
function controls(): TableChromeSlots<TRow> {
  return {
    ...shadcnTableControls<TRow>(),
    SelectionCheckbox: (control) =>
      shell.table.isMobile.value
        ? h(
            "label",
            {
              style: {
                display: "inline-flex",
                minWidth: "44px",
                minHeight: "44px",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              },
            },
            [shadcnSelectionCheckbox(control)]
          )
        : shadcnSelectionCheckbox(control),
    RowActions: ({ controls }) => {
      if (!shell.slotFills.value.get(ROW_ACTIONS_CONTROL.id)?.length)
        throw new Error(
          "AdaptTable: shadcn-vue row actions require the kit rowActions feature."
        );
      return renderFeatureSlot(
        rowActionsControlKey<TRow>(),
        shell.slotFills.value,
        {
          controls,
          layout: props.rowActionsLayout,
          label: shell.table.labels.value.rowActionsMenu,
          classNames: names.value,
        }
      );
    },
    GroupRow: (group) => {
      if (!shell.slotFills.value.get(GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: shadcn-vue grouping rows require the kit grouping feature."
        );
      return renderFeatureSlot(
        groupRowSlotKey<TRow>(),
        shell.slotFills.value,
        group
      );
    },
    card: slots.card,
    cell: slots.cell,
    header: slots.header,
    headerActions: slots.headerActions,
    footer: slots.footer,
  };
}
const root = shallowRef<HTMLElement | null>(null);
const scroll = shallowRef<HTMLElement | null>(null);
const surface = {
  rootElement: () => root.value,
  scrollElement: () => scroll.value,
};
watch([root, scroll], () => shell.setSurface(surface), {
  immediate: true,
  flush: "sync",
});
onBeforeUnmount(() => shell.setSurface(null));
const setRoot = (element: HTMLElement | null): void => {
  root.value = element;
};
const setScroll = (element: HTMLElement | null): void => {
  scroll.value = element;
};
defineExpose<DataTableHandle<TRow>>(shell.handle);
</script>

<template>
  <ConfigProvider :dir="shell.table.dir.value">
    <DataTableSurfaceChrome
      v-bind="$attrs"
      :model="shell"
      :options="{ ...props, classNames: names }"
      :slots="shadcnSurfaceControls(controls())"
      :content="slots"
      :root-ref="setRoot"
      :scroll-ref="setScroll"
    />
  </ConfigProvider>
</template>
