<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
} from "@adapttable/vue/adapter";

import { useRekaClasses } from "../context";
import { rekaEditingButton } from "./button";

const { showBegin = undefined, ...props } =
  defineProps<RowEditActionsProps<TRow>>();
const names = useRekaClasses();
const Render = () =>
  RowEditActionsChrome({
    ...props,
    showBegin,
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
