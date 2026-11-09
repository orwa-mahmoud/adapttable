<script setup lang="ts" generic="TRow">
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { vuetifyEditingButton } from "./actionButton";

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
        vuetifyEditingButton(control, names.value.batchEditButton),
    },
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
