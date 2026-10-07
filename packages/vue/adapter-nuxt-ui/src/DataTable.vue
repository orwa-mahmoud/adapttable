<script setup lang="ts" generic="TRow">
import type {
  ColumnLayoutState,
  DataTableHandle,
  TableDensity,
} from "@adapttable/vue";
import {
  ColumnGroupToggleChrome,
  type DataTableProps,
  type DataTableSlots,
  DataTableSurfaceChrome,
  defaultConfirm,
  FULLSCREEN_MODEL,
  GROUP_ROW,
  groupRowSlotKey,
  mergeVueAttrs,
  provideDataTableClassNames,
  renderFeatureSlot,
  type TableChromeSlots,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import UApp from "@nuxt/ui/components/App.vue";
import {
  computed,
  h,
  onBeforeUnmount,
  onBeforeUpdate,
  shallowRef,
  watch,
} from "vue";

import NuxtButton from "./controls/NuxtButton.vue";
import { provideNuxtPortalContainer } from "./controls/portalContext";
import { nuxtSelection } from "./controls/selection";
import { provideNuxtDensity } from "./densityContext";
import { nuxtSurface } from "./surface";

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
const footerSlot = shallowRef(slots.footer);
onBeforeUpdate(() => {
  footerSlot.value = slots.footer;
});
const shell = useDataTableShell<TRow>(() => ({
  ...props,
  footer: footerSlot.value,
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
const names = computed(() => props.classNames ?? {});
const fullscreen = shell.state.get(FULLSCREEN_MODEL);
const portalContainer = provideNuxtPortalContainer(
  () => fullscreen.value?.container
);
provideDataTableClassNames(() => names.value);
provideNuxtDensity(() => shell.density.value);
function controls(): TableChromeSlots<TRow> {
  return {
    SortButton: ({ attrs, content }) => h(NuxtButton, { attrs }, () => content),
    SelectionCheckbox: nuxtSelection,
    ColumnGroupToggle: (control) =>
      ColumnGroupToggleChrome({
        ...control,
        slots: {
          Button: ({ label, expanded, className, onClick }) =>
            h(
              NuxtButton,
              {
                attrs: {
                  "data-adapttable-part": "column-group-toggle",
                  "aria-expanded": expanded,
                  "aria-label": label,
                  title: label,
                  class: className,
                  onClick,
                },
              },
              () => h("span", { "aria-hidden": "true" }, expanded ? "−" : "+")
            ),
        },
      }),
    ResizeHandle: ({ attrs }) => h(NuxtButton, { attrs }),
    TreeToggle: ({ attrs, expanded, loading }) => {
      const glyph = expanded ? "−" : "+";
      return h(NuxtButton, { attrs }, () =>
        h("span", { "aria-hidden": "true" }, loading ? "…" : glyph)
      );
    },
    RowDetailToggle: ({ attrs, expanded }) =>
      h(NuxtButton, { attrs }, () =>
        h("span", { "aria-hidden": "true" }, expanded ? "−" : "+")
      ),
    RowActions: ({ controls: actions }) =>
      actions.map((action) =>
        h(
          NuxtButton,
          {
            key: action.key,
            attrs: mergeVueAttrs(action.attrs, {
              class: [names.value.actionButton, names.value.rowAction],
              onClick: (event: MouseEvent) => event.stopPropagation(),
            }),
          },
          () => action.label
        )
      ),
    GroupRow: (control) => {
      if (!shell.slotFills.value.get(GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: Nuxt UI grouping rows require the Nuxt UI grouping feature."
        );
      return renderFeatureSlot(
        groupRowSlotKey<TRow>(),
        shell.slotFills.value,
        control
      );
    },
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
defineExpose<DataTableHandle<TRow>>(shell.handle);
function rootRef(element: HTMLElement | null): void {
  root.value = element;
}
function scrollRef(element: HTMLElement | null): void {
  scroll.value = element;
}
</script>

<template>
  <UApp
    :dir="shell.table.dir.value"
    :portal="portalContainer ?? 'body'"
    :toaster="null"
  >
    <DataTableSurfaceChrome
      v-bind="$attrs"
      class="adapttable-nuxt"
      :model="shell"
      :options="props"
      :slots="nuxtSurface(controls())"
      :content="slots"
      :root-ref="rootRef"
      :scroll-ref="scrollRef"
    />
  </UApp>
</template>

<style>
@source inline("px-2 py-1.5 text-xs p-3 sm:p-3");

@layer components {
  .adapttable-nuxt {
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius);
    color: var(--ui-text);
    background: var(--ui-bg);
  }
  .adapttable-nuxt > [data-adapttable-part="toolbar"],
  .adapttable-nuxt > [data-adapttable-part="footer"] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
  }
  .adapttable-nuxt [data-adapttable-part="scroll-box"] {
    overflow-x: auto;
  }
  .adapttable-nuxt [data-adapttable-part="pager"] {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  .adapttable-nuxt [data-adapttable-part="cards"] {
    display: grid;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  .adapttable-nuxt [data-adapttable-part="card-row"] {
    display: grid;
    grid-template-columns: minmax(6rem, 1fr) 2fr;
    gap: 0.75rem;
  }
  .adapttable-nuxt [data-adapttable-part="card-label"] {
    color: var(--ui-text-muted);
  }
  .adapttable-nuxt [data-adapttable-part="card-value"] {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .adapttable-nuxt button:not([role="checkbox"]) {
    min-height: 2.25rem;
  }
  .adapttable-nuxt[data-density="compact"] > [data-adapttable-part="toolbar"],
  .adapttable-nuxt[data-density="compact"] > [data-adapttable-part="footer"] {
    gap: 0.5rem;
    padding: 0.75rem;
  }
  .adapttable-nuxt[data-density="compact"] [data-adapttable-part="cards"] {
    gap: 0.5rem;
    padding: 0.5rem;
  }
  .adapttable-nuxt[data-density="compact"] [data-adapttable-part="card-row"] {
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
  .adapttable-nuxt[data-density="compact"] button:not([role="checkbox"]) {
    min-height: 2rem;
  }
  @media (pointer: coarse) {
    .adapttable-nuxt button,
    .adapttable-nuxt button:not([role="checkbox"]),
    .adapttable-nuxt[data-density="compact"] button:not([role="checkbox"]) {
      min-height: 2.75rem;
    }
  }
  .adapttable-nuxt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .adapttable-nuxt-table th {
    text-align: start;
  }
  .adapttable-nuxt-table tbody tr:hover {
    background: var(--ui-bg-muted);
  }
  .adapttable-nuxt-table [data-adapttable-part="sort-button"] {
    padding-inline: 0;
  }
}
</style>
