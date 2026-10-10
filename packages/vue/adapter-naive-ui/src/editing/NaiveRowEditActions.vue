<script setup lang="ts" generic="TRow">
import {
  RowEditActionsChrome,
  type RowEditActionsProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";

import { naiveEditingButton } from "./naiveEditingButton";
defineOptions({ name: "NaiveRowEditActions" });
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
        naiveEditingButton(control, names.value.rowEditButton),
    },
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
