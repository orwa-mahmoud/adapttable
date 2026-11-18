<script setup lang="ts" generic="TRow">
import {
  FilterFieldChrome,
  type FilterFieldOptions,
  type FilterFieldPart,
  useFilterFieldWith,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { nativeFilterSlots } from "./nativeFilterSlots";
defineOptions({ name: "NativeBasicFilterField" });
const props = defineProps<
  FilterFieldOptions<TRow> & {
    /** The widget kinds this field can draw. */
    parts: readonly FilterFieldPart[];
  }
>();
const names = useClassNames();
const model = useFilterFieldWith(() => props, props.parts);
const controls = nativeFilterSlots(() => names.value);
const Render = () =>
  FilterFieldChrome({
    model: model.value,
    controls,
    classNames: names.value,
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
