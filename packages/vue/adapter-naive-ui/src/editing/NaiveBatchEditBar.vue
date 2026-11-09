<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { naiveEditingButton } from "./naiveEditingButton";
defineOptions({ name: "NaiveBatchEditBar" });
const { contested = undefined, ...props } =
  defineProps<BatchEditBarProps<TRow>>();
const names = useDataTableClassNames();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    contested,
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
