// Command palette, context menu and side panel share these surface styles;
// importing them once here keeps them in styles.css without a shared chunk.
import "./actions/nuxtWorkspace.css";

export { default as DataTable } from "./DataTable.vue";
export type {
  DataTableClassNames,
  DataTableProps,
  DataTableSlots,
} from "@adapttable/vue/adapter";
