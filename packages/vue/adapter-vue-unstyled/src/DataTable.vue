<script setup lang="ts" generic="TRow">
import {
  type ColumnLayoutState,
  defaultConfirm,
  DENSITY_CONTROL,
  DesktopTableChrome,
  FULLSCREEN_CONTROL,
  MobileCardsChrome,
  renderFeatureSlot,
  SAVED_VIEWS_CONTROL,
  type TableChromeSlots,
  type TableDensity,
  TOOLBAR_EXTRAS,
  useDataTableShell,
} from "@adapttable/vue/adapter";
import {
  computed,
  h,
  mergeProps,
  onBeforeUnmount,
  shallowRef,
  watch,
} from "vue";

import { provideClassNames } from "./classNamesContext";
import { nativeCheckbox } from "./nativeCheckbox";
import { nativeColumnGroupToggle } from "./nativeColumnGroupToggle";
import { nativeHierarchyControls } from "./nativeHierarchyControls";
import {
  NATIVE_GROUP_ROW,
  nativeGroupRowSlotKey,
} from "./nativeHierarchyControlSlots";
import type { DataTableProps, DataTableSlots } from "./types";

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
const shell = useDataTableShell<TRow>(() => ({
  ...props,
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
const hasToolbarExtras = computed(() =>
  [
    TOOLBAR_EXTRAS,
    DENSITY_CONTROL,
    FULLSCREEN_CONTROL,
    SAVED_VIEWS_CONTROL,
  ].some((slot) => Boolean(shell.slotFills.value.get(slot.id)?.length))
);
const ToolbarExtras = () => shell.renderToolbarExtras({ ...names.value });
const BatchEditBar = () => shell.renderBatchEditBar();
function controls(): TableChromeSlots<TRow> {
  return {
    SortButton: ({ attrs, content }) => h("button", attrs, [content]),
    SelectionCheckbox: ({ attrs }) => nativeCheckbox(attrs),
    ColumnGroupToggle: nativeColumnGroupToggle,
    ResizeHandle: ({ attrs }) => h("span", attrs),
    RowActions: ({ controls: actions }) =>
      actions.map((action) =>
        h(
          "button",
          mergeProps(action.attrs, {
            key: action.key,
            class: names.value.rowAction,
          }),
          action.label
        )
      ),
    ...nativeHierarchyControls<TRow>(),
    GroupRow: (props) => {
      if (!shell.slotFills.value.get(NATIVE_GROUP_ROW.id)?.length)
        throw new Error(
          "AdaptTable: native grouping rows require grouping() from @adapttable/vue-unstyled/grouping."
        );
      return renderFeatureSlot(
        nativeGroupRowSlotKey<TRow>(),
        shell.slotFills.value,
        props
      );
    },
    cell: slots.cell,
    header: slots.header,
  };
}
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
onBeforeUnmount(() => {
  shell.setSurface(null);
});
defineExpose(shell.handle);
function changeLimit(event: Event): void {
  if (event.target instanceof HTMLSelectElement)
    table.setLimit(Number(event.target.value));
}
function changeSort(event: Event): void {
  if (event.target instanceof HTMLSelectElement)
    shell.source.value.setSort(
      event.target.value || undefined,
      table.sortDir.value
    );
}
function toggleDirection(): void {
  shell.source.value.setSort(
    table.sortBy.value,
    table.sortDir.value === "asc" ? "desc" : "asc"
  );
}
const liveStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
</script>

<template>
  <div
    ref="rootElement"
    v-bind="$attrs"
    :dir="table.dir.value"
    data-adapttable-part="root"
    :data-density="shell.density.value"
    :class="names.root"
  >
    <div
      v-if="
        searchable !== false ||
        table.isMobile.value ||
        slots.toolbar ||
        hasToolbarExtras ||
        shell.rowActions.value?.canAdd
      "
      data-adapttable-part="toolbar"
      :class="names.toolbar"
    >
      <label
        v-if="searchable !== false"
        data-adapttable-part="search-field"
        :class="names.searchWrapper"
      >
        <span :style="liveStyle">{{ table.labels.value.search }}</span>
        <input
          v-bind="table.searchInputAttrs()"
          data-adapttable-part="search"
          :class="names.searchInput"
        />
      </label>
      <template v-if="table.isMobile.value && table.sortByOptions.value.length">
        <label>
          {{ table.labels.value.sortBy }}
          <select
            :aria-label="table.labels.value.sortBy"
            :value="table.sortBy.value ?? ''"
            data-adapttable-part="sort-select"
            :class="names.sortSelect"
            @change="changeSort"
          >
            <option value="">{{ table.labels.value.sortBy }}</option>
            <option
              v-for="option in table.sortByOptions.value"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <button
          type="button"
          :disabled="!table.sortBy.value"
          :aria-label="
            table.sortDir.value === 'asc'
              ? table.labels.value.sortDescending
              : table.labels.value.sortAscending
          "
          data-adapttable-part="sort-direction"
          :class="names.sortDirectionButton"
          @click="toggleDirection"
        >
          {{
            table.sortDir.value === "asc"
              ? table.labels.value.sortAscending
              : table.labels.value.sortDescending
          }}
        </button>
      </template>
      <ToolbarExtras />
      <button
        v-if="shell.rowActions.value?.canAdd"
        type="button"
        data-adapttable-part="add-row"
        :class="names.addRow"
        @click="shell.rowActions.value.addRow()"
      >
        {{ table.labels.value.addRow }}
      </button>
      <slot name="toolbar" />
    </div>
    <BatchEditBar />
    <div
      v-if="table.errorState.value"
      role="alert"
      data-adapttable-part="error"
      :class="names.error"
    >
      <slot name="error" v-bind="table.errorState.value">
        <strong>{{ table.labels.value.errorTitle }}</strong>
        <p>{{ table.labels.value.errorMessage }}</p>
        <button
          v-if="table.errorState.value.retry"
          type="button"
          :disabled="table.errorState.value.retrying"
          data-adapttable-part="retry-button"
          :class="names.retry"
          @click="table.errorState.value.retry()"
        >
          {{ table.labels.value.retry }}
        </button>
      </slot>
    </div>
    <div
      v-if="table.isRefreshing.value"
      role="status"
      data-adapttable-part="refresh-indicator"
      :class="names.refreshing"
    >
      {{ table.labels.value.loading }}
    </div>
    <div
      ref="scrollElement"
      tabindex="-1"
      data-adapttable-part="scroll-box"
      :class="names.scroll"
      :aria-busy="
        shell.source.value.isLoading || table.isRefreshing.value
          ? 'true'
          : undefined
      "
    >
      <div
        v-if="table.bodyRegion.value === 'skeleton'"
        role="status"
        data-adapttable-part="loading"
        :class="names.loading"
      >
        <slot name="loading">{{ table.labels.value.loading }}</slot>
      </div>
      <output
        v-else-if="
          table.bodyRegion.value === 'empty' && !table.errorState.value
        "
        data-adapttable-part="empty"
        :class="names.empty"
      >
        <slot
          name="empty"
          :no-results="table.emptyVariant.value === 'noResults'"
          :clear="table.clearSearchAndFilters"
        >
          {{
            table.emptyVariant.value === "noResults"
              ? table.labels.value.noResults
              : table.labels.value.noData
          }}
          <button
            v-if="table.emptyVariant.value === 'noResults'"
            type="button"
            data-adapttable-part="empty-clear"
            :class="names.emptyClear"
            @click="table.clearSearchAndFilters"
          >
            {{ table.labels.value.clearAll }}
          </button>
        </slot>
      </output>
      <MobileCardsChrome
        v-else-if="table.isMobile.value && table.rows.value.length"
        :model="shell.mobile.value"
        :slots="controls()"
        :class-names="names"
      />
      <DesktopTableChrome
        v-else-if="table.rows.value.length"
        :model="shell.desktop.value"
        :slots="controls()"
        :class-names="names"
      />
      <div
        v-if="table.canLoadMore.value"
        v-bind="table.loadMoreAttrs()"
        data-adapttable-part="load-more"
        :class="names.loadMore"
      >
        <button
          v-bind="table.loadMoreButtonAttrs()"
          data-adapttable-part="load-more-button"
          :class="names.loadMoreButton"
        >
          {{ table.labels.value.loadMore }}
        </button>
      </div>
    </div>
    <div
      v-if="table.showFooter.value"
      data-adapttable-part="footer"
      :class="names.footer"
    >
      <label
        >{{ table.labels.value.rowsPerPage }}
        <select
          :value="shell.source.value.limit"
          :aria-label="table.labels.value.rowsPerPage"
          data-adapttable-part="rows-per-page"
          :class="names.rowsPerPage"
          @change="changeLimit"
        >
          <option
            v-for="size in table.pageSizeOptions.value"
            :key="size"
            :value="size"
          >
            {{ size }}
          </option>
        </select>
      </label>
      <span>{{
        table.labels.value.showing({
          from: table.pagination.value.fromIndex,
          to: table.pagination.value.toIndex,
          total: shell.source.value.total,
        })
      }}</span>
      <div data-adapttable-part="pager" :class="names.pager">
        <span>{{
          table.labels.value.pageOf({
            page: table.pagination.value.safePage,
            total: table.pagination.value.totalPages,
          })
        }}</span>
        <button
          type="button"
          :aria-label="table.labels.value.previousPage"
          :disabled="table.pagination.value.safePage <= 1"
          data-adapttable-part="page-prev"
          :class="names.pagePrev"
          @click="table.setPage(table.pagination.value.safePage - 1)"
        >
          {{ table.labels.value.previousPage }}
        </button>
        <template v-for="page in table.pagerSlots.value" :key="page.key">
          <span
            v-if="page.item === 'ellipsis'"
            aria-hidden="true"
            data-adapttable-part="page-ellipsis"
            :class="names.pageEllipsis"
            >…</span
          >
          <button
            v-else
            type="button"
            :aria-label="table.labels.value.goToPage(page.item)"
            :aria-current="
              page.item === table.pagination.value.safePage ? 'page' : undefined
            "
            data-adapttable-part="page-number"
            :class="names.pageNumber"
            @click="table.setPage(page.item)"
          >
            {{ page.item }}
          </button>
        </template>
        <button
          type="button"
          :aria-label="table.labels.value.nextPage"
          :disabled="
            table.pagination.value.safePage >= table.pagination.value.totalPages
          "
          data-adapttable-part="page-next"
          :class="names.pageNext"
          @click="table.setPage(table.pagination.value.safePage + 1)"
        >
          {{ table.labels.value.nextPage }}
        </button>
      </div>
    </div>
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-adapttable-part="status"
      :class="names.status"
      :style="liveStyle"
      >{{ table.statusAnnouncement.value }}</span
    >
  </div>
</template>
