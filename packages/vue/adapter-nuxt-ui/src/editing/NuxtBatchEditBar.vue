<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { nuxtEditingButton } from "./nuxtEditingButton";
const props = withDefaults(
  defineProps<{
    batch: BatchEditBarProps<TRow>["batch"];
    contested?: Exclude<BatchEditBarProps<TRow>["contested"], undefined>;
    labels?: Exclude<BatchEditBarProps<TRow>["labels"], undefined>;
    className?: string;
    buttonClassName?: string;
  }>(),
  {
    contested: undefined,
    labels: undefined,
    className: undefined,
    buttonClassName: undefined,
  }
);
const names = useDataTableClassNames();
const Render = () =>
  BatchEditBarChrome({
    ...props,
    className: [props.className, names.value.batchEditBar]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        nuxtEditingButton(control, names.value.batchEditButton),
    },
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
