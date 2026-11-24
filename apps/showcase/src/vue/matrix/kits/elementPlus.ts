/** The real Element Plus kit used by every Vue page that boots it. */
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css";

import {
  agentApproval,
  TableAssistant,
} from "@adapttable/element-plus/assistant";
import { batchEditing } from "@adapttable/element-plus/batch-editing";
import { bulkActions } from "@adapttable/element-plus/bulk-actions";
import { cellNavigation } from "@adapttable/element-plus/cell-navigation";
import { cellSpan } from "@adapttable/element-plus/cell-span";
import { collapsibleColumnGroups } from "@adapttable/element-plus/column-groups";
import { columnMenu } from "@adapttable/element-plus/column-menu";
import { columnSelectionCheckbox } from "@adapttable/element-plus/column-selection";
import { commandPalette } from "@adapttable/element-plus/command-palette";
import { contextMenu } from "@adapttable/element-plus/context-menu";
import { densityChooser } from "@adapttable/element-plus/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/element-plus/editing";
import { exportCsv } from "@adapttable/element-plus/export";
import { extraRows } from "@adapttable/element-plus/extra-rows";
import { filters } from "@adapttable/element-plus/filters";
import { findInTable } from "@adapttable/element-plus/find-in-table";
import { fullscreen } from "@adapttable/element-plus/fullscreen";
import { groupingPanel } from "@adapttable/element-plus/grouping-panel";
import { headerFilters } from "@adapttable/element-plus/header-filters";
import { nestedTable } from "@adapttable/element-plus/nested-table";
import { pinnedSummaryRows } from "@adapttable/element-plus/pinned-summary-rows";
import { PivotPanel } from "@adapttable/element-plus/pivot";
import { print } from "@adapttable/element-plus/print";
import { resizableColumns } from "@adapttable/element-plus/resizable-columns";
import { rowActions } from "@adapttable/element-plus/row-actions";
import { rowPinning } from "@adapttable/element-plus/row-pinning";
import { rowReorder } from "@adapttable/element-plus/row-reorder";
import {
  savedViews,
  SavedViewsPanel,
} from "@adapttable/element-plus/saved-views";
import { selection } from "@adapttable/element-plus/selection";
import { selectionStats } from "@adapttable/element-plus/selection-stats";
import { statusBar } from "@adapttable/element-plus/status-bar";
import { tree } from "@adapttable/element-plus/tree";
import { virtualize } from "@adapttable/element-plus/virtualize";
import {
  ElAvatar,
  ElButton,
  ElConfigProvider,
  ElInput,
  ElOption,
  ElProgress,
  ElSelect,
  ElTag,
} from "element-plus";
import ar from "element-plus/es/locale/lang/ar.mjs";
import en from "element-plus/es/locale/lang/en.mjs";
import { defineComponent, h } from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/ElementPlusDataTable.vue";

const TAG_TYPE = {
  success: "success",
  error: "danger",
  info: "primary",
  neutral: "info",
} as const;

/** Element Plus's own locale, matched to the page's language. */
const Root = defineComponent(
  (props: { dark: boolean; dir: "ltr" | "rtl" }, { slots }) =>
    () =>
      h(
        ElConfigProvider,
        { locale: props.dir === "rtl" ? ar : en },
        { default: () => slots.default?.() }
      ),
  { name: "ElementPlusShowcaseRoot", props: ["dark", "dir"] }
);

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "element-plus",
  input: ({ label, part, value, type, disabled, onChange }) =>
    h(ElInput, {
      "aria-label": label,
      "data-adapttable-part": part,
      modelValue: value,
      type,
      disabled,
      autocomplete: "off",
      "onUpdate:modelValue": onChange,
    }),
  Root,
  avatar: (initials) =>
    h(
      ElAvatar,
      {
        size: 40,
        "aria-hidden": "true",
        style: {
          color: "inherit",
          backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
        },
      },
      () => initials
    ),
  progress: (value, label) =>
    h(ElProgress, {
      percentage: value,
      showText: false,
      strokeWidth: 6,
      "aria-label": label,
    }),
  status: (tone, label) =>
    h(
      ElTag,
      {
        type: TAG_TYPE[tone],
        size: "small",
        effect: "light",
        style: { "--el-tag-text-color": "var(--el-text-color-regular)" },
      },
      () => label
    ),
  button: ({ label, part, disabled, onClick }) =>
    h(
      ElButton,
      { "data-adapttable-part": part, disabled, onClick },
      () => label
    ),
  select: ({ label, part, value, options, disabled, onChange }) =>
    h(
      ElSelect,
      {
        "aria-label": label,
        "data-adapttable-part": part,
        modelValue: value,
        disabled,
        style: { width: "10rem" },
        "onUpdate:modelValue": (next: unknown) => {
          if (typeof next === "string") onChange(next);
        },
      },
      () =>
        options.map((option) =>
          h(ElOption, {
            key: option.value,
            value: option.value,
            label: option.label,
          })
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
