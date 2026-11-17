/**
 * CSV export — `@adapttable/<kit>/export`.
 *
 * The factory, the writer and the single-flight hook live together, so a
 * table that never imports it never carries export. The hook mounts in-tree
 * through `EXPORT_LIVE`.
 */
import {
  type ExportCsvOptions,
  makeExportCsvHandler,
  resolveExportCsv,
} from "@adapttable/core";
import { coreExportCsv } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import { useExportHandler } from "../export/useExportHandler";
import { slotRender } from "./providers";
import {
  EXPORT_LIVE,
  type ExportLiveDraw,
  type ExportLiveSlotProps,
} from "./slotKeys";
import type { TableFeature } from "./tableFeature";

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
    renders: [
      slotRender<ExportLiveDraw>(EXPORT_LIVE, (props) => (
        <LiveExport {...props} />
      )),
    ],
  };
}
