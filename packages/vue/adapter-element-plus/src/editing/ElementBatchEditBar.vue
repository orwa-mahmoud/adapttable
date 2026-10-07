<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { elementEditingButton } from "./elementEditingButton";
defineOptions({ name: "ElementBatchEditBar" });
const props = withDefaults(defineProps<BatchEditBarProps<TRow>>(), {
  contested: undefined,
});
const names = useClassNames();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    className: [props.className, names.value.batchEditBar]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        elementEditingButton(control, names.value.batchEditButton),
    },
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
