/**
 * CSV export — `@adapttable/<kit>/export`.
 *
 * The factory, the writer and the single-flight hook live together, so a
 * table that never imports it never carries export. The hook mounts in-tree
 * through {@link EXPORT_LIVE}.
 */
import type { ReactNode } from "react";

import type { ExportCsvOptions } from "../export/tableCsv";
import { makeExportCsvHandler, resolveExportCsv } from "../export/tableCsv";
import { useExportHandler } from "../export/useExportHandler";
import { slotRender } from "./providers";
import { EXPORT_LIVE, type ExportLiveSlotProps } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

function LiveExport({
  exportCsv,
  source,
  columns,
  context,
  featureHost,
  labels,
  pageOnly,
  children,
}: ExportLiveSlotProps<never>): ReactNode {
  const handler = makeExportCsvHandler(
    exportCsv,
    source,
    columns,
    context,
    featureHost
  );
  const format = resolveExportCsv(exportCsv, featureHost)?.writer?.extension;
  const exportHandler = useExportHandler(handler, labels, format, pageOnly);
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
  const writer = typeof options === "object" ? options.writer : undefined;
  return {
    id: "export-csv",
    apply: () => ({ exportCsv: options }),
    setup: writer ? (host) => host.registerWriter(writer) : undefined,
    renders: [slotRender(EXPORT_LIVE, (props) => <LiveExport {...props} />)],
  };
}
