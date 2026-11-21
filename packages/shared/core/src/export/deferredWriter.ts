/**
 * Writers that load when they are first needed.
 *
 * The Excel and PDF writers are larger than the rest of the export path
 * together, and a table pays for them the moment it composes the feature. A
 * deferred writer names its format at once and loads its builder on demand:
 * the export waits for it, a background preload after mount makes the wait
 * rare, and a load that fails is a failed export that the next click tries
 * again.
 */
import { devWarn } from "../utils/devWarn";
import type { ExportWriter } from "./exportWriter";
import type { PdfWriterOptions } from "./pdf";

/**
 * A file format whose builder loads on demand.
 *
 * @public
 */
export interface DeferredExportWriter {
  /** Extension used when no filename was given, e.g. `"xlsx"`. */
  readonly extension: string;
  /**
   * Resolve the builder. The first call starts the load and later calls
   * share it; a load that failed is forgotten, so the next call tries again.
   */
  readonly load: () => Promise<ExportWriter>;
  /**
   * Start the load once the browser is idle, so a page that loaded online
   * can still export after the connection drops. A preload that fails leaves
   * the writer unloaded; the next export loads it again and reports its own
   * failure.
   *
   * @returns Cancels the preload if it has not started.
   */
  readonly preload: () => () => void;
}

/**
 * What an export's `writer` option takes: a builder, or one that loads on
 * demand.
 *
 * @public
 */
export type ExportWriterOption = ExportWriter | DeferredExportWriter;

/**
 * Whether a writer loads its builder on demand.
 *
 * @param writer - The writer.
 * @returns `true` for a {@link DeferredExportWriter}.
 *
 * @public
 */
export function isDeferredExportWriter(
  writer: ExportWriterOption
): writer is DeferredExportWriter {
  return !("build" in writer);
}

/**
 * A writer that loads its builder on demand.
 *
 * @param extension - The file extension.
 * @param loader - Loads the builder, typically through a dynamic `import()`.
 * @returns The deferred writer.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function deferredExportWriter(
  extension: string,
  loader: () => Promise<ExportWriter>
): DeferredExportWriter {
  let pending: Promise<ExportWriter> | undefined;
  const load = (): Promise<ExportWriter> => {
    pending ??= loader().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  return {
    extension,
    load,
    preload: () =>
      whenIdle(() => {
        load().catch((error: unknown) => {
          devWarn(
            `Preloading the ${extension} export writer failed; the next export loads it again. Reason: ${String(error)}`
          );
        });
      }),
  };
}

/**
 * Core's Excel writer, loaded on the first export.
 *
 * @param options - The sheet name, as `xlsxWriter` takes it.
 * @returns The deferred writer.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function deferredXlsxWriter(options?: {
  sheetName?: string;
}): DeferredExportWriter {
  return deferredExportWriter("xlsx", () =>
    import("./xlsx").then((module) => module.xlsxWriter(options))
  );
}

/**
 * Core's PDF writer, loaded on the first export.
 *
 * @param options - The page and font options, as `pdfWriter` takes them.
 * @returns The deferred writer.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function deferredPdfWriter(
  options?: PdfWriterOptions
): DeferredExportWriter {
  return deferredExportWriter("pdf", () =>
    import("./pdf").then((module) => module.pdfWriter(options))
  );
}

interface IdleScheduler {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
}

/** Run `work` once the browser is idle; nothing outside a browser. */
function whenIdle(work: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const idle = window as Window & IdleScheduler;
  if (idle.requestIdleCallback && idle.cancelIdleCallback) {
    const handle = idle.requestIdleCallback(work);
    return () => {
      idle.cancelIdleCallback?.(handle);
    };
  }
  const handle = window.setTimeout(work, 1);
  return () => {
    window.clearTimeout(handle);
  };
}
