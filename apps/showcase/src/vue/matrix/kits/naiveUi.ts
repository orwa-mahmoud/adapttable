/** The real Naive UI kit used by every Vue page that boots it. */
import { agentApproval, TableAssistant } from "@adapttable/naive-ui/assistant";
import { bulkActions } from "@adapttable/naive-ui/bulk-actions";
import { cellNavigation } from "@adapttable/naive-ui/cell-navigation";
import { cellSpan } from "@adapttable/naive-ui/cell-span";
import { collapsibleColumnGroups } from "@adapttable/naive-ui/column-groups";
import { columnMenu } from "@adapttable/naive-ui/column-menu";
import { columnSelectionCheckbox } from "@adapttable/naive-ui/column-selection";
import { densityChooser } from "@adapttable/naive-ui/density";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/naive-ui/editing";
import { exportCsv } from "@adapttable/naive-ui/export";
import { filters } from "@adapttable/naive-ui/filters";
import { fullscreen } from "@adapttable/naive-ui/fullscreen";
import { groupingPanel } from "@adapttable/naive-ui/grouping-panel";
import { headerFilters } from "@adapttable/naive-ui/header-filters";
import { nestedTable } from "@adapttable/naive-ui/nested-table";
import { pinnedSummaryRows } from "@adapttable/naive-ui/pinned-summary-rows";
import { PivotPanel } from "@adapttable/naive-ui/pivot";
import { resizableColumns } from "@adapttable/naive-ui/resizable-columns";
import { rowActions } from "@adapttable/naive-ui/row-actions";
import { rowPinning } from "@adapttable/naive-ui/row-pinning";
import { rowReorder } from "@adapttable/naive-ui/row-reorder";
import { savedViews } from "@adapttable/naive-ui/saved-views";
import { statusBar } from "@adapttable/naive-ui/status-bar";
import { tree } from "@adapttable/naive-ui/tree";
import { virtualize } from "@adapttable/naive-ui/virtualize";
import {
  arDZ,
  darkTheme,
  enUS,
  NButton,
  NConfigProvider,
  NSelect,
  NTag,
} from "naive-ui";
import { defineComponent, h, shallowRef, useId } from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/NaiveUiDataTable.vue";

const TAG_TYPE = {
  success: "success",
  error: "error",
  info: "info",
  neutral: "default",
} as const;

/** Naive UI's theme and locale come from its config provider. */
const Root = defineComponent(
  (props: { dark: boolean; dir: "ltr" | "rtl" }, { slots }) =>
    () =>
      h(
        NConfigProvider,
        {
          theme: props.dark ? darkTheme : null,
          locale: props.dir === "rtl" ? arDZ : enUS,
        },
        { default: () => slots.default?.() }
      ),
  { name: "NaiveUiShowcaseRoot", props: ["dark", "dir"] }
);

/** Native selector semantics live on its actual input, menu and option nodes. */
const Select = defineComponent(
  (props: Parameters<ShowcaseKit["select"]>[0]) => {
    const open = shallowRef(false);
    const listId = useId();
    return () =>
      h(NSelect, {
        "data-adapttable-part": props.part,
        value: props.value,
        disabled: props.disabled,
        filterable: true,
        inputProps: {
          role: "combobox",
          "aria-label": props.label,
          "aria-autocomplete": "list",
          "aria-expanded": open.value,
          "aria-controls": listId,
        },
        menuProps: { id: listId, role: "listbox", "aria-label": props.label },
        nodeProps: (option) => ({
          role: "option",
          "aria-selected": option.value === props.value,
        }),
        options: props.options.map((option) => ({
          label: option.label,
          value: option.value,
        })),
        style: { width: "10rem" },
        "onUpdate:show": (next: boolean) => {
          open.value = next;
        },
        "onUpdate:value": (next: unknown) => {
          if (typeof next === "string") props.onChange(next);
        },
      });
  },
  {
    name: "NaiveUiShowcaseSelect",
    props: ["label", "part", "value", "options", "disabled", "onChange"],
  }
);

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "naive-ui",
  Root,
  status: (tone, label) =>
    h(
      NTag,
      { type: TAG_TYPE[tone], size: "small", round: true, bordered: false },
      () => label
    ),
  button: ({ label, part, disabled, onClick }) =>
    h(
      NButton,
      { "data-adapttable-part": part, disabled, onClick },
      () => label
    ),
  select: (props) => h(Select, props),
  DataTable,
  PivotPanel,
  TableAssistant,
  agentApproval,
  bulkActions,
  cellNavigation,
  cellSpan,
  collapsibleColumnGroups,
  columnMenu,
  columnSelectionCheckbox,
  densityChooser,
  editHistory,
  editing,
  undoRedoButtons,
  exportCsv,
  filters,
  fullscreen,
  groupingPanel,
  headerFilters,
  nestedTable,
  pinnedSummaryRows,
  resizableColumns,
  rowActions,
  rowPinning,
  rowReorder,
  savedViews,
  statusBar,
  tree,
  virtualize,
};
