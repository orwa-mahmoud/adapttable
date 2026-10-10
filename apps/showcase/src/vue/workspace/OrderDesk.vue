<script setup lang="ts">
import { getLabels } from "@adapttable/i18n";
import {
  aggregate,
  type TableFeature,
  type UseSavedViewsResult,
} from "@adapttable/vue";
import { GRID_FOCUS_MODEL, SAVED_VIEWS_MODEL } from "@adapttable/vue/adapter";
import {
  type ColumnDef,
  DataTable,
  type DataTableHandle,
} from "@adapttable/vue-unstyled";
import {
  agentApproval,
  tableAssistant,
} from "@adapttable/vue-unstyled/assistant";
import { bulkActions } from "@adapttable/vue-unstyled/bulk-actions";
import {
  cellNavigation,
  type CellRange,
} from "@adapttable/vue-unstyled/cell-navigation";
import { commandPalette } from "@adapttable/vue-unstyled/command-palette";
import { contextMenu } from "@adapttable/vue-unstyled/context-menu";
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { editing } from "@adapttable/vue-unstyled/editing";
import { exportCsv } from "@adapttable/vue-unstyled/export-csv";
import { filters } from "@adapttable/vue-unstyled/filters";
import { findInTable } from "@adapttable/vue-unstyled/find-in-table";
import { useGroupCollapseUrlState } from "@adapttable/vue-unstyled/grouping";
import { groupingPanel } from "@adapttable/vue-unstyled/grouping-panel";
import { nestedTable } from "@adapttable/vue-unstyled/nested-table";
import {
  savedViews,
  SavedViewsPanel,
} from "@adapttable/vue-unstyled/saved-views";
import { sidePanel } from "@adapttable/vue-unstyled/side-panel";
import { statusBar } from "@adapttable/vue-unstyled/status-bar";
import { computed, h, shallowRef, watch } from "vue";

import { workspaceCopy } from "./copy";
import {
  date,
  money,
  type Order,
  orderKey,
  regionLabel,
  statusLabel,
  type WorkspaceProps,
} from "./data";
import OrderLines from "./OrderLines.vue";
import { REGIONS, useWorkspaceSession } from "./session";
import { useOrderAssistant } from "./useOrderAssistant";

