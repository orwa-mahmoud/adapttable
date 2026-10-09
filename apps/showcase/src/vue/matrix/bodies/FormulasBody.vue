<script setup lang="ts">
/** Formula input, visible errors and shareable columns, from FormulasDemo.tsx. */
import {
  buildFormulaColumns,
  useFormulaUrlState,
} from "@adapttable/vue/formula";
import { computed, shallowRef } from "vue";

import { budget, utilization } from "../../../people";
import {
  PEOPLE,
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const rows = PEOPLE.map((row) => ({
  ...row,
  budget: budget(row),
  utilization: utilization(row),
}));
const name = shallowRef("");
const formula = shallowRef("");
const state = useFormulaUrlState({
  urlKey: "fx",
  defaultFormulas: [
    { key: "margin", header: "Margin", formula: "=ROUND(budget * 0.15, 0)" },
    { key: "tag", header: "Tag", formula: '=UPPER(team) & " · " & role' },
  ],
});
const derived = computed(() =>
  buildFormulaColumns<Person>(state.formulas.value)
);
const columns = computed(() => [
  ...peopleColumns({ status: kit.status }).filter((column) =>
    ["person", "team", "budget"].includes(column.key)
  ),
  ...derived.value.columns,
]);
const errors = computed(() => Object.entries(derived.value.errors));

/** Build one new column through the binding; evaluation stays in core. */
function add(): void {
  const text = formula.value.trim();
  if (!text) return;
  const header = name.value.trim();
  const stem = header.replaceAll(/\W/g, "") || "formula";
  let key = stem;
  let suffix = 1;
  while (columns.value.some((column) => column.key === key))
    key = `${stem}${String(++suffix)}`;
  state.onFormulasChange([
    ...state.formulas.value,
    { key, header: header || key, formula: text },
  ]);
  name.value = "";
  formula.value = "";
}

/** Removing a formula also removes it from a copied or reloaded URL. */
function remove(key: string): void {
  state.onFormulasChange(
    state.formulas.value.filter((current) => current.key !== key)
  );
}
</script>

<template>
  <div class="mx-demo">
    <div class="fx" data-testid="formula-bar">
      <form class="fx__form" @submit.prevent="add">
        <label class="fx__field">
          <span>Column</span>
          <input v-model="name" data-testid="formula-name" />
        </label>
        <label class="fx__field fx__field--wide">
          <span>Formula</span>
          <input
            v-model="formula"
            placeholder="=ROUND(budget / 12, 0)"
            :spellcheck="false"
            data-testid="formula-text"
          />
        </label>
        <button type="submit" data-testid="formula-add">Add column</button>
      </form>
      <ul class="fx__chips" data-testid="formula-columns">
        <li v-for="spec in state.formulas.value" :key="spec.key">
          <code>{{ spec.header ?? spec.key }}: {{ spec.formula }}</code>
          <button
            type="button"
            :aria-label="`Remove ${spec.header ?? spec.key}`"
            @click="remove(spec.key)"
          >
            ×
          </button>
        </li>
      </ul>
      <div data-testid="formula-report" role="status">
        <p v-for="[key, message] in errors" :key="key">
          {{ key }}: {{ message }}
        </p>
        <p v-if="derived.cycles.length > 0">
          {{ derived.cycles.join(", ") }}: #CYCLE!
        </p>
      </div>
    </div>
    <div class="mx-demo__body">
      <component
        :is="kit.DataTable"
        v-bind="TABLE_PRESENTATION"
        table-label="Computed people"
        url-key="fx"
        :data="rows"
        :columns="columns"
        :row-key="rowKey"
        :defaults="{ limit: 10 }"
      />
    </div>
  </div>
</template>
