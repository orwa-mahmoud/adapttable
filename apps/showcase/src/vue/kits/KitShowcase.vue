<script setup lang="ts">
import "./showcase.css";

import { getLabels } from "@adapttable/i18n";
import {
  type ColumnDef,
  type ColumnLayoutState,
  useColumnLayoutUrlState,
} from "@adapttable/vue";
import type { DataTableProps } from "@adapttable/vue/adapter";
import { computed, shallowRef, type VNodeChild, watch } from "vue";

import { workspaceCopy } from "../workspace/copy";
import {
  date,
  makeOrders,
  money,
  type Order,
  orderKey,
  regionLabel,
  statusLabel,
} from "../workspace/data";
import { useWorkspacePresentation } from "../workspace/presentation";
import { kitPreviewCopy, kitPreviews } from "./copy";

const props = withDefaults(
  defineProps<{
    name: string;
    kit: string;
    columnsDemo?: boolean;
    renderStatus: (row: Order, label: string) => VNodeChild;
  }>(),
  { columnsDemo: false }
);
const presentation = useWorkspacePresentation();
const query = shallowRef(window.location.search);
watch(
  () => presentation.state.value.dark,
  (dark) => {
    document.documentElement.classList.toggle("dark", dark);
  },
  { immediate: true }
);
const locale = computed(() => presentation.state.value.locale);
const text = computed(() => workspaceCopy[locale.value]);
const preview = computed(() => kitPreviewCopy[locale.value]);
const rows = makeOrders();
const selected = shallowRef<string[]>([]);
const columnState = useColumnLayoutUrlState({
  urlKey: `kit-${props.kit}-orders`,
  defaultColumnLayout: {
    hidden: props.columnsDemo ? ["region", "owner"] : [],
  },
});
watch(columnState.layout, () => {
  columnState.flush();
  query.value = window.location.search;
});
const demoWidths: Readonly<Record<string, number>> = {
  id: 140,
  customer: 280,
  region: 220,
  owner: 260,
  status: 140,
  due: 160,
  amount: 130,
};
const columns = computed<readonly ColumnDef<Order>[]>(() => {
  const values: readonly ColumnDef<Order>[] = [
    { key: "id", header: text.value.order, width: 120, sortable: true },
    {
      key: "customer",
      header: text.value.customer,
      width: 200,
      sortable: true,
    },
    {
      key: "region",
      header: text.value.region,
      width: 145,
      sortable: true,
      formatValue: (row) => regionLabel(row.region, locale.value),
    },
    { key: "owner", header: text.value.owner, width: 155, sortable: true },
    {
      key: "status",
      header: text.value.status,
      width: 115,
      sortable: true,
      formatValue: (row) => statusLabel(row.status, locale.value),
      cell: ({ row }) =>
        props.renderStatus(row, statusLabel(row.status, locale.value)),
    },
    {
      key: "due",
      header: text.value.due,
      width: 130,
      sortable: true,
      formatValue: (row) => date(row.due, locale.value),
    },
    {
      key: "amount",
      header: text.value.amount,
      width: 105,
      sortable: true,
      formatValue: (row) => money(row.amount, locale.value),
    },
  ];
  return props.columnsDemo
    ? values.map((column) => ({
        ...column,
        width: demoWidths[column.key],
        minWidth: demoWidths[column.key],
      }))
    : values;
});
const tableProps = computed(
  () =>
    ({
      data: rows,
      columns: columns.value,
      rowKey: orderKey,
      labels: getLabels(locale.value),
      dir: locale.value === "ar" ? "rtl" : "ltr",
      tableLabel: text.value.orders,
      searchDebounceMs: 0,
      defaults: { limit: 5 },
      selectedIds: selected.value,
      selectable: true,
      forceMobile:
        presentation.state.value.layout === "cards" ? true : undefined,
      urlKey: `kit-${props.kit}-orders`,
      ...(props.columnsDemo ? { columnLayout: columnState.layout.value } : {}),
    }) satisfies DataTableProps<Order>
);
function changeSelection(ids: string[]): void {
  selected.value = ids;
}
function changeColumnLayout(next: ColumnLayoutState): void {
  const previous = columnState.layout.value;
  const pinAdded = Object.keys(next.pinned).some(
    (key) => !(key in previous.pinned)
  );
  columnState.onLayoutChange(
    pinAdded && next.hidden.length ? { ...next, hidden: [] } : next
  );
}
const presentationControls = computed(() => [
  {
    key: "theme",
    label: preview.value.appearance,
    value: presentation.state.value.dark ? "dark" : "light",
    options: [
      { value: "light", label: preview.value.light },
      { value: "dark", label: preview.value.dark },
    ],
  },
  {
    key: "lang",
    label: text.value.language,
    value: locale.value,
    options: [
      { value: "en", label: "English" },
      { value: "ar", label: "العربية" },
    ],
  },
  {
    key: "layout",
    label: text.value.layout,
    value: presentation.state.value.layout,
    options: [
      { value: "auto", label: text.value.auto },
      { value: "cards", label: text.value.cards },
    ],
  },
]);
function changePresentation(key: string, value: string): void {
  const target = presentationLink(key, value);
  if (
    target !==
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  )
    window.location.assign(target);
}
function presentationLink(key: string, value: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
</script>

<template>
  <main class="vue-kit-preview" :data-kit="kit">
    <header class="vue-kit-preview__header">
      <div class="vue-kit-preview__heading">
        <p class="vue-kit-preview__eyebrow">AdaptTable / Vue / {{ name }}</p>
        <div class="vue-kit-preview__title">
          <h1>{{ preview.title }}</h1>
          <span class="vue-kit-preview__notice" data-testid="parity-notice">{{
            preview.notice
          }}</span>
        </div>
        <p class="vue-kit-preview__lead">{{ preview.lead }}</p>
      </div>
      <div
        class="vue-kit-preview__presentation"
        :aria-label="preview.presentation"
        role="group"
      >
        <slot
          name="presentation"
          :controls="presentationControls"
          :on-change="changePresentation"
          :dark="presentation.state.value.dark"
          :locale="locale"
        />
      </div>
    </header>
    <div class="vue-kit-preview__overview">
      <dl class="vue-kit-preview__summary">
        <div>
          <dt>{{ preview.total }}</dt>
          <dd>{{ rows.length }}</dd>
        </div>
        <div>
          <dt>{{ text.needsReview }}</dt>
          <dd>{{ rows.filter((row) => row.status === "Review").length }}</dd>
        </div>
        <div>
          <dt>{{ text.value }}</dt>
          <dd>
            {{
              money(
                rows.reduce((sum, row) => sum + row.amount, 0),
                locale
              )
            }}
          </dd>
        </div>
      </dl>
      <p
        class="vue-kit-preview__selection"
        role="status"
        data-testid="selection-status"
      >
        {{ selected.length }} {{ text.selected }}
      </p>
    </div>
    <section :aria-label="text.orders" class="vue-kit-preview__table">
      <p v-if="columnsDemo" class="vue-kit-preview__column-hint">
        {{ preview.columns }}
      </p>
      <slot
        :table-props="tableProps"
        :on-selection-change="changeSelection"
        :on-column-layout-change="changeColumnLayout"
        :locale="locale"
        :dark="presentation.state.value.dark"
      />
    </section>
    <footer class="vue-kit-preview__footer">
      <p class="vue-kit-preview__keyboard">{{ preview.keyboard }}</p>
      <nav class="vue-kit-preview__kits" :aria-label="text.compare">
        <span>{{ preview.compare }}</span>
        <a
          v-for="item in kitPreviews"
          :key="item.key"
          :href="`../../${item.key}/orders/${query}`"
          :aria-current="kit === item.key ? 'page' : undefined"
          >{{ item.name }}</a
        >
        <a class="vue-kit-preview__workspace" href="../../unstyled/workspace/"
          >{{ preview.workspace }} <span aria-hidden="true">↗</span></a
        >
      </nav>
    </footer>
  </main>
</template>
