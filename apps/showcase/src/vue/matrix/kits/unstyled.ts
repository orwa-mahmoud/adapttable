/** The native Vue kit: native elements the page styles through part names. */
import "@adapttable/vue-unstyled/styles.css";

import {
  agentApproval,
  TableAssistant,
} from "@adapttable/vue-unstyled/assistant";
import { bulkActions } from "@adapttable/vue-unstyled/bulk-actions";
import { cellNavigation } from "@adapttable/vue-unstyled/cell-navigation";
import { cellSpan } from "@adapttable/vue-unstyled/cell-span";
import { collapsibleColumnGroups } from "@adapttable/vue-unstyled/column-groups";
import { columnMenu } from "@adapttable/vue-unstyled/column-menu";
import { columnSelectionCheckbox } from "@adapttable/vue-unstyled/column-selection";
import { densityChooser } from "@adapttable/vue-unstyled/density";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/vue-unstyled/editing";
import { exportCsv } from "@adapttable/vue-unstyled/export";
import { filters } from "@adapttable/vue-unstyled/filters";
import { fullscreen } from "@adapttable/vue-unstyled/fullscreen";
import { groupingPanel } from "@adapttable/vue-unstyled/grouping-panel";
import { headerFilters } from "@adapttable/vue-unstyled/header-filters";
import { nestedTable } from "@adapttable/vue-unstyled/nested-table";
import { pinnedSummaryRows } from "@adapttable/vue-unstyled/pinned-summary-rows";
import { PivotPanel } from "@adapttable/vue-unstyled/pivot";
import { resizableColumns } from "@adapttable/vue-unstyled/resizable-columns";
import { rowActions } from "@adapttable/vue-unstyled/row-actions";
import { rowPinning } from "@adapttable/vue-unstyled/row-pinning";
import { rowReorder } from "@adapttable/vue-unstyled/row-reorder";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";
import { statusBar } from "@adapttable/vue-unstyled/status-bar";
import { tree } from "@adapttable/vue-unstyled/tree";
import { virtualize } from "@adapttable/vue-unstyled/virtualize";
import { h } from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/UnstyledDataTable.vue";

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "vue-unstyled",
  status: (tone, label) =>
    h("span", { class: "mx-status", "data-status-tone": tone }, label),
  button: ({ label, part, disabled, onClick }) =>
    h(
      "button",
      { type: "button", "data-adapttable-part": part, disabled, onClick },
      label
    ),
  select: ({ label, part, value, options, disabled, onChange }) =>
    h(
      "select",
      {
        "aria-label": label,
        "data-adapttable-part": part,
        value,
        disabled,
        onChange: (event: Event) => {
          if (event.target instanceof HTMLSelectElement)
            onChange(event.target.value);
        },
      },
      options.map((option) =>
        h("option", { key: option.value, value: option.value }, option.label)
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
