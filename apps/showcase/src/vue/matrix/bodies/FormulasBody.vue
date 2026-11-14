<script setup lang="ts">
/** Formula input, visible errors and shareable columns: the shared formulas page. */
import {
  buildFormulaColumns,
  useFormulaUrlState,
} from "@adapttable/vue/formula";
import { computed, shallowRef } from "vue";

import { pageLayoutFor, seedRoster } from "../../../casts";
import {
  cycleReport,
  FORMULA_EXAMPLES,
  FORMULA_START,
  FORMULAS_PARSE,
  NO_FORMULAS,
  withFormulas,
  withoutFormula,
  withTypedFormula,
} from "../../../shared/formulaScenario";
import {
  peopleColumns,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { pageChromeFeatures } from "../pageChrome";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const PAGE_LAYOUT = pageLayoutFor("formulas");
const features = pageChromeFeatures(kit, { urlKey: "fx" });
const rows = seedRoster("formulas", true);
const name = shallowRef("");
const formula = shallowRef("");
const state = useFormulaUrlState({
  urlKey: "fx",
  defaultFormulas: FORMULA_START,
});
const derived = computed(() =>
  buildFormulaColumns<Person>(state.formulas.value)
);
const columns = computed(() => [
  ...peopleColumns({ status: kit.status }),
  // Size derived fields alongside the base columns so an unsized formula
  // does not absorb all remaining table width and squeeze the other fields.
  ...derived.value.columns.map((column) => ({ ...column, width: 160 })),
]);
const errors = computed(() => Object.entries(derived.value.errors));
const cycle = computed(() => cycleReport(derived.value.cycles));

/** Apply a new list; one that changed nothing writes nothing. */
function change(next: (typeof state.formulas)["value"]): void {
  if (next !== state.formulas.value) state.onFormulasChange(next);
}

/** Add the typed formula through the binding; evaluation stays in core. */
function add(): void {
  if (formula.value.trim() === "") return;
  change(withTypedFormula(state.formulas.value, name.value, formula.value));
  name.value = "";
  formula.value = "";
}
</script>

<template>
  <div class="mx-demo">
    <div class="fx" data-testid="formula-bar">
      <form class="fx__form" @submit.prevent="add">
        <label class="fx__field">
          <span>Column</span>
          <input
            v-model="name"
            placeholder="Per month"
            data-testid="formula-name"
          />
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
      <div class="fx__examples">
        <button
          v-for="example in FORMULA_EXAMPLES"
          :key="example.label"
          type="button"
          :data-testid="`formula-example-${example.specs[0]?.key ?? ''}`"
          @click="change(withFormulas(state.formulas.value, example.specs))"
        >
          {{ example.label }}
        </button>
      </div>
      <ul class="fx__chips" data-testid="formula-columns">
        <li v-for="spec in state.formulas.value" :key="spec.key">
          <code>{{ spec.header ?? spec.key }}: {{ spec.formula }}</code>
          <button
            type="button"
            :aria-label="`Remove ${spec.header ?? spec.key}`"
            :data-testid="`formula-remove-${spec.key}`"
            @click="change(withoutFormula(state.formulas.value, spec.key))"
          >
            ×
          </button>
        </li>
        <li v-if="state.formulas.value.length === 0" class="fx__empty">
          {{ NO_FORMULAS }}
        </li>
      </ul>
      <div class="fx__report" data-testid="formula-report" role="status">
        <span v-if="errors.length === 0 && cycle === undefined" class="hint">
          {{ FORMULAS_PARSE }}
        </span>
        <span v-for="[key, message] in errors" :key="key" class="hint">
          {{ key }}: {{ message }}
        </span>
        <span v-if="cycle !== undefined" class="hint">{{ cycle }}</span>
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
        :default-column-layout="PAGE_LAYOUT"
        :features="features"
        :defaults="{ limit: 10 }"
      />
    </div>
  </div>
</template>
