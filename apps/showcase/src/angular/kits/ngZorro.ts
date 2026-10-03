/** The real NG-ZORRO kit used by every Angular showcase body. */
// This module loads only for NG-ZORRO routes; the stylesheet never reaches
// the native Angular or React entry graphs.
import "../ngZorro.css";

import { type LocaleKey, locales } from "@adapttable/i18n";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import {
  AdaptAssistantButton,
  AdaptAssistantLanguageChip,
  AdaptTableAssistant,
  agentApproval,
} from "@adapttable/ng-zorro/assistant";
import { batchEditing } from "@adapttable/ng-zorro/batch-editing";
import { bulkActions } from "@adapttable/ng-zorro/bulk-actions";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";
import { cellSpan } from "@adapttable/ng-zorro/cell-span";
import { collapsibleColumnGroups } from "@adapttable/ng-zorro/column-groups";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { columnSelectionCheckbox } from "@adapttable/ng-zorro/column-selection";
import { commandPalette } from "@adapttable/ng-zorro/command-palette";
import { contextMenu } from "@adapttable/ng-zorro/context-menu";
import { densityChooser } from "@adapttable/ng-zorro/density";
import {
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "@adapttable/ng-zorro/editing";
import { exportCsv } from "@adapttable/ng-zorro/export";
import { extraRows } from "@adapttable/ng-zorro/extra-rows";
import { filters } from "@adapttable/ng-zorro/filters";
import { fullscreen } from "@adapttable/ng-zorro/fullscreen";
import { groupingPanel } from "@adapttable/ng-zorro/grouping-panel";
import { headerFilters } from "@adapttable/ng-zorro/header-filters";
import { nestedTable } from "@adapttable/ng-zorro/nested-table";
import { pinnedSummaryRows } from "@adapttable/ng-zorro/pinned-summary-rows";
import { AdaptPivotPanel, pivotTableModel } from "@adapttable/ng-zorro/pivot";
import { print } from "@adapttable/ng-zorro/print";
import { resizableColumns } from "@adapttable/ng-zorro/resizable-columns";
import { rowActions } from "@adapttable/ng-zorro/row-actions";
import { rowAppearance } from "@adapttable/ng-zorro/row-appearance";
import { rowPinning } from "@adapttable/ng-zorro/row-pinning";
import { rowReorder } from "@adapttable/ng-zorro/row-reorder";
import {
  AdaptSavedViewsPanel,
  savedViews,
} from "@adapttable/ng-zorro/saved-views";
import { sidePanel } from "@adapttable/ng-zorro/side-panel";
import { statusBar } from "@adapttable/ng-zorro/status-bar";
import { tree } from "@adapttable/ng-zorro/tree";
import { virtualize } from "@adapttable/ng-zorro/virtualize";
import { DOCUMENT } from "@angular/common";
import {
  DestroyRef,
  effect,
  inject,
  provideAppInitializer,
} from "@angular/core";
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
import nativeDarkTheme from "ng-zorro-antd/ng-zorro-antd.dark.min.css?url";
import nativeLightTheme from "ng-zorro-antd/ng-zorro-antd.min.css?url";

import { SHOWCASE_PRESENTATION } from "../data";
import { SHOWCASE_DARK, type ShowcaseKit } from "../showcaseKit";
import { ShowcaseStatus } from "./ngZorroStatus";

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
  providers: [
    provideNzI18n(NZ_LOCALES[locale]),
    provideAppInitializer(() => {
      const document = inject(DOCUMENT);
      const dark = inject(SHOWCASE_DARK);
      const loaded: Promise<void>[] = [];
      const themes = [nativeLightTheme, nativeDarkTheme].map((href) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.media = "not all";
        loaded.push(
          new Promise<void>((resolve, reject) => {
            link.onload = () => resolve();
            link.onerror = () =>
              reject(new Error("The native NG-ZORRO theme could not load"));
          })
        );
        document.head.prepend(link);
        return link;
      });
      effect(() => {
        const active = dark() ? 1 : 0;
        themes.forEach((theme, index) => {
          theme.media = index === active ? "all" : "not all";
        });
      });
      inject(DestroyRef).onDestroy(() =>
        themes.forEach((theme) => theme.remove())
      );
      return Promise.all(loaded);
    }),
  ],
  table: AdaptDataTable,
  statusCell: ShowcaseStatus,
  pivotPanel: AdaptPivotPanel,
  assistant: AdaptTableAssistant,
  assistantButton: AdaptAssistantButton,
  assistantSelect: AdaptAssistantLanguageChip,
  savedViewsPanel: AdaptSavedViewsPanel,
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
  batchEditing,
  contextMenu,
  commandPalette,
  extraRows,
  rowAppearance,
  statusBar,
  sidePanel,
  fullscreen,
  print,
  agentApproval,
} satisfies ShowcaseKit;
