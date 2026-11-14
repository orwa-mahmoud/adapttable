/** The real Nuxt UI kit used by every Vue page that boots it. */
import "../../kits/nuxt-ui.css";

import { agentApproval, TableAssistant } from "@adapttable/nuxt-ui/assistant";
import { bulkActions } from "@adapttable/nuxt-ui/bulk-actions";
import { cellNavigation } from "@adapttable/nuxt-ui/cell-navigation";
import { cellSpan } from "@adapttable/nuxt-ui/cell-span";
import { collapsibleColumnGroups } from "@adapttable/nuxt-ui/column-groups";
import { columnMenu } from "@adapttable/nuxt-ui/column-menu";
import { columnSelectionCheckbox } from "@adapttable/nuxt-ui/column-selection";
import { commandPalette } from "@adapttable/nuxt-ui/command-palette";
import { contextMenu } from "@adapttable/nuxt-ui/context-menu";
import { densityChooser } from "@adapttable/nuxt-ui/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/nuxt-ui/editing";
import { exportCsv } from "@adapttable/nuxt-ui/export";
import { extraRows } from "@adapttable/nuxt-ui/extra-rows";
import { filters } from "@adapttable/nuxt-ui/filters";
import { findInTable } from "@adapttable/nuxt-ui/find-in-table";
import { fullscreen } from "@adapttable/nuxt-ui/fullscreen";
import { groupingPanel } from "@adapttable/nuxt-ui/grouping-panel";
import { headerFilters } from "@adapttable/nuxt-ui/header-filters";
import { nestedTable } from "@adapttable/nuxt-ui/nested-table";
import { pinnedSummaryRows } from "@adapttable/nuxt-ui/pinned-summary-rows";
import { PivotPanel } from "@adapttable/nuxt-ui/pivot";
import { print } from "@adapttable/nuxt-ui/print";
import { resizableColumns } from "@adapttable/nuxt-ui/resizable-columns";
import { rowActions } from "@adapttable/nuxt-ui/row-actions";
import { rowPinning } from "@adapttable/nuxt-ui/row-pinning";
import { rowReorder } from "@adapttable/nuxt-ui/row-reorder";
import { savedViews } from "@adapttable/nuxt-ui/saved-views";
import { selectionStats } from "@adapttable/nuxt-ui/selection-stats";
import { statusBar } from "@adapttable/nuxt-ui/status-bar";
import { tree } from "@adapttable/nuxt-ui/tree";
import { virtualize } from "@adapttable/nuxt-ui/virtualize";
import UApp from "@nuxt/ui/components/App.vue";
import UAvatar from "@nuxt/ui/components/Avatar.vue";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UProgress from "@nuxt/ui/components/Progress.vue";
import USelect from "@nuxt/ui/components/Select.vue";
import { ar, en } from "@nuxt/ui/locale";
import ui from "@nuxt/ui/vue-plugin";
import { defineComponent, h } from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import NuxtConnectionInput from "./NuxtConnectionInput.vue";
import DataTable from "./tables/NuxtUiDataTable.vue";

const BADGE_COLOR = {
  success: "success",
  error: "error",
  info: "info",
  neutral: "neutral",
} as const;

/** Nuxt UI's app root carries its portals, tooltips and toasts. */
const Root = defineComponent(
  (props: { dark: boolean; dir: "ltr" | "rtl" }, { slots }) =>
    () =>
      h(
        UApp,
        { toaster: null, locale: props.dir === "rtl" ? ar : en },
        { default: () => slots.default?.() }
      ),
  { name: "NuxtUiShowcaseRoot", props: ["dark", "dir"] }
);

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "nuxt-ui",
  input: (props) => h(NuxtConnectionInput, props),
  install: (app) => {
    document.querySelector("#root")?.classList.add("isolate");
    app.use(ui);
  },
  Root,
  avatar: (initials) =>
    h(UAvatar, {
      text: initials,
      size: "md",
      "aria-hidden": "true",
      ui: { fallback: "text-default" },
    }),
  progress: (value, label) =>
    h(UProgress, {
      modelValue: value,
      max: 100,
      size: "sm",
      "aria-label": label,
    }),
  status: (tone, label) =>
    h(UBadge, {
      color: BADGE_COLOR[tone],
      style: { color: "var(--ui-text)" },
      size: "sm",
      variant: "subtle",
      label,
    }),
  button: ({ label, part, disabled, onClick }) =>
    h(UButton, {
      "data-adapttable-part": part,
      color: "neutral",
      variant: "outline",
      disabled,
      label,
      onClick,
    }),
  select: ({ label, part, value, options, disabled, onChange }) =>
    h(USelect, {
      "aria-label": label,
      "data-adapttable-part": part,
      modelValue: value,
      disabled,
      items: options.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      class: "w-40",
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
  findInTable,
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
