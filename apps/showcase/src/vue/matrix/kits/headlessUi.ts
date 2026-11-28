/** The real Headless UI kit used by every Vue page that boots it. */
import "../../kits/headless-ui-theme.css";

import {
  agentApproval,
  TableAssistant,
} from "@adapttable/vue-headless-ui/assistant";
import { batchEditing } from "@adapttable/vue-headless-ui/batch-editing";
import { bulkActions } from "@adapttable/vue-headless-ui/bulk-actions";
import { cellNavigation } from "@adapttable/vue-headless-ui/cell-navigation";
import { cellSpan } from "@adapttable/vue-headless-ui/cell-span";
import { collapsibleColumnGroups } from "@adapttable/vue-headless-ui/column-groups";
import { columnMenu } from "@adapttable/vue-headless-ui/column-menu";
import { columnSelectionCheckbox } from "@adapttable/vue-headless-ui/column-selection";
import { commandPalette } from "@adapttable/vue-headless-ui/command-palette";
import { contextMenu } from "@adapttable/vue-headless-ui/context-menu";
import { densityChooser } from "@adapttable/vue-headless-ui/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/vue-headless-ui/editing";
import { exportCsv } from "@adapttable/vue-headless-ui/export";
import { extraRows } from "@adapttable/vue-headless-ui/extra-rows";
import { filters } from "@adapttable/vue-headless-ui/filters";
import { findInTable } from "@adapttable/vue-headless-ui/find-in-table";
import { fullscreen } from "@adapttable/vue-headless-ui/fullscreen";
import { groupingPanel } from "@adapttable/vue-headless-ui/grouping-panel";
import { headerFilters } from "@adapttable/vue-headless-ui/header-filters";
import { nestedTable } from "@adapttable/vue-headless-ui/nested-table";
import { pinnedSummaryRows } from "@adapttable/vue-headless-ui/pinned-summary-rows";
import { PivotPanel } from "@adapttable/vue-headless-ui/pivot";
import { print } from "@adapttable/vue-headless-ui/print";
import { resizableColumns } from "@adapttable/vue-headless-ui/resizable-columns";
import { rowActions } from "@adapttable/vue-headless-ui/row-actions";
import { rowPinning } from "@adapttable/vue-headless-ui/row-pinning";
import { rowReorder } from "@adapttable/vue-headless-ui/row-reorder";
import {
  savedViews,
  SavedViewsPanel,
} from "@adapttable/vue-headless-ui/saved-views";
import { selection } from "@adapttable/vue-headless-ui/selection";
import { selectionStats } from "@adapttable/vue-headless-ui/selection-stats";
import { statusBar } from "@adapttable/vue-headless-ui/status-bar";
import { tree } from "@adapttable/vue-headless-ui/tree";
import { virtualize } from "@adapttable/vue-headless-ui/virtualize";
import { RadioGroup, RadioGroupOption } from "@headlessui/vue";
import { h } from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/HeadlessUiDataTable.vue";

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "headless-ui",
  input: ({ label, part, value, type, disabled, onChange }) =>
    h("input", {
      "aria-label": label,
      "data-adapttable-part": part,
      class: "mx-kit-input",
      value,
      type: type ?? "text",
      disabled,
      autocomplete: "off",
      onInput: (event: Event) => {
        if (event.target instanceof HTMLInputElement)
          onChange(event.target.value);
      },
    }),
  avatar: (initials) =>
    h("span", { class: "demo-mobile-avatar", "aria-hidden": "true" }, initials),
  progress: (value, label) =>
    h(
      "div",
      {
        role: "progressbar",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": value,
        "aria-label": label,
        class: "demo-mobile-progress",
      },
      h("div", { style: { width: `${value}%`, height: "100%" } })
    ),
  status: (tone, label) =>
    h("span", { class: "mx-status", "data-status-tone": tone }, label),
  button: ({ label, part, disabled, onClick }) =>
    h(
      "button",
      {
        type: "button",
        class: "mx-kit-button",
        "data-adapttable-part": part,
        disabled,
        onClick,
      },
      label
    ),
  select: ({ label, part, value, options, disabled, onChange }) =>
    h(
      RadioGroup,
      {
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
            RadioGroupOption,
            { key: option.value, value: option.value, as: "button" },
            () => option.label
          )
        )
    ),
  DataTable,
  PivotPanel,
  SavedViewsPanel,
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
  batchEditing,
  rowEditing,
  undoRedoButtons,
  exportCsv,
  filters,
  fullscreen,
  groupingPanel,
  print,
  extraRows,
  findInTable,
  selection,
  selectionStats,
  commandPalette,
  contextMenu,
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
