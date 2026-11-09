<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { nuxtEditingButton } from "./nuxtEditingButton";
const {
  contested = undefined,
  labels = undefined,
  className = undefined,
  buttonClassName = undefined,
  ...props
} = defineProps<{
  batch: BatchEditBarProps<TRow>["batch"];
  contested?: Exclude<BatchEditBarProps<TRow>["contested"], undefined>;
  labels?: Exclude<BatchEditBarProps<TRow>["labels"], undefined>;
  className?: string;
  buttonClassName?: string;
}>();
const names = useDataTableClassNames();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    contested,
    labels,
    buttonClassName,
    className: [className, names.value.batchEditBar].filter(Boolean).join(" "),
    controls: {
      Button: (control) =>
        nuxtEditingButton(control, names.value.batchEditButton),
    },
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
