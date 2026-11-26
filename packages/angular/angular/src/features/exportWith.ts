import {
  type AdaptTableFeature,
  FEATURE_IMPLEMENTATIONS,
  injectExportCsv,
  withFeatureImplementation,
} from "@adapttable/angular";
import type { ExportCsvOptions } from "@adapttable/core";
import {
  coreExportCsv,
  type ExportWriterOption,
} from "@adapttable/core/binding";

/** Export options a writer feature takes: everything but the writer. */
export type WriterExportOptions<TRow> = Omit<ExportCsvOptions<TRow>, "writer">;

/** Options that name `writer`, or the writer alone when the host passed `true`. */
function writerOptions<TRow>(
  options: true | WriterExportOptions<TRow>,
  writer: ExportWriterOption
): ExportCsvOptions<TRow> {
  if (options === true) return { writer };
  return { ...options, writer };
}

/**
 * A feature that writes with `writer`, or no export when `options` is false.
 * Each writer's entry imports this with its own writer, so loading one
 * format never loads another.
 */
export function exportWith<TRow>(
  options: boolean | WriterExportOptions<TRow>,
  writer: ExportWriterOption
): AdaptTableFeature {
  if (options === false) return coreExportCsv(false);
  return withFeatureImplementation(
    coreExportCsv(writerOptions(options, writer)),
    FEATURE_IMPLEMENTATIONS.exportCsv,
    injectExportCsv
  );
}
