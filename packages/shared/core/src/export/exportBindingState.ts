/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { ExportProgressState, ExportStatus } from "./exportController";

/**
 * What `useExportHandler` returns.
 *
 * @public
 */
export interface ExportHandlerState {
  /** Bind to the Export button, or `undefined` when export is off. */
  onExportCsv: (() => void) | undefined;
  /** True while a host-handled export is still running. */
  exportBusy: boolean;
  /**
   * Idle, busy, done or failed — for a kit that shows more than a spinner, and
   * for tests that assert the outcome rather than the visuals.
   */
  exportStatus: ExportStatus;
  /**
   * Live-region text for the last outcome, empty until there is one. Adapters
   * render it in a polite region beside the button.
   */
  exportAnnouncement: string;
  /** Server-built progress UI, absent for browser-built exports. */
  exportProgressState: ExportProgressState | null;
  /**
   * The button's caption, naming the format it actually produces — "Export CSV"
   * by default, "Export XLSX" with the spreadsheet writer, and localized either
   * way. A button that names a file the user is not getting is a lie no adapter
   * should have to correct.
   */
  exportLabel: string;
  /**
   * The export the host asked for is beyond what the source can do. Adapters
   * render the button disabled — the reader is told, rather than handed a
   * narrower file than the one the button offered.
   */
  exportDisabled: boolean;
  /**
   * Why the button is disabled, localized, empty while it is not. Adapters
   * attach it to the control so the reason travels with the thing it explains.
   */
  exportDisabledReason: string;
}
