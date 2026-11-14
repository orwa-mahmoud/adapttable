<script setup lang="ts">
/**
 * Grouping: the panel and its drag or select controls, nested groups with
 * footers and budget subtotals, the column menu, and the grouped sheet
 * exported as a spreadsheet.
 */
import { shallowRef } from "vue";

import {
  GROUPED_XLSX_EXPORT,
  PEOPLE_GROUP_BY,
} from "../../../shared/groupingScenario";
import {
  PEOPLE,
  PEOPLE_GROUPING,
  peopleColumns,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
// The toggle forces the phone's selects on a desktop; off, it leaves the
// breakpoint alone rather than forcing a desktop table onto a phone.
const mobile = shallowRef(false);
const features = [
  kit.groupingPanel([...PEOPLE_GROUP_BY], PEOPLE_GROUPING),
  kit.columnMenu(),
  kit.exportCsv(GROUPED_XLSX_EXPORT),
];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <div class="seg" role="group" aria-label="Grouping controls">
        <button
          type="button"
          :class="['seg__btn', { 'is-on': !mobile }]"
          :aria-pressed="!mobile"
          data-demo-control="grouping-desktop"
          @click="mobile = false"
        >
          Drag + keyboard
        </button>
        <button
          type="button"
          :class="['seg__btn', { 'is-on': mobile }]"
          :aria-pressed="mobile"
          data-demo-control="grouping-mobile"
          @click="mobile = true"
        >
          Mobile selects
        </button>
      </div>
      <span class="hint">Drag a column header into the grouping strip</span>
      <span class="hint">Focus a chip handle; arrow keys change its level</span>
    </div>
    <div class="mx-demo__body">
      <div :class="{ 'phone-frame': mobile }">
        <component
          :is="kit.DataTable"
          v-bind="TABLE_PRESENTATION"
          table-label="People"
          url-key="grp"
          :data="PEOPLE"
          :columns="columns"
          :row-key="rowKey"
          :force-mobile="mobile || undefined"
          :features="features"
        />
      </div>
    </div>
  </div>
</template>
