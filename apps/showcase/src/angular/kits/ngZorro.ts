/** The real NG-ZORRO kit used by every Angular showcase body. */
// This module loads only for NG-ZORRO routes; the stylesheet never reaches
// the native Angular or React entry graphs.
import "ng-zorro-antd/ng-zorro-antd.min.css";
import "../ngZorro.css";

import { type LocaleKey, locales } from "@adapttable/i18n";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import {
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/ng-zorro/assistant";
import { bulkActions } from "@adapttable/ng-zorro/bulk-actions";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";
import { cellSpan } from "@adapttable/ng-zorro/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ng-zorro/column-groups";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ng-zorro/column-selection";
import { densityChooser } from "@adapttable/ng-zorro/density";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/ng-zorro/editing";
import { exportCsv } from "@adapttable/ng-zorro/export";
import { filters } from "@adapttable/ng-zorro/filters";
import { groupingPanel } from "@adapttable/ng-zorro/grouping-panel";
import { headerFilters } from "@adapttable/ng-zorro/header-filters";
import { nestedTable } from "@adapttable/ng-zorro/nested-table";
import { pinnedSummaryRows } from "@adapttable/ng-zorro/pinned-summary-rows";
import { AdaptPivotPanel, pivotTableModel } from "@adapttable/ng-zorro/pivot";
import { resizableColumns } from "@adapttable/ng-zorro/resizable-columns";
import { rowActions } from "@adapttable/ng-zorro/row-actions";
import { rowPinning } from "@adapttable/ng-zorro/row-pinning";
import { rowReorder } from "@adapttable/ng-zorro/row-reorder";
import { savedViews } from "@adapttable/ng-zorro/saved-views";
import { tree } from "@adapttable/ng-zorro/tree";
import { virtualize } from "@adapttable/ng-zorro/virtualize";
import {
  ar_EG,
  cs_CZ,
  de_DE,
  en_US,
  es_ES,
  fa_IR,
  fr_FR,
  he_IL,
  hi_IN,
  it_IT,
  ja_JP,
  ko_KR,
  type NzI18nInterface,
  pl_PL,
  provideNzI18n,
  pt_PT,
  ru_RU,
  tr_TR,
  ur_PK,
  zh_CN,
  zh_TW,
} from "ng-zorro-antd/i18n";

import { SHOWCASE_PRESENTATION } from "../data";
import type { ShowcaseKit } from "../showcaseKit";

/** Match NG-ZORRO's own widget text to every bundled AdaptTable locale. */
const NZ_LOCALES = {
  en: en_US,
  ar: ar_EG,
  cs: cs_CZ,
  de: de_DE,
  es: es_ES,
  fa: fa_IR,
  fr: fr_FR,
  he: he_IL,
  hi: hi_IN,
  it: it_IT,
  ja: ja_JP,
  ko: ko_KR,
  pl: pl_PL,
  pt: pt_PT,
  ru: ru_RU,
  tr: tr_TR,
  ur: ur_PK,
  zh: zh_CN,
  "zh-TW": zh_TW,
} satisfies Record<LocaleKey, NzI18nInterface>;

// getLabels already resolved region tags and unknown-locale fallback; use that
// exact bundle identity so the two libraries cannot disagree about the language.
const locale = (Object.entries(locales).find(
  ([, labels]) => labels === SHOWCASE_PRESENTATION.labels
)?.[0] ?? "en") as LocaleKey;

/** Components and feature factories are always from this one kit. */
export const kit = {
  key: "ng-zorro",
  providers: [provideNzI18n(NZ_LOCALES[locale])],
  table: AdaptDataTable,
  pivotPanel: AdaptPivotPanel,
  assistant: AdaptTableAssistant,
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
  groupingPanel,
  headerFilters,
  nestedTable,
  pinnedSummaryRows,
  pivotTableModel,
  resizableColumns,
  rowActions,
  rowPinning,
  rowReorder,
  savedViews,
  tree,
  virtualize,
  agentApproval,
} satisfies ShowcaseKit;
