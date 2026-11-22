/**
 * CSV export — `@adapttable/<kit>/export`.
 *
 * The factory, the writer and the single-flight hook live together, so a
 * table that never imports it never carries export. The hook mounts in-tree
 * as its live stage.
 */
import {
  type ExportCsvOptions,
  makeExportCsvHandler,
  resolveExportCsv,
} from "@adapttable/core";
import {
  coreExportCsv,
  exportPageOnly,
  liveStageKey,
  sourceWindowStart,
} from "@adapttable/core/binding";
import type { ReactNode } from "react";

import {
  type ExportHandlerState,
  useExportHandler,
} from "../export/useExportHandler";
import type { LiveStageProps } from "./liveStage";
import { slotRender } from "./providers";
import { type ExportLiveSlotProps } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

/** Export's live stage: reads the grid's range, writes the export control. */
const EXPORT_STAGE = liveStageKey<LiveStageProps<unknown>>("export", {
  reads: ["gridFocus"],
  writes: "exportHandler",
});

/** Build the export's inputs from the shell and hand them to its slot. */
function ExportStage<TRow>({
  shell,
  live,
  children,
}: LiveStageProps<TRow>): ReactNode {
  "use no memo";
  const props = shell.chromeProps;
  const chrome = shell.chrome;
  const exportProps = {
    exportCsv: props.exportCsv,
    source: chrome.source,
    columns: chrome.columnLayout.visibleColumns,
    context: {
      selectedIds: chrome.table.selection?.selectedIds,
      getRowId: chrome.getRowId,
      allColumns: chrome.allColumns,
      range: live.gridFocus.range,
      firstRowIndex: sourceWindowStart(chrome.source),
      getCellSpan: props.getCellSpan,
      grouping: chrome.grouping,
      tree: chrome.tree,
      groupTotal: shell.labels.groupTotal,
      summaryRow: props.summaryRow,
    },
    featureHost: shell.featureHost,
    labels: shell.labels,
    pageOnly: exportPageOnly(chrome.featureNotices),
    children: (exportHandler: ExportHandlerState) =>
      children({ ...live, exportHandler }),
  } satisfies ExportLiveSlotProps<TRow>;
  return <LiveExport {...exportProps} />;
}

function LiveExport<TRow>({
  exportCsv,
  source,
  columns,
  context,
  featureHost,
  labels,
  pageOnly,
  children,
}: ExportLiveSlotProps<TRow>): ReactNode {
  const handler = makeExportCsvHandler(
    exportCsv,
    source,
    columns,
    context,
    featureHost
  );
  const options = resolveExportCsv(exportCsv, featureHost);
  const format = options?.writer?.extension;
  const serverBuilt =
    options?.scope === "all" && options.onExportAll !== undefined;
  const exportHandler = useExportHandler(
    handler,
    labels,
    format,
    pageOnly,
    serverBuilt
  );
  return children(exportHandler);
}

/**
 * Add CSV export of the current view.
 *
 * @public
 */
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): TableFeature<TRow> {
  return {
    ...coreExportCsv<TRow>(options),
    renders: [slotRender(EXPORT_STAGE, (props) => <ExportStage {...props} />)],
  };
}
