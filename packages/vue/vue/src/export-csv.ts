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
  type TreeShape,
} from "@adapttable/core";
import {
  chromeFeatureNotices,
  coreExportCsv,
  type ExportHandlerState,
  exportPageOnly,
  featureStateKey,
  type GridFocusState,
} from "@adapttable/core/binding";
import { computed, shallowRef, watch } from "vue";

import { EXPORT_CONTROL, EXPORT_MODEL } from "./actions/contracts";
import { featureActivity } from "./actions/lifecycle";
import type {
  FeatureMountContext,
  StaticTableFeature,
  TableFeature,
} from "@adapttable/vue";
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
  const exportContext = (): ExportContext<TRow> => {
    const currentTree = tree.value;
    const shape = currentTree
      ? (context.options.value as TreeShape<TRow>)
      : undefined;
    const getChildren = shape?.getChildren;
    const getParentId = shape?.getParentId;
    return {
      selectedIds: context.selection?.value?.selectedIds.value,
      getRowId: context.table.rowKey,
      allColumns: context.table.allColumns.value,
      range: grid.value?.range,
      firstRowIndex: context.table.windowStart.value,
      grouping: grouping.value
        ? { groupBy: grouping.value.groupBy, entries: grouping.value.entries }
        : undefined,
      tree: currentTree
        ? {
            entries: currentTree.entries,
            allEntries: currentTree.allEntries,
            ...(getChildren ? { getChildren } : {}),
            ...(getParentId ? { getParentId } : {}),
          }
        : undefined,
      groupTotal: context.table.labels.value.groupTotal,
      getCellSpan: context.options.value
        .getCellSpan as ExportContext<TRow>["getCellSpan"],
      summaryRow: context.options.value
        .summaryRow as ExportContext<TRow>["summaryRow"],
    };
  };
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
  const controller = shallowRef(createExportController(handler()));
  // Built-in sources retain their engine or page mutator across snapshots.
  // Custom mutator replacement conservatively retires the previous owner;
  // shared callbacks cannot distinguish unrelated custom sources.
  const sourceOwner = () =>
    context.source.value.tableEngine ?? context.source.value.setPage;
  let acceptedOwner = sourceOwner();
  let replacing = false;
  watch(
    () => ({ owner: sourceOwner() }),
    () => {
      if (replacing) return;
      replacing = true;
      try {
        // Abort listeners may replace the source while the old owner retires.
        // Read again after cleanup; do not rely on watch's oldValue ordering.
        let next = sourceOwner();
        while (next !== acceptedOwner) {
          acceptedOwner = next;
          controller.value = createExportController(handler());
          next = sourceOwner();
        }
      } finally {
        replacing = false;
      }
    },
    { flush: "sync" }
  );
  let connected: typeof controller.value | undefined;
  watch(
    [context.active, controller],
    ([enabled, owner], _previous, onCleanup) => {
      // Disconnect can invoke the host's abort listener synchronously. A newer
      // source admitted by that listener owns the connection, not this frame.
      if (
        context.scope.active &&
        enabled &&
        context.active.value &&
        controller.value === owner
      ) {
        const disconnect = owner.connect();
        connected = owner;
        onCleanup(() => {
          // Vue 3.5.0 marks a stopping scope inactive after effect cleanup.
          // Fence retained actions before abort listeners can call them.
          if (connected === owner) connected = undefined;
          disconnect();
        });
      }
    },
    { immediate: true, flush: "sync" }
  );
  const snapshot = useExternalStore(controller, { active: context.active });
  const owns = (owner: typeof controller.value) =>
    context.scope.active &&
    active() &&
    controller.value === owner &&
    connected === owner;
  const start = (owner: typeof controller.value) => {
    if (owns(owner)) {
      owner.configure(handler());
      owner.start();
    }
  };
  const model = computed<ExportHandlerState>(() => {
    const owner = controller.value;
    const runExport = () => start(owner);
    const { status, progress, message, error, downloadUrl, run } =
      snapshot.value;
    const labels = context.table.labels.value;
    return {
      onExportCsv: resolved.value ? runExport : undefined,
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
          if (owns(owner)) owner.cancel();
        },
        retry: runExport,
        dismiss: () => {
          if (owns(owner)) {
            owner.dismiss();
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
/** Export the current view with the configured writer and shared lifecycle. @public */
export function exportCsv(options?: boolean): StaticTableFeature;
export function exportCsv<TRow>(
  options?: boolean | ExportCsvOptions<TRow>
): TableFeature<TRow>;
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
export type {
  ExportAllControls,
  ExportAllResult,
  ExportContext,
  ExportCsvOptions,
  ExportProgressState,
  ExportWriter,
} from "@adapttable/core";
export type { ExportHandlerState } from "@adapttable/core/binding";
