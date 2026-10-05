import {
  createExportController,
  exportButtonLabel,
  type ExportContext,
  type ExportCsvOptions,
  makeExportCsvHandler,
  resolveExportAnnouncement,
  resolveExportCsv,
  resolveExportDisabledReason,
  resolveExportProgressState,
} from "@adapttable/core";
import {
  chromeFeatureNotices,
  coreExportCsv,
  type ExportHandlerState,
  exportPageOnly,
  featureStateKey,
  type GridFocusState,
} from "@adapttable/core/binding";
import { computed, watch } from "vue";

import { EXPORT_CONTROL, EXPORT_MODEL } from "./actions/contracts";
import { connectWhileActive, featureActivity } from "./actions/lifecycle";
import type {
  FeatureMountContext,
  TableFeature,
} from "./features/tableFeature";
import { groupingModelKey, treeModelKey } from "./hierarchy/models";
import { useExternalStore } from "./store";
const GRID_FOCUS_MODEL = featureStateKey<GridFocusState>(
  "vue-grid-focus-model"
);
function mountExport<TRow>(context: FeatureMountContext<TRow>): void {
  const active = featureActivity(context);
  const grid = context.state.get(GRID_FOCUS_MODEL);
  const grouping = context.state.get(groupingModelKey<TRow>());
  const tree = context.state.get(treeModelKey<TRow>());
  const configured = () =>
    context.options.value.exportCsv as boolean | ExportCsvOptions<TRow>;
  const exportHost = () => ({
    ...context.featureHost.value,
    columnMenuActions: [],
    contextMenuItems: [],
  });
  const resolved = computed(() => resolveExportCsv(configured(), exportHost()));
  const serverBuilt = () =>
    resolved.value?.scope === "all" && resolved.value.onExportAll !== undefined;
  const pageOnly = computed(() =>
    exportPageOnly(
      chromeFeatureNotices({
        options: { exportCsv: configured() },
        source: context.source.value,
        groupByKeys: grouping.value?.groupBy ?? [],
        rowReorderRequested: false,
        nestedArmed: false,
        hasEditableColumn: false,
        labels: context.table.labels.value,
      })
    )
  );
  const exportContext = (): ExportContext<TRow> => ({
    selectedIds: context.selection?.value?.selectedIds.value,
    getRowId: context.table.rowKey,
    allColumns: context.table.allColumns.value,
    range: grid.value?.range,
    firstRowIndex: context.table.windowStart.value,
    grouping: grouping.value
      ? { groupBy: grouping.value.groupBy, entries: grouping.value.entries }
      : undefined,
    tree: tree.value
      ? { entries: tree.value.entries, allEntries: tree.value.allEntries }
      : undefined,
    groupTotal: context.table.labels.value.groupTotal,
    getCellSpan: context.options.value
      .getCellSpan as ExportContext<TRow>["getCellSpan"],
    summaryRow: context.options.value
      .summaryRow as ExportContext<TRow>["summaryRow"],
  });
  const exportSource = () => {
    const source = context.source.value;
    if (resolved.value?.scope !== "range") return source;
    const rows =
      context.bodyRows?.value.map((model) => model.row) ??
      context.rowInventory?.value.visibleRows ??
      source.rows;
    return { ...source, rows };
  };
  const handler = () => ({
    handler: resolved.value
      ? (
          controls?: Parameters<
            NonNullable<ReturnType<typeof makeExportCsvHandler<TRow>>>
          >[0]
        ) =>
          makeExportCsvHandler(
            configured(),
            exportSource(),
            context.table.columns.value,
            exportContext(),
            exportHost()
          )?.(controls)
      : undefined,
    pageOnly: pageOnly.value,
    serverBuilt: serverBuilt(),
  });
  const controller = createExportController(handler());
  const snapshot = useExternalStore(controller, { active: context.active });
  connectWhileActive(context, controller.connect);
  const start = () => {
    if (active()) {
      controller.configure(handler());
      controller.start();
    }
  };
  // Source replacement abandons a job for the previous source, without coupling
  // progress to ordinary data/query snapshots from the same engine.
  watch(
    () => context.source.value.tableEngine,
    () => controller.cancel(),
    { flush: "sync" }
  );
  const model = computed<ExportHandlerState>(() => {
    const { status, progress, message, error, downloadUrl, run } =
      snapshot.value;
    const labels = context.table.labels.value;
    return {
      onExportCsv: resolved.value ? start : undefined,
      exportBusy: status === "busy",
      exportStatus: status,
      exportAnnouncement: resolveExportAnnouncement({
        status,
        run,
        labels,
        progress,
        serverBuilt: serverBuilt(),
      }),
      exportProgressState: resolveExportProgressState({
        serverBuilt: serverBuilt(),
        status,
        progress,
        message,
        error,
        downloadUrl,
        cancel: () => {
          if (active()) controller.cancel();
        },
        retry: start,
        dismiss: () => {
          if (active()) {
            controller.dismiss();
            context.root.value
              ?.querySelector<HTMLElement>(
                '[data-adapttable-part="export-csv-button"]'
              )
              ?.focus();
          }
        },
      }),
      exportLabel: exportButtonLabel(
        labels,
        resolved.value?.writer?.extension ?? "csv"
      ),
      exportDisabled: pageOnly.value,
      exportDisabledReason: resolveExportDisabledReason(labels, pageOnly.value),
    };
  });
  watch(model, (value) => context.state.set(EXPORT_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
}
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  const core = coreExportCsv<TRow>(options);
  return {
    id: core.id,
    apply: (input) => core.apply?.(input) ?? {},
    setup: (host) => core.setup?.(host),
    mount: mountExport,
    requiredSlots: [EXPORT_CONTROL],
  };
}
export { EXPORT_CONTROL, EXPORT_MODEL } from "./actions/contracts";
export type {
  ExportChromeProps,
  ExportProgressChromeProps,
  ExportProgressSlots,
  ExportSlots,
} from "./export/exportChrome";
export { ExportChrome, ExportProgressChrome } from "./export/exportChrome";
export type * from "./index";
export type {
  ExportAllControls,
  ExportAllResult,
  ExportContext,
  ExportCsvOptions,
  ExportProgressState,
  ExportWriter,
} from "@adapttable/core";
export type { ExportHandlerState } from "@adapttable/core/binding";
