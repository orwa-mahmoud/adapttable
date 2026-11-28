<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
} from "@adapttable/vue/adapter";

import { useHeadlessClasses } from "../context";
import { headlessEditingButton } from "./button";

const { contested = undefined, ...props } =
  defineProps<BatchEditBarProps<TRow>>();
const names = useHeadlessClasses();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    contested,
    className: [props.className, names.value.batchEditBar]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        headlessEditingButton(control, names.value.batchEditButton),
    },
  });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
