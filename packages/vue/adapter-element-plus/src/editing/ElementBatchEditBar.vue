<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { elementEditingButton } from "./elementEditingButton";
defineOptions({ name: "ElementBatchEditBar" });
const { contested = undefined, ...props } =
  defineProps<BatchEditBarProps<TRow>>();
const names = useClassNames();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    contested,
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
