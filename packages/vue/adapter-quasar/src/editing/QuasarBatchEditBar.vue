<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { quasarEditingButton } from "./quasarEditingButton";
const props = withDefaults(
  defineProps<{
    readonly batch: BatchEditBarProps<TRow>["batch"];
    readonly contested?: Exclude<
      BatchEditBarProps<TRow>["contested"],
      undefined
    >;
    readonly labels?: Exclude<BatchEditBarProps<TRow>["labels"], undefined>;
    readonly className?: Exclude<
      BatchEditBarProps<TRow>["className"],
      undefined
    >;
    readonly buttonClassName?: Exclude<
      BatchEditBarProps<TRow>["buttonClassName"],
      undefined
    >;
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
        quasarEditingButton(control, names.value.batchEditButton),
    },
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
