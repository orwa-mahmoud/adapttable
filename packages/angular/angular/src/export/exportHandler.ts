/**
 * The Export button's click handler, for CSV and for the XLSX and PDF writers.
 *
 * Core's export controller owns the run. This subscribes to it, abandons the
 * run on destroy, and derives the caption, the announcement and the progress
 * surface every kit renders.
 */
import {
  type ColumnMetadata,
  createExportController,
  type DisplayValue,
  exportButtonLabel,
  type ExportContext as CoreExportContext,
  type ExportCsvOptions,
  type ExportRunHandler,
  makeExportCsvHandler,
  resolveExportAnnouncement,
  resolveExportCsv,
  resolveExportDisabledReason,
  resolveExportProgressState,
  summaryExportValues,
  type SummaryRowFn,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import {
  chromeFeatureNotices,
  type ExportHandlerState,
  exportPageOnly,
  type FeatureHostState,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore } from "../store";

/** The export view, accepting the same summary mapper as an Angular table. @public */
export type ExportContext<TRow> = Omit<
  CoreExportContext<TRow>,
  "summaryRow"
> & {
  /** The host's summary; core drops values that a file cannot represent. */
  readonly summaryRow?: SummaryRowFn<TRow>;
};

/** Normalize the binding's renderable summaries through core's export policy. */
function coreContext<TRow>(
  context: ExportContext<TRow> | undefined
): CoreExportContext<TRow> | undefined {
  if (!context) return undefined;
  const { summaryRow, ...view } = context;
  return {
    ...view,
    summaryRow: summaryRow
      ? (rows) => {
          // Core has removed functions, symbols and non-value objects. Every remaining
          // value is a primitive or valid Date, both members of DisplayValue.
          return (summaryExportValues(summaryRow(rows)) ?? {}) as Partial<
            Record<string, DisplayValue>
          >;
        }
      : undefined,
  };
}

/**
 * Options for {@link injectExportHandler}.
 *
 * @public
 */
export interface ExportCsvHandlerOptions<TRow> {
  /** The export configuration, from `exportCsv(...)`, `exportXlsx(...)` or `exportPdf(...)`. */
  readonly exportCsv: boolean | ExportCsvOptions<TRow>;
  /** The table's source. */
  readonly source: Signal<TableSource<TRow>>;
  /** The columns the export writes, in order. */
  readonly columns: Signal<readonly ColumnMetadata<TRow>[]>;
  /** Current selection, range, hidden columns and structured view. Read when an export starts. */
  readonly context?: Signal<ExportContext<TRow> | undefined>;
  /** Resolved labels. */
  readonly labels: Signal<Required<TableLabels>>;
  /** The table's feature host, for writers features register. */
  readonly featureHost?: FeatureHostState;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * One export run: the button's handler, whether it is busy, what it
 * announces and its label. CSV, XLSX and PDF share it; the writer's
 * extension is the caption.
 *
 * @param options - See {@link ExportCsvHandlerOptions}.
 * @returns The state a toolbar's Export button reads.
 *
 * @public
 */
export function injectExportHandler<TRow>(
  options: ExportCsvHandlerOptions<TRow>
): Signal<ExportHandlerState> {
  if (!options.injector) assertInInjectionContext(injectExportHandler);
  const injector = options.injector ?? inject(Injector);
  const resolved = resolveExportCsv(options.exportCsv, options.featureHost);
  const format = resolved?.writer?.extension ?? "csv";
  const serverBuilt =
    resolved?.scope === "all" && resolved.onExportAll !== undefined;
  // Built at click time, so the export writes the rows and columns on
  // screen then.
  const handler: ExportRunHandler = (controls) =>
    makeExportCsvHandler(
      options.exportCsv,
      options.source(),
      options.columns(),
      coreContext(options.context?.()),
      options.featureHost
    )?.(controls);
  const pageOnly = computed(() =>
    exportPageOnly(
      chromeFeatureNotices({
        options: { exportCsv: options.exportCsv },
        source: options.source(),
        groupByKeys: [],
        rowReorderRequested: false,
        nestedArmed: false,
        hasEditableColumn: false,
        labels: options.labels(),
      })
    )
  );
  const controller = createExportController({
    handler: resolved ? handler : undefined,
    pageOnly: pageOnly(),
    serverBuilt,
  });
  injector.get(DestroyRef).onDestroy(controller.connect());
  const snapshot = fromStore(controller, { injector });
  const start = (): void => {
    controller.configure({
      handler: resolved ? handler : undefined,
      pageOnly: pageOnly(),
      serverBuilt,
    });
    controller.start();
  };
  return computed(() => {
    const { status, progress, message, error, downloadUrl, run } = snapshot();
    const labels = options.labels();
    return {
      onExportCsv: resolved ? start : undefined,
      exportBusy: status === "busy",
      exportStatus: status,
      exportAnnouncement: resolveExportAnnouncement({
        status,
        run,
        labels,
        progress,
        serverBuilt,
      }),
      exportProgressState: resolveExportProgressState({
        serverBuilt,
        status,
        progress,
        message,
        error,
        downloadUrl,
        cancel: controller.cancel,
        retry: start,
        dismiss: controller.dismiss,
      }),
      exportLabel: exportButtonLabel(labels, format),
      exportDisabled: pageOnly(),
      exportDisabledReason: resolveExportDisabledReason(labels, pageOnly()),
    };
  });
}

/**
 * CSV export of the current view. {@link injectExportHandler} is the run.
 *
 * @param options - See {@link ExportCsvHandlerOptions}.
 * @returns The state a toolbar's Export button reads.
 *
 * @public
 */
export function injectExportCsv<TRow>(
  options: ExportCsvHandlerOptions<TRow>
): Signal<ExportHandlerState> {
  return injectExportHandler(options);
}
