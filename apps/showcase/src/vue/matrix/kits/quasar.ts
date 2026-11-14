/** The real Quasar kit used by every Vue page that boots it. */
import "@adapttable/quasar/styles.css";

import { agentApproval, TableAssistant } from "@adapttable/quasar/assistant";
import { bulkActions } from "@adapttable/quasar/bulk-actions";
import { cellNavigation } from "@adapttable/quasar/cell-navigation";
import { cellSpan } from "@adapttable/quasar/cell-span";
import { collapsibleColumnGroups } from "@adapttable/quasar/column-groups";
import { columnMenu } from "@adapttable/quasar/column-menu";
import { columnSelectionCheckbox } from "@adapttable/quasar/column-selection";
import { densityChooser } from "@adapttable/quasar/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/quasar/editing";
import { exportCsv } from "@adapttable/quasar/export";
import { extraRows } from "@adapttable/quasar/extra-rows";
import { filters } from "@adapttable/quasar/filters";
import { fullscreen } from "@adapttable/quasar/fullscreen";
import { groupingPanel } from "@adapttable/quasar/grouping-panel";
import { headerFilters } from "@adapttable/quasar/header-filters";
import { nestedTable } from "@adapttable/quasar/nested-table";
import { pinnedSummaryRows } from "@adapttable/quasar/pinned-summary-rows";
import { PivotPanel } from "@adapttable/quasar/pivot";
import { print } from "@adapttable/quasar/print";
import { resizableColumns } from "@adapttable/quasar/resizable-columns";
import { rowActions } from "@adapttable/quasar/row-actions";
import { rowPinning } from "@adapttable/quasar/row-pinning";
import { rowReorder } from "@adapttable/quasar/row-reorder";
import { savedViews } from "@adapttable/quasar/saved-views";
import { statusBar } from "@adapttable/quasar/status-bar";
import { tree } from "@adapttable/quasar/tree";
import { virtualize } from "@adapttable/quasar/virtualize";
import {
  Dark,
  QAvatar,
  QBadge,
  QBtn,
  QInput,
  QLinearProgress,
  QSelect,
  Quasar,
} from "quasar";
import quasarStyles from "quasar/dist/quasar.rtl.css?inline";
import ar from "quasar/lang/ar";
import en from "quasar/lang/en-US";
import { h } from "vue";

import { registerKitStyles } from "../kitStyles";
import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/QuasarDataTable.vue";

registerKitStyles("quasar", quasarStyles);

const BADGE_COLOR = {
  success: "positive",
  error: "negative",
  info: "info",
  neutral: "grey-7",
} as const;

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "quasar",
  input: ({ label, part, value, type, disabled, onChange }) =>
    h(QInput, {
      "aria-label": label,
      "data-adapttable-part": part,
      modelValue: value,
      type: type ?? "text",
      disable: disabled,
      autocomplete: "off",
      outlined: true,
      dense: true,
      "onUpdate:modelValue": (next: string | number | null) =>
        onChange(String(next ?? "")),
    }),
  install: (app, appearance) => {
    app.use(Quasar, {
      config: { dark: appearance.dark },
      lang: appearance.dir === "rtl" ? ar : en,
    });
  },
  setDark: (dark) => {
    Dark.set(dark);
  },
  avatar: (initials) =>
    h(
      QAvatar,
      {
        size: "40px",
        color: "primary",
        textColor: "white",
        "aria-hidden": "true",
      },
      () => initials
    ),
  progress: (value, label) =>
    h(QLinearProgress, {
      value: value / 100,
      rounded: true,
      size: "6px",
      "aria-label": label,
    }),
  status: (tone, label) =>
    h(QBadge, {
      color: BADGE_COLOR[tone],
      textColor: tone === "info" ? "black" : "white",
      rounded: true,
      label,
    }),
  button: ({ label, part, disabled, onClick }) =>
    h(QBtn, {
      "data-adapttable-part": part,
      label,
      disable: disabled,
      outline: true,
      noCaps: true,
      onClick,
    }),
  select: ({ label, part, value, options, disabled, onChange }) =>
    h(QSelect, {
      "aria-label": label,
      "data-adapttable-part": part,
      modelValue: value,
      disable: disabled,
      options: options.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      emitValue: true,
      mapOptions: true,
      dropdownIcon: "M7 10l5 5 5-5z",
      dense: true,
      outlined: true,
      style: { minWidth: "10rem" },
      "onUpdate:modelValue": (next: unknown) => {
        if (typeof next === "string") onChange(next);
      },
    }),
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
  rowEditing,
  undoRedoButtons,
  exportCsv,
  filters,
  fullscreen,
  groupingPanel,
  print,
  extraRows,
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
