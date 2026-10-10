/** The real shadcn-vue kit used by every Vue page that boots it. */
import "@adapttable/shadcn-vue/styles.css";
import "../../kits/shadcn-theme.css";

import {
  agentApproval,
  TableAssistant,
} from "@adapttable/shadcn-vue/assistant";
import { bulkActions } from "@adapttable/shadcn-vue/bulk-actions";
import { cellNavigation } from "@adapttable/shadcn-vue/cell-navigation";
import { cellSpan } from "@adapttable/shadcn-vue/cell-span";
import { collapsibleColumnGroups } from "@adapttable/shadcn-vue/column-groups";
import { columnMenu } from "@adapttable/shadcn-vue/column-menu";
import { columnSelectionCheckbox } from "@adapttable/shadcn-vue/column-selection";
import { densityChooser } from "@adapttable/shadcn-vue/density";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/shadcn-vue/editing";
import { exportCsv } from "@adapttable/shadcn-vue/export";
import { filters } from "@adapttable/shadcn-vue/filters";
import { fullscreen } from "@adapttable/shadcn-vue/fullscreen";
import { groupingPanel } from "@adapttable/shadcn-vue/grouping-panel";
import { headerFilters } from "@adapttable/shadcn-vue/header-filters";
import { nestedTable } from "@adapttable/shadcn-vue/nested-table";
import { pinnedSummaryRows } from "@adapttable/shadcn-vue/pinned-summary-rows";
import { PivotPanel } from "@adapttable/shadcn-vue/pivot";
import { resizableColumns } from "@adapttable/shadcn-vue/resizable-columns";
import { rowActions } from "@adapttable/shadcn-vue/row-actions";
import { rowPinning } from "@adapttable/shadcn-vue/row-pinning";
import { rowReorder } from "@adapttable/shadcn-vue/row-reorder";
import { savedViews } from "@adapttable/shadcn-vue/saved-views";
import { statusBar } from "@adapttable/shadcn-vue/status-bar";
import { tree } from "@adapttable/shadcn-vue/tree";
import { virtualize } from "@adapttable/shadcn-vue/virtualize";
import { Primitive, ToggleGroupItem, ToggleGroupRoot } from "reka-ui";
import { h } from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/ShadcnVueDataTable.vue";

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "shadcn-vue",
  status: (tone, label) =>
    h(
      Primitive,
      { as: "span", class: "mx-status", "data-status-tone": tone },
      () => label
    ),
  button: ({ label, part, disabled, onClick }) =>
    h(
      Primitive,
      {
        as: "button",
        type: "button",
        class: "mx-kit-button",
        "data-adapttable-part": part,
        disabled,
        onClick,
      },
      () => label
    ),
  select: ({ label, part, value, options, disabled, onChange }) =>
    h(
      ToggleGroupRoot,
      {
        type: "single",
        "aria-label": label,
        "data-adapttable-part": part,
        class: "mx-kit-choice",
        modelValue: value,
        disabled,
        "onUpdate:modelValue": (next: unknown) => {
          if (typeof next === "string" && next) onChange(next);
        },
      },
      () =>
        options.map((option) =>
          h(
            ToggleGroupItem,
            { key: option.value, value: option.value },
            () => option.label
          )
        )
    ),
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
