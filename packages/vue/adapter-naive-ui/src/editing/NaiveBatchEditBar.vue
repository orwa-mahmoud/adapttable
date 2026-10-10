<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { naiveEditingButton } from "./naiveEditingButton";
defineOptions({ name: "NaiveBatchEditBar" });
const props = withDefaults(defineProps<BatchEditBarProps<TRow>>(), {
  contested: undefined,
});
const names = useDataTableClassNames();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    className: [props.className, names.value.batchEditBar]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        naiveEditingButton(control, names.value.batchEditButton),
    },
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
