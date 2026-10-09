/** The real Vuetify kit used by every Vue page that boots it. */
import "vuetify/styles";

import { agentApproval, TableAssistant } from "@adapttable/vuetify/assistant";
import { bulkActions } from "@adapttable/vuetify/bulk-actions";
import { cellNavigation } from "@adapttable/vuetify/cell-navigation";
import { cellSpan } from "@adapttable/vuetify/cell-span";
import { collapsibleColumnGroups } from "@adapttable/vuetify/column-groups";
import { columnMenu } from "@adapttable/vuetify/column-menu";
import { columnSelectionCheckbox } from "@adapttable/vuetify/column-selection";
import { densityChooser } from "@adapttable/vuetify/density";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/vuetify/editing";
import { exportCsv } from "@adapttable/vuetify/export";
import { filters } from "@adapttable/vuetify/filters";
import { fullscreen } from "@adapttable/vuetify/fullscreen";
import { groupingPanel } from "@adapttable/vuetify/grouping-panel";
import { headerFilters } from "@adapttable/vuetify/header-filters";
import { nestedTable } from "@adapttable/vuetify/nested-table";
import { pinnedSummaryRows } from "@adapttable/vuetify/pinned-summary-rows";
import { PivotPanel } from "@adapttable/vuetify/pivot";
import { resizableColumns } from "@adapttable/vuetify/resizable-columns";
import { rowActions } from "@adapttable/vuetify/row-actions";
import { rowPinning } from "@adapttable/vuetify/row-pinning";
import { rowReorder } from "@adapttable/vuetify/row-reorder";
import { savedViews } from "@adapttable/vuetify/saved-views";
import { statusBar } from "@adapttable/vuetify/status-bar";
import { tree } from "@adapttable/vuetify/tree";
import { virtualize } from "@adapttable/vuetify/virtualize";
import { defineComponent, h } from "vue";
import { VApp } from "vuetify/components/VApp";
import { VBtn } from "vuetify/components/VBtn";
import { VChip } from "vuetify/components/VChip";
import { VSelect } from "vuetify/components/VSelect";
import { createVuetify } from "vuetify/framework";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/VuetifyDataTable.vue";

const CHIP_COLOR = {
  success: "success",
  error: "error",
  info: "info",
  neutral: undefined,
} as const;

let vuetify: ReturnType<typeof createVuetify> | undefined;

/** Vuetify's app root carries its theme and layout. */
const Root = defineComponent(
  (props: { dark: boolean; dir: "ltr" | "rtl" }, { slots }) =>
    () =>
      h(
        VApp,
        { theme: props.dark ? "dark" : "light" },
        { default: () => slots.default?.() }
      ),
  { name: "VuetifyShowcaseRoot", props: ["dark", "dir"] }
);

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "vuetify",
  install: (app, appearance) => {
    vuetify = createVuetify({
      theme: { defaultTheme: appearance.dark ? "dark" : "light" },
      locale: { rtl: { ar: true } },
      icons: { defaultSet: "mdi", aliases, sets: { mdi } },
    });
    app.use(vuetify);
  },
  Root,
  setDark: (dark) => {
    void vuetify?.theme.change(dark ? "dark" : "light");
  },
  status: (tone, label) =>
    h(
      VChip,
      { color: CHIP_COLOR[tone], size: "small", variant: "tonal" },
      () => label
    ),
  button: ({ label, part, disabled, onClick }) =>
    h(
      VBtn,
      { "data-adapttable-part": part, disabled, variant: "tonal", onClick },
      () => label
    ),
  select: ({ label, part, value, options, disabled, onChange }) =>
    h(VSelect, {
      label,
      "data-adapttable-part": part,
      modelValue: value,
      disabled,
      items: options.map((option) => ({
        title: option.label,
        value: option.value,
      })),
      density: "compact",
      hideDetails: true,
      style: { maxWidth: "12rem" },
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
