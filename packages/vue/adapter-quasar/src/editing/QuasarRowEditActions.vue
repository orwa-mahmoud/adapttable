<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { quasarEditingButton } from "./quasarEditingButton";
const props = withDefaults(defineProps<RowEditActionsProps<TRow>>(), {
  showBegin: undefined,
});
const names = useDataTableClassNames();
const Render = () =>
  RowEditActionsChrome({
    ...props,
    className: [props.className, names.value.rowEditActions]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        quasarEditingButton(control, names.value.rowEditButton),
    },
  });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
