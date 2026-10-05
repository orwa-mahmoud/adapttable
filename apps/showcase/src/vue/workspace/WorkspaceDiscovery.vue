<script setup lang="ts">
import { computed, shallowRef } from "vue";

import { demoRoute, siteUrl } from "../../../../../scripts/site.mjs";
import { VUE_NATIVE_PAGES } from "../../../matrix.mjs";
import { SHOWCASE_PAGES } from "../../../pages.mjs";
import { docsUrl } from "../../matrix/content";
import { workspaceCopy } from "./copy";
import type { WorkspaceProps } from "./data";
import type { WorkspaceView } from "./presentation";

const props = defineProps<WorkspaceProps & { view: WorkspaceView }>();
const text = computed(() => workspaceCopy[props.locale]);
const search = shallowRef("");
const hierarchyLabel = computed(
  () =>
    ({
      orders: text.value.featureNested,
      dispatch: text.value.featureTree,
      revenue: text.value.featureGrouping,
    })[props.view]
);
const catalog = computed(() =>
  [
    { key: "filter-editing", label: text.value.featureFilters },
    {
      key: "hierarchy",
      label: hierarchyLabel.value,
    },
    { key: "actions", label: text.value.featureActions },
    { key: "assistant", label: text.value.featureAssistant },
    { key: "view-controls", label: text.value.featureViews },
    {
      key: "specialized",
      label:
        props.view === "dispatch"
          ? text.value.featureMoves
          : text.value.featureFormulas,
    },
    { key: "rows", label: text.value.featureSpans },
    { key: "navigation", label: text.value.featureNavigation },
    { key: "column-menu", label: text.value.featureColumns },
    { key: "table-footers", label: text.value.featureFooters },
    { key: "selection-contract", label: text.value.featureSelection },
    { key: "composition", label: text.value.featureComposition },
    { key: "feature-union", label: text.value.featureUnion },
  ].flatMap((item) => {
    const page = VUE_NATIVE_PAGES.find(
      (page) => page.path === `unstyled/${item.key}`
    );
    return page
      ? [{ ...item, href: `../${page.path.slice("unstyled/".length)}/` }]
      : [];
  })
);
const activeKeys = computed(
  () =>
    ({
      orders: [
        "filter-editing",
        "hierarchy",
        "actions",
        "assistant",
        "view-controls",
      ],
      dispatch: ["hierarchy", "specialized", "rows", "navigation"],
      revenue: [
        "hierarchy",
        "specialized",
        "column-menu",
        "table-footers",
        "actions",
      ],
    })[props.view]
);
const active = computed(() =>
  catalog.value.filter((item) => activeKeys.value.includes(item.key))
);
const found = computed(() =>
  catalog.value.filter((item) =>
    `${item.label} ${item.key}`
      .toLocaleLowerCase(props.locale)
      .includes(search.value.trim().toLocaleLowerCase(props.locale))
  )
);
const explanation = computed(
  () =>
    ({
      orders: text.value.orderImplementation,
      dispatch: text.value.dispatchImplementation,
      revenue: text.value.revenueImplementation,
    })[props.view]
);
const feature = computed(
  () =>
    ({ orders: "filtering", dispatch: "row-reordering", revenue: "pivot" })[
      props.view
    ]
);
const references = computed(() =>
  [
    {
      label: "React · Tailwind",
      href: siteUrl(demoRoute(`tailwind/${feature.value}`, "react")),
    },
    {
      label: "React · Mantine",
      href: siteUrl(demoRoute(`mantine/${feature.value}`, "react")),
    },
    {
      label: "Angular · Unstyled",
      href: siteUrl(demoRoute(`unstyled/${feature.value}`, "angular")),
    },
    {
      label: "Angular · Material",
      href: siteUrl(demoRoute(`material/${feature.value}`, "angular")),
    },
  ].filter((item) =>
    SHOWCASE_PAGES.some((page) => siteUrl(page.route) === item.href)
  )
);
const snippet = computed(
  () =>
    ({
      orders:
        'import { h } from "vue";\nimport OrderLines from "./OrderLines.vue";\nimport type { Order } from "./data";\nimport { nestedTable } from "@adapttable/vue-unstyled/nested-table";\n\nconst details = nestedTable<Order>((order) => ({\n  label: `Line items · ${order.id}`,\n  table: () => h(OrderLines, { order, locale: "en" }),\n}));',
      dispatch:
        'import { tree } from "@adapttable/vue-unstyled/tree";\nimport { rowReorder } from "@adapttable/vue-unstyled/row-reorder";\n\nconst hierarchy = tree({ getChildren: run => run.children });\nconst moves = rowReorder((from, to, order) => {\n  // The host updates the plan of stable order IDs.\n  move(from, to, order);\n});',
      revenue:
        'import { buildFormulaColumns } from "@adapttable/vue-unstyled/formula";\nimport { usePivotUrlState } from "@adapttable/vue-unstyled/pivot";\n\nconst formula = buildFormulaColumns([{\n  key: "profit", header: "Gross profit", formula: "amount-cost",\n}]);\nconst pivot = usePivotUrlState({ urlKey: "workspace-pivot" });',
    })[props.view]
);
</script>
<template>
  <aside class="workspace-discovery" :aria-label="text.discovery">
    <div class="workspace-discovery__rail">
      <strong>{{ text.discovery }}</strong>
      <nav :aria-label="text.featureExamples">
        <a
          v-for="item in active"
          :key="item.key"
          :href="item.href"
          target="_blank"
          rel="noreferrer"
          >{{ item.label }}</a
        >
      </nav>
    </div>
    <details class="workspace-implementation">
      <summary>{{ text.implementation }}</summary>
      <div class="workspace-implementation__body">
        <section>
          <p>{{ explanation }}</p>
          <h3>{{ text.sourceExample }}</h3>
          <pre><code>{{ snippet }}</code></pre>
          <a
            :href="docsUrl('features', 'vue')"
            target="_blank"
            rel="noreferrer"
            >{{ text.viewReference }}</a
          >
          ·
          <a
            href="https://github.com/orwa-mahmoud/adapttable/tree/main/packages/vue/adapter-vue-unstyled"
            target="_blank"
            rel="noreferrer"
            >{{ text.source }}</a
          >
        </section>
        <section>
          <label
            >{{ text.featureFinder }}<input v-model="search" type="search"
          /></label>
          <nav :aria-label="text.featureExamples">
            <a
              v-for="item in found"
              :key="item.key"
              :href="item.href"
              target="_blank"
              rel="noreferrer"
              >{{ item.label }}</a
            >
          </nav>
          <h3>{{ text.compare }}</h3>
          <p>{{ text.compareNote }}</p>
          <nav :aria-label="text.compare">
            <a
              v-for="item in references"
              :key="item.label"
              :href="item.href"
              target="_blank"
              rel="noreferrer"
              >{{ item.label }}</a
            >
          </nav>
        </section>
      </div>
    </details>
  </aside>
</template>
