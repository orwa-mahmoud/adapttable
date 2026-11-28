/**
 * The real Ant Design Vue kit used by every Vue page that boots it. Ant Design
 * Vue draws its own styles at runtime, so there is no stylesheet to import.
 */
import {
  agentApproval,
  TableAssistant,
} from "@adapttable/ant-design-vue/assistant";
import { batchEditing } from "@adapttable/ant-design-vue/batch-editing";
import { bulkActions } from "@adapttable/ant-design-vue/bulk-actions";
import { cellNavigation } from "@adapttable/ant-design-vue/cell-navigation";
import { cellSpan } from "@adapttable/ant-design-vue/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ant-design-vue/column-groups";
import { columnMenu } from "@adapttable/ant-design-vue/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ant-design-vue/column-selection";
import { commandPalette } from "@adapttable/ant-design-vue/command-palette";
import { contextMenu } from "@adapttable/ant-design-vue/context-menu";
import { densityChooser } from "@adapttable/ant-design-vue/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/ant-design-vue/editing";
import { exportCsv } from "@adapttable/ant-design-vue/export";
import { extraRows } from "@adapttable/ant-design-vue/extra-rows";
import { filters } from "@adapttable/ant-design-vue/filters";
import { findInTable } from "@adapttable/ant-design-vue/find-in-table";
import { fullscreen } from "@adapttable/ant-design-vue/fullscreen";
import { groupingPanel } from "@adapttable/ant-design-vue/grouping-panel";
import { headerFilters } from "@adapttable/ant-design-vue/header-filters";
import { nestedTable } from "@adapttable/ant-design-vue/nested-table";
import { pinnedSummaryRows } from "@adapttable/ant-design-vue/pinned-summary-rows";
import { PivotPanel } from "@adapttable/ant-design-vue/pivot";
import { print } from "@adapttable/ant-design-vue/print";
import { resizableColumns } from "@adapttable/ant-design-vue/resizable-columns";
import { rowActions } from "@adapttable/ant-design-vue/row-actions";
import { rowPinning } from "@adapttable/ant-design-vue/row-pinning";
import { rowReorder } from "@adapttable/ant-design-vue/row-reorder";
import {
  savedViews,
  SavedViewsPanel,
} from "@adapttable/ant-design-vue/saved-views";
import { selection } from "@adapttable/ant-design-vue/selection";
import { selectionStats } from "@adapttable/ant-design-vue/selection-stats";
import { statusBar } from "@adapttable/ant-design-vue/status-bar";
import { tree } from "@adapttable/ant-design-vue/tree";
import { virtualize } from "@adapttable/ant-design-vue/virtualize";
import {
  Avatar,
  Button,
  ConfigProvider,
  Input,
  Progress,
  Select,
  Tag,
  theme,
} from "ant-design-vue";
import arEG from "ant-design-vue/es/locale/ar_EG";
import enUS from "ant-design-vue/es/locale/en_US";
import {
  defineComponent,
  h,
  onMounted,
  onUpdated,
  type ComponentPublicInstance,
  useTemplateRef,
} from "vue";

import type { ShowcaseKit } from "../showcaseKit";
import DataTable from "./tables/AntDesignVueDataTable.vue";

const TAG_COLOR = {
  success: "success",
  error: "error",
  info: "processing",
  neutral: "default",
} as const;

/** Ant Design Vue's theme algorithm, locale and direction come from its provider. */
const Root = defineComponent(
  (props: { dark: boolean; dir: "ltr" | "rtl" }, { slots }) =>
    () =>
      h(
        ConfigProvider,
        {
          locale: props.dir === "rtl" ? arEG : enUS,
          direction: props.dir,
          theme: {
            algorithm: props.dark
              ? theme.darkAlgorithm
              : theme.defaultAlgorithm,
          },
        },
        { default: () => slots.default?.() }
      ),
  { name: "AntDesignVueShowcaseRoot", props: ["dark", "dir"] }
);

/** Ant Design Vue's select puts its attributes on the root; the name belongs on its combobox. */
const NamedSelect = defineComponent(
  (props: Parameters<ShowcaseKit["select"]>[0]) => {
    const select = useTemplateRef<ComponentPublicInstance>("select");
    const name = (): void => {
      const host: unknown = select.value?.$el;
      if (!(host instanceof Element)) return;
      host
        .querySelector('[role="combobox"]')
        ?.setAttribute("aria-label", props.label);
    };
    onMounted(name);
    onUpdated(name);
    return () =>
      h(Select, {
        ref: "select",
        "data-adapttable-part": props.part,
        value: props.value,
        disabled: props.disabled,
        options: props.options.map((option) => ({
          label: option.label,
          value: option.value,
        })),
        style: { width: "10rem" },
        "onUpdate:value": (next: unknown) => {
          if (typeof next === "string") props.onChange(next);
        },
      });
  },
  {
    name: "AntDesignVueShowcaseSelect",
    props: ["label", "part", "value", "options", "disabled", "onChange"],
  }
);

/** Components and feature factories are always from this one kit. */
export const kit: ShowcaseKit = {
  key: "ant-design-vue",
  input: ({ label, part, value, type, disabled, onChange }) =>
    h(Input, {
      "aria-label": label,
      "data-adapttable-part": part,
      value,
      type,
      disabled,
      autocomplete: "off",
      "onUpdate:value": onChange,
    }),
  Root,
  avatar: (initials) =>
    h(
      Avatar,
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
    h(Progress, {
      percent: value,
      showInfo: false,
      strokeWidth: 6,
      "aria-label": label,
    }),
  status: (tone, label) => h(Tag, { color: TAG_COLOR[tone] }, () => label),
  button: ({ label, part, disabled, onClick }) =>
    h(Button, { "data-adapttable-part": part, disabled, onClick }, () => label),
  select: (props) => h(NamedSelect, props),
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
