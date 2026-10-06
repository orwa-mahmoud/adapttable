<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
} from "@adapttable/vue/adapter";

import { useRekaClasses } from "../context";
import { rekaEditingButton } from "./button";

const props = withDefaults(defineProps<BatchEditBarProps<TRow>>(), {
  contested: undefined,
});
const names = useRekaClasses();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    className: [props.className, names.value.batchEditBar]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        rekaEditingButton(control, names.value.batchEditButton),
    },
  });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