const props = defineProps<WorkspaceProps & { rows: readonly Order[] }>();
const emit = defineEmits<{ update: [rows: readonly Order[]]; restore: [] }>();
const text = computed(() => workspaceCopy[props.locale]);
const collapse = useGroupCollapseUrlState({ urlKey: "workspace-order-groups" });
const session = useWorkspaceSession();
const table = shallowRef<DataTableHandle<Order>>();
const selected = computed({
  get: () => session.state.value.desk.selected,
  set: (ids: readonly string[]) => session.updateDesk({ selected: ids }),
});
const scope = computed({
  get: () => session.state.value.desk.scope,
  set: (value) => session.updateDesk({ scope: value }),
});
const shown = computed({
  get: () => session.state.value.desk.shown,
  set: (value: boolean) => session.updateDesk({ shown: value }),
});
const panel = computed({
  get: () => session.state.value.desk.panel,
  set: (value: string | null) => session.updateDesk({ panel: value }),
});
const sourceGroup = shallowRef<string>();
const grouped = computed({
  get: () => Boolean(sourceGroup.value),
  set: (value: boolean) =>
    table.value
      ?.getView()
      ?.groupingState?.setGroupBy(value ? "region" : undefined),
});
const message = shallowRef("");
const mobileView = shallowRef(props.mobile === true);
const range = shallowRef<CellRange | null>(null);
const savedViewsState = shallowRef<UseSavedViewsResult>();
const persistentViews = savedViews({
  storageKey: "adapttable-vue-workspace-orders:views:v1",
});
const orderUrlKey = "workspace-orders";
const hasNoInitialOrdersState = ![
  ...new URLSearchParams(window.location.search).keys(),
].some((key) => key.startsWith(`${orderUrlKey}.`));
let defaultConsidered = false;
const rangeReady = computed(() => !mobileView.value && range.value !== null);
const exportBlocked = computed(
  () => scope.value === "range" && !rangeReady.value
);
const exportReason = computed(() =>
  mobileView.value ? text.value.rangeMobile : text.value.rangeHelp
);
let clearRange = (): void => {
  range.value = null;
};
const pending = computed(() =>
  props.rows.filter((row) => row.status === "Review")
);
// Observe the binding's resolved mode and source; this host owns no viewport or query engine.
const presentation: TableFeature<Order> = {
  id: "workspace-order-presentation",
  mount: ({ table: current, source, state, bodyRows, active }) => {
    const grid = state.get(GRID_FOCUS_MODEL);
    const views = state.get(SAVED_VIEWS_MODEL);
    watch(
      [active, views, () => views.value?.views.value],
      ([enabled, value]) => {
        savedViewsState.value = value;
        if (enabled && value && !defaultConsidered) {
          // The browser store connects synchronously on activation. Decide after
          // that load settles, including an empty list, and never on later reloads.
          defaultConsidered = true;
          const eligible = session.consumeInitialViewDefaults();
          const initial = value.defaultView.value;
          if (eligible && hasNoInitialOrdersState && initial)
            value.apply(initial.name);
        }
      },
      { immediate: true, flush: "post" }
    );
    let freshRequired = false;
    clearRange = () => {
      grid.value?.selectRange(null);
      range.value = null;
    };
    watch(
      () => [current.isMobile.value, grid.value?.enabled] as const,
      ([mobile, enabled]) => {
        mobileView.value = mobile;
        if (mobile || !enabled) {
          freshRequired = true;
          range.value = null;
        } else if (freshRequired) {
          freshRequired = false;
          clearRange();
        }
      },
      { immediate: true, flush: "sync" }
    );
    watch(
      () => grid.value?.range,
      (value) => {
        range.value =
          !mobileView.value && !freshRequired ? (value ?? null) : null;
      },
      { immediate: true, flush: "sync" }
    );
    watch(
      () =>
        JSON.stringify([
          source.value.search,
          source.value.sortBy,
          source.value.sortDir,
          source.value.page,
          source.value.limit,
          source.value.groupBy,
          source.value.extra,
          bodyRows?.value.map((row) => row.key),
        ]),
      () => {
        if (grid.value?.enabled) clearRange();
        else {
          freshRequired = true;
          range.value = null;
        }
      },
      { flush: "sync" }
    );
    watch(
      () => source.value.groupBy,
      (value) => {
        sourceGroup.value = value;
      },
      { immediate: true, flush: "sync" }
    );
    return () => {
      clearRange = () => {
        range.value = null;
      };
      range.value = null;
      savedViewsState.value = undefined;
    };
  },
};
function showPending(): void {
  const query = table.value?.getView()?.query;
  if (!query) return;
  query.setSearch("");
  query.clearExtras?.();
  query.setExtras?.({ status: "Review" });
  query.setPage(1);
  collapse.onCollapsedGroupIdsChange([]);
  selected.value = pending.value.map(orderKey);
  message.value = `${pending.value.length} ${text.value.commandDone}`;
}
function reviewOrder(row: Order): void {
  const query = table.value?.getView()?.query;
  if (!query) return;
  query.setSearch(row.customer);
  query.clearExtras?.();
  query.setExtras?.({ status: row.status });
  query.setPage(1);
  collapse.onCollapsedGroupIdsChange([]);
  selected.value = [row.id];
  session.updateDesk({
    expanded: [...new Set([...session.state.value.desk.expanded, row.id])],
  });
  message.value = `${text.value.reviewing} ${row.id}.`;
}
const assistant = useOrderAssistant(() => ({
  locale: props.locale,
  rows: props.rows,
}));
const columns = computed<readonly ColumnDef<Order>[]>(() => [
  {
    key: "id",
    header: text.value.order,
    width: 124,
    sortable: true,
    footer: () => text.value.pageTotal,
  },
  { key: "customer", header: text.value.customer, width: 218, sortable: true },
  {
    key: "region",
    header: text.value.region,
    width: 148,
    groupable: true,
    sortable: true,
    formatValue: (row) => regionLabel(row.region, props.locale),
  },
  {
    key: "owner",
    header: text.value.owner,
    width: 172,
    editable: true,
    validate: (value) =>
      typeof value === "string" && value.trim().length >= 2
        ? undefined
        : text.value.invalidOwner,
  },
  {
    key: "status",
    header: text.value.status,
    width: 128,
    sortable: true,
    cell: ({ row }) =>
      h(
        "span",
        { class: `order-status order-status--${row.status.toLowerCase()}` },
        statusLabel(row.status, props.locale)
      ),
  },
  {
    key: "due",
    header: text.value.due,
    width: 132,
    sortable: true,
    formatValue: (row) => date(row.due, props.locale),
  },
  {
    key: "amount",
    header: text.value.amount,
    width: 124,
    type: "number",
    sortable: true,
    aggregatable: true,
    align: "end",
    formatValue: (row) => money(row.amount, props.locale),
  },
]);
const navigation = cellNavigation({
  onRangeChange: (next) => {
    range.value = mobileView.value ? null : next;
  },
});
const edit = editing<Order>((original, key, value) => {
  if (key !== "owner" || typeof value !== "string") return;
  emit(
    "update",
    props.rows.map((row) =>
      row.id === original.id ? { ...row, owner: value.trim() } : row
    )
  );
  message.value = `${text.value.saved} ${original.id}.`;
});
const features = computed(() => [
  filters<Order>(
    [
      {
        key: "status",
        type: "select",
        label: text.value.status,
        options: ["Review", "Ready", "Dispatched"].map((status) => ({
          value: status,
          label: statusLabel(status as Order["status"], props.locale),
        })),
      },
      {
        key: "region",
        type: "select",
        label: text.value.region,
        options: REGIONS.map((region) => ({
          value: region,
          label: regionLabel(region, props.locale),
        })),
      },
    ],
    { mode: mobileView.value ? "drawer" : "popover" }
  ),
  navigation,
  persistentViews,
  presentation,
  findInTable({ button: true }),
  statusBar(),
  densityChooser(),
  edit,
  groupingPanel<Order>([], {
    groupFooters: true,
    collapsedGroupIds: collapse.collapsedGroupIds,
    onCollapsedGroupIdsChange: collapse.onCollapsedGroupIdsChange,
  }),
  nestedTable<Order>(
    (row) => ({
      label: `${text.value.rowDetails} · ${row.id}`,
      table: (defaults) =>
        h(OrderLines, {
          order: row,
          locale: props.locale,
          mobile: props.mobile,
          density: defaults.density,
        }),
    }),
    undefined,
    {
      expandedRowIds: () => session.state.value.desk.expanded,
      onExpandedRowIdsChange: (ids) => session.updateDesk({ expanded: ids }),
    }
  ),
  bulkActions([
    {
      key: "ready",
      label: text.value.bulk,
      confirm: {
        title: text.value.bulkTitle,
        message: () => text.value.bulkMessage,
        confirmLabel: text.value.bulk,
      },
      onClick: (ids) => {
        const changed = props.rows.filter(
          (row) => ids.includes(row.id) && row.status === "Review"
        ).length;
        emit(
          "update",
          props.rows.map((row) =>
            ids.includes(row.id) && row.status === "Review"
              ? { ...row, status: "Ready" }
              : row
          )
        );
        message.value = `${changed} ${text.value.bulkDone}`;
      },
    },
  ]),
  commandPalette({
    button: true,
    commands: [
      {
        key: "review",
        label: text.value.command,
        onSelect: showPending,
      },
    ],
  }),
  contextMenu<Order>({
    items: (target) =>
      target.kind === "header"
        ? []
        : [
            {
              key: "select",
              label: text.value.context,
              onSelect: () => {
                selected.value = [target.row.id];
                message.value = `${text.value.contextDone} ${target.row.id}.`;
              },
            },
            {
              key: "detail",
              label: text.value.openDetails,
              onSelect: () => reviewOrder(target.row),
            },
          ],
  }),
  sidePanel({
    panels: [
      {
        key: "guide",
        label: text.value.panel,
        content: () =>
          h("div", { class: "workspace-review-queue" }, [
            h("p", text.value.queueHelp),
            ...(pending.value.length
              ? pending.value.map((row) =>
                  h(
                    "button",
                    { type: "button", onClick: () => reviewOrder(row) },
                    [h("bdi", row.id), ` · ${row.customer}`]
                  )
                )
              : [h("p", text.value.queueEmpty)]),
          ]),
      },
      {
        key: "views",
        label: text.value.manageViews,
        content: () => {
          const views = savedViewsState.value;
          return views
            ? h(SavedViewsPanel, {
                views: views.views.value,
                onApply: views.apply,
                onRename: views.rename,
                onMove: views.move,
                onSetDefault: views.setDefault,
                onRemove: views.remove,
                labels: getLabels(props.locale),
                footer: text.value.savedViewsHelp,
              })
            : null;
        },
      },
      {
        key: "scope",
        label: text.value.panelScope,
        content: text.value.panelScopeText,
      },
    ],
    open: panel,
    onOpenChange: (value) => {
      panel.value = value;
    },
  }),
  ...(!exportBlocked.value
    ? [
        exportCsv<Order>({
          scope: scope.value,
          filename: "order-desk.csv",
          onBeforeExport: (info) => {
            if (
              scope.value === "range" &&
              (!rangeReady.value || !info.rows.length || !info.columns.length)
            ) {
              message.value = exportReason.value;
              return false;
            }
            return true;
          },
        }),
      ]
    : []),
  assistant.agent,
  tableAssistant(),
  agentApproval(),
]);
const summary = computed(() =>
  aggregate<Order>(
    { amount: "sum" },
    { format: (value) => money(Number(value), props.locale) }
  )
);
function restore(): void {
  emit("restore");
  selected.value = [];
  message.value = text.value.refreshed;
}
</script>
<template>
  <section class="workspace-view" aria-labelledby="orders-heading">
    <header class="workspace-view__head">
      <div>
        <p class="workspace-eyebrow">01 / {{ text.orders }}</p>
        <h2 id="orders-heading">{{ text.ordersTitle }}</h2>
        <p>{{ text.ordersLead }}</p>
      </div>
      <span class="workspace-local"
        ><span aria-hidden="true"></span>{{ text.local }}</span
      >
    </header>
    <div class="workspace-controls">
      <div class="workspace-preference">
        <span>{{ text.group }}</span>
        <div class="workspace-choice" role="group" :aria-label="text.group">
          <button
            type="button"
            :disabled="!shown"
            :aria-pressed="!grouped"
            @click="grouped = false"
          >
            {{ text.groupingOff }}
          </button>
          <button
            type="button"
            :disabled="!shown"
            :aria-pressed="grouped"
            @click="grouped = true"
          >
            {{ text.groupingOn }}
          </button>
        </div>
      </div>
      <label
        >{{ text.exportScope
        }}<select v-model="scope">
          <option value="page">
            {{ mobileView ? text.loadedCards : text.page }}
          </option>
          <option value="range" :disabled="mobileView">{{ text.range }}</option>
          <option value="all">{{ text.all }}</option>
        </select></label
      >
      <div class="workspace-controls__actions">
        <button type="button" :disabled="!shown" @click="panel = 'guide'">
          {{ text.panel }}
        </button>
        <button type="button" :disabled="!shown" @click="panel = 'views'">
          {{ text.manageViews }}
        </button>
        <button
          v-if="scope === 'range' && rangeReady"
          type="button"
          @click="clearRange"
        >
          {{ text.clearRange }}
        </button>
        <button type="button" @click="restore">{{ text.refresh }}</button
        ><button type="button" :aria-pressed="!shown" @click="shown = !shown">
          {{ shown ? text.pause : text.resume }}
        </button>
      </div>
    </div>
    <p class="workspace-feedback" role="status" aria-live="polite">
      {{ message || text.local
      }}<span v-if="selected.length">
        · {{ selected.length }} {{ text.selected }}</span
      >
    </p>
    <p
      v-if="exportBlocked"
      class="workspace-export-hint"
      role="status"
      data-workspace-export-blocked
    >
      {{ exportReason }}
    </p>
    <KeepAlive>
      <DataTable
        v-if="shown"
        ref="table"
        v-model:selected-ids="selected"
        data-workspace-table="orders"
        :data="rows"
        :columns="columns"
        :row-key="orderKey"
        :features="features"
        :assistant="assistant.view.value"
        :summary-row="summary"
        :labels="getLabels(locale)"
        :locale="locale"
        :dir="locale === 'ar' ? 'rtl' : 'ltr'"
        :force-mobile="mobile"
        :defaults="{ limit: 6 }"
        :default-column-layout="{ pinned: { id: 'start', amount: 'end' } }"
        :url-key="orderUrlKey"
        :url-sync="true"
        :search-debounce-ms="0"
        :table-label="text.orders"
        selectable
      >
        <template #tableFooter
          ><p class="workspace-table-note">{{ text.reviewNote }}</p></template
        >
        <template #empty="state"
          ><div class="workspace-empty">
            <strong>{{ text.noOrders }}</strong>
            <p>{{ text.noOrdersHint }}</p>
            <button v-if="state.noResults" type="button" @click="state.clear">
              {{ text.clear }}
            </button>
          </div></template
        >
      </DataTable>
    </KeepAlive>
    <div v-if="!shown" class="workspace-empty workspace-paused" role="status">
      <strong>{{ text.paused }}</strong>
      <p>{{ text.pausedBody }}</p>
      <button type="button" @click="shown = true">{{ text.resume }}</button>
    </div>
  </section>
</template>
