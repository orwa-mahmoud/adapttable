<script setup lang="ts">
import {
  createTableAgentController,
  type TableAgentControllerOptions,
} from "@adapttable/ai";
import type { TableRuntimeView } from "@adapttable/vue";
import { nextTick, onScopeDispose, watch } from "vue";
const props = defineProps<{
  options: TableAgentControllerOptions;
  view: TableRuntimeView;
  asyncAdmission?: boolean;
}>();
let reconciled = props.view;
const reconcile = () => {
  reconciled = props.view;
};
watch(() => props.view, reconcile, { flush: "sync" });
const controller = createTableAgentController({
  options: {
    get current() {
      return props.options;
    },
  },
  runtime: {
    current: {
      rowAt: (index) => reconciled.rows[index],
      labels: () => undefined,
      featureIds: () => [],
      view: () => reconciled,
    },
  },
  flushAdmission: () =>
    props.asyncAdmission ? nextTick(reconcile) : reconcile(),
  flush: (run) => {
    run();
    reconcile();
  },
});
onScopeDispose(controller.disconnect);
defineExpose({ controller, reconcile, current: () => props.view });
</script>
<template>
  <table>
    <tbody>
      <tr v-for="row in view.rows" :key="view.getRowId(row)">
        <td>{{ view.rowLabel(row) }}</td>
      </tr>
    </tbody>
  </table>
</template>
