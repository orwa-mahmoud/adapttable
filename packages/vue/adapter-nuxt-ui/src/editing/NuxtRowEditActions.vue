<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { nuxtEditingButton } from "./nuxtEditingButton";
const { showBegin = undefined, ...props } =
  defineProps<RowEditActionsProps<TRow>>();
const names = useDataTableClassNames();
const Render = () =>
  RowEditActionsChrome({
    ...props,
    showBegin,
    className: [props.className, names.value.rowEditActions]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        nuxtEditingButton(control, names.value.rowEditButton),
    },
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
