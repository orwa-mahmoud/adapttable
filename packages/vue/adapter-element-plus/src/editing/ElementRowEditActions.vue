<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
} from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { elementEditingButton } from "./elementEditingButton";
defineOptions({ name: "ElementRowEditActions" });
const { showBegin = undefined, ...props } =
  defineProps<RowEditActionsProps<TRow>>();
const names = useClassNames();
const Render = () =>
  RowEditActionsChrome({
    ...props,
    showBegin,
    className: [props.className, names.value.rowEditActions]
      .filter(Boolean)
      .join(" "),
    controls: {
      Button: (control) =>
        elementEditingButton(control, names.value.rowEditButton),
    },
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
