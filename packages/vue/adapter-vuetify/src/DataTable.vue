<script setup lang="ts" generic="TRow">
import "./styles.css";

import type {
  ColumnLayoutState,
  DataTableHandle,
  TableDensity,
} from "@adapttable/vue";
import {
  type DataTableProps,
  type DataTableSlots,
  DataTableSurfaceChrome,
  type DataTableSurfaceSlots,
  defaultConfirm,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import {
  computed,
  h,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  watch,
} from "vue";
import { VIcon } from "vuetify/components/VIcon";
import { VLocaleProvider } from "vuetify/components/VLocaleProvider";

import { provideClassNames } from "./classNamesContext";
import { vuetifyButton } from "./controls";
import VuetifyInput from "./controls/VuetifyInput.vue";
import VuetifySelect from "./controls/VuetifySelect.vue";
import { VUETIFY_GROUP_ROW, vuetifyGroupRowSlotKey } from "./groupRowSlot";
import LoadingState from "./LoadingState.vue";
import { ROW_ACTIONS_CONTROL, rowActionsControlKey } from "./rowActionsSlot";
import { VuetifyDesktop } from "./table/Desktop";
import { VuetifyMobile } from "./table/Mobile";
import { vuetifyTableControls } from "./tableControls";

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
const shell = useDataTableShell<TRow>(() => ({
  ...props,
  footer: footer.value,
  confirm: props.confirm ?? defaultConfirm,
  onDensityChange: (density) => {
    props.onDensityChange?.(density);
    emit("update:density", density);
  },
  onSelectionChange:
    props.selectable ||
    props.selectedIds !== undefined ||
    props.defaultSelectedIds !== undefined
      ? (ids) => emit("update:selectedIds", ids)
      : undefined,
  onColumnLayoutChange: (layout) => emit("update:columnLayout", layout),
}));
const { table } = shell;
const names = computed(() => props.classNames ?? {});
provideClassNames(() => names.value);
const rootElement = shallowRef<HTMLElement | null>(null);
const scrollElement = shallowRef<HTMLElement | null>(null);
const surface = {
  rootElement: () => rootElement.value,
  scrollElement: () => scrollElement.value,
};
watch([rootElement, scrollElement], () => shell.setSurface(surface), {
  immediate: true,
  flush: "sync",
});
onBeforeUnmount(() => shell.setSurface(null));
defineExpose<DataTableHandle<TRow>>(shell.handle);

function controls(): TableChromeSlots<TRow> {
  return {
    ...vuetifyTableControls<TRow>(),
    RowActions: ({ controls: actions }) => {
      if (!shell.slotFills.value.get(ROW_ACTIONS_CONTROL.id)?.length)
        throw new Error(
          "AdaptTable: Vuetify row actions require rowActions() or rowPinning() from @adapttable/vuetify."
        );
      return renderFeatureSlot(
        rowActionsControlKey<TRow>(),
        shell.slotFills.value,
        {
          controls: actions,
          layout: props.rowActionsLayout,
          label: table.labels.value.rowActionsMenu,
          classNames: names.value,
        }
      );
    },
    GroupRow: (group) => {
      if (!shell.slotFills.value.get(VUETIFY_GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: Vuetify grouping rows require grouping() from @adapttable/vuetify/grouping."
        );
      return renderFeatureSlot(
        vuetifyGroupRowSlotKey<TRow>(),
        shell.slotFills.value,
        group
      );
    },
    cell: slots.cell,
    header: slots.header,
    headerActions: slots.headerActions,
    footer: slots.footer,
  };
}
function surfaceControls(): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, value, onChange, classNames }) =>
      h(
        "div",
        {
          "data-adapttable-part": "search-field",
          class: classNames.searchWrapper,
        },
        [
          h(VIcon, {
            icon: [
              "M9.5 3a6.5 6.5 0 1 0 3.98 11.64L19.84 21 21 19.84l-6.36-6.36A6.5 6.5 0 0 0 9.5 3m0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9",
            ],
            "aria-hidden": "true",
            "data-adapttable-part": "search-icon",
            class: classNames.searchIcon,
          }),
          h(VuetifyInput, { attrs, value, type: "search", onChange }),
        ]
      ),
    Select: ({ attrs, value, options, onChange }) =>
      h(VuetifySelect, { attrs, value, options, onChange }),
    Button: ({ attrs, content }) => vuetifyButton(attrs, content),
    Loading: (loading) => h(LoadingState, loading),
    Desktop: ({ model, classNames }) =>
      h(VuetifyDesktop<TRow>, {
        model,
        classNames,
        controls: controls(),
        density: shell.density.value,
      }),
    Mobile: ({ model, classNames }) =>
      h(VuetifyMobile<TRow>, { model, classNames, controls: controls() }),
  };
}
function setRootElement(element: HTMLElement | null): void {
  rootElement.value = element;
}
function setScrollElement(element: HTMLElement | null): void {
  scrollElement.value = element;
}
</script>

<template>
  <VLocaleProvider :rtl="table.dir.value === 'rtl'" :locale="locale">
    <DataTableSurfaceChrome
      v-bind="$attrs"
      class="adapttable-vuetify"
      :model="shell"
      :options="props"
      :slots="surfaceControls()"
      :content="slots"
      :root-ref="setRootElement"
      :scroll-ref="setScrollElement"
    />
  </VLocaleProvider>
</template>
