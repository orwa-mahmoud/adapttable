<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
} from "@adapttable/vue/editing";

import { useClassNames } from "../classNamesContext";
import { nativeEditingButton } from "./nativeEditingButton";
defineOptions({ name: "NativeRowEditActions" });
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
        nativeEditingButton(control, names.value.rowEditButton),
    },
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
