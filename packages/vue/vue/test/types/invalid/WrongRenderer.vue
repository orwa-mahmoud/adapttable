<script setup lang="ts">
import { type CellContext, componentRenderer } from "@adapttable/vue";
import { defineComponent, h } from "vue";
interface Person {
  id: string;
  score: number;
}
const NumberValue = defineComponent({
  props: { value: { type: Number, required: true } },
  setup: (props) => () => h("span", String(props.value)),
});
componentRenderer<CellContext<Person, number>, typeof NumberValue>(
  NumberValue,
  (context) => ({ value: context.value.toFixed(2) })
);
</script>
<template><div /></template>
