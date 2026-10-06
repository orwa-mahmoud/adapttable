<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { vuetifyEditingButton } from "./actionButton";

const props = withDefaults(defineProps<RowEditActionsProps<TRow>>(), {
  showBegin: undefined,
});
const names = useClassNames();
const Render = () =>
  RowEditActionsChrome({
    ...props,
    className: [props.className, names.value.rowEditActions]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        vuetifyEditingButton(control, names.value.rowEditButton),
    },
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
