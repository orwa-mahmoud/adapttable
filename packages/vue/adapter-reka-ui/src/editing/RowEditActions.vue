<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
} from "@adapttable/vue/adapter";

import { useRekaClasses } from "../context";
import { rekaEditingButton } from "./button";

const props = withDefaults(defineProps<RowEditActionsProps<TRow>>(), {
  showBegin: undefined,
});
const names = useRekaClasses();
const Render = () =>
  RowEditActionsChrome({
    ...props,
    className: [props.className, names.value.rowEditActions]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        rekaEditingButton(control, names.value.rowEditButton),
    },
  });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
