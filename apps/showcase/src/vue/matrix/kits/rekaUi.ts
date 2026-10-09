/** The real Reka UI kit used by every Vue page that boots it. */
import "../../kits/reka-theme.css";

import { agentApproval, TableAssistant } from "@adapttable/reka-ui/assistant";
import { bulkActions } from "@adapttable/reka-ui/bulk-actions";
import { cellNavigation } from "@adapttable/reka-ui/cell-navigation";
import { cellSpan } from "@adapttable/reka-ui/cell-span";
import { collapsibleColumnGroups } from "@adapttable/reka-ui/column-groups";
import { columnMenu } from "@adapttable/reka-ui/column-menu";
import { columnSelectionCheckbox } from "@adapttable/reka-ui/column-selection";
import { densityChooser } from "@adapttable/reka-ui/density";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/reka-ui/editing";
import { exportCsv } from "@adapttable/reka-ui/export";
import { filters } from "@adapttable/reka-ui/filters";
import { fullscreen } from "@adapttable/reka-ui/fullscreen";
import { groupingPanel } from "@adapttable/reka-ui/grouping-panel";
import { headerFilters } from "@adapttable/reka-ui/header-filters";
import { nestedTable } from "@adapttable/reka-ui/nested-table";
import { pinnedSummaryRows } from "@adapttable/reka-ui/pinned-summary-rows";
import { PivotPanel } from "@adapttable/reka-ui/pivot";
import { resizableColumns } from "@adapttable/reka-ui/resizable-columns";
import { rowActions } from "@adapttable/reka-ui/row-actions";
import { rowPinning } from "@adapttable/reka-ui/row-pinning";
import { rowReorder } from "@adapttable/reka-ui/row-reorder";
import { savedViews } from "@adapttable/reka-ui/saved-views";
import { statusBar } from "@adapttable/reka-ui/status-bar";
import { tree } from "@adapttable/reka-ui/tree";
import { virtualize } from "@adapttable/reka-ui/virtualize";
import { Primitive, ToggleGroupItem, ToggleGroupRoot } from "reka-ui";
import { h } from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/RekaUiDataTable.vue";

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "reka-ui",
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
