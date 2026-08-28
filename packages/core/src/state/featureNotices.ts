/**
 * Kit-agnostic notices for opted-in features that cannot run.
 *
 * The host turned something on; the table cannot honour it. Dev consoles
 * already warn. The person at the table should see the same fact — off,
 * disabled, or one page — through existing chrome (status bar, export
 * label, missing pin/reorder, unvirtualized page). Nothing here flips an
 * opt-in or draws a new control.
 */
import {
  exportAllFallsBackToPage,
  type ExportCsvOptions,
} from "../export/tableCsv";
import type { TableSource } from "../source/TableSource";
import type { TableLabels } from "../types";

/**
 * Which opted-in feature is inert.
 *
 * @internal
 */
export type FeatureNoticeKind =
  | "virtualize-paged"
  | "pin-nested"
  | "reorder-nested"
  | "grouping-unavailable"
  | "export-all-page"
  | "edit-without-writer";

/**
 * How the table already looks to the person sitting at it.
 *
 * @public
 */
export type FeatureNoticeAppearance = "off" | "disabled" | "one-page";

/**
 * One inert feature, ready for a status slot or a root attribute.
 *
 * @internal
 */
export interface FeatureNotice {
  /** Which feature could not run. */
  readonly kind: FeatureNoticeKind;
  /** How the table already looks because of it. */
  readonly appearance: FeatureNoticeAppearance;
  /** The explanation, already localized. */
  readonly message: string;
}

/** Inputs {@link collectFeatureNotices} needs. Host props + source facts. */
export interface CollectFeatureNoticesInput<TRow = unknown> {
  /** Whether the host asked for row virtualization. */
  virtualize?: boolean;
  /** How the source pages, which decides whether virtualization can run. */
  paginationMode?: TableSource<TRow>["paginationMode"];
  /** Columns grouping is armed on. */
  groupByKeys: readonly string[];
  /** Every filtered row, when the source can hand them over. */
  allFilteredRows?: readonly TRow[];
  /** Server-built groups, when grouping happens upstream. */
  serverGroups?: unknown;
  /** Whether the host asked for row pinning. */
  rowPinningRequested: boolean;
  /** Whether the host asked for row reordering. */
  rowReorderRequested: boolean;
  /** Grouping is armed or a tree is on — pin and reorder stay off. */
  nestedArmed: boolean;
  /** Whether any column declared an editor. */
  hasEditableColumn: boolean;
  /** The cell-edit writer, absent when the host never wired one. */
  onCellEdit?: unknown;
  /** Whether the host asked for row editing. */
  rowEditing?: boolean;
  /** The row-edit writer, absent when the host never wired one. */
  onRowEdit?: unknown;
  /** Whether the host asked for batch editing. */
  batchEditing?: boolean;
  /** The batch writer, absent when the host never wired one. */
  onBatchEdit?: unknown;
  /** CSV export, and its options when it is more than a flag. */
  exportCsv?: boolean | ExportCsvOptions<TRow>;
  /** Label overrides; gaps fall back to English. */
  labels: TableLabels;
}

/**
 * Build the notices for features the host asked for that cannot run.
 *
 * @param input - Host flags, source facts, and resolved labels.
 * @returns Notices in a stable order; empty when everything can run.
 */
export function collectFeatureNotices<TRow>(
  input: CollectFeatureNoticesInput<TRow>
): readonly FeatureNotice[] {
  const labels = input.labels;
  const notices: FeatureNotice[] = [];

  if (input.virtualize === true && input.paginationMode === "paged") {
    notices.push({
      kind: "virtualize-paged",
      appearance: "one-page",
      message:
        labels.noticeVirtualizePaged ??
        "Virtualization is off — this paged table shows one page at a time.",
    });
  }

  if (
    input.groupByKeys.length > 0 &&
    input.allFilteredRows === undefined &&
    input.serverGroups === undefined
  ) {
    notices.push({
      kind: "grouping-unavailable",
      appearance: "off",
      message:
        labels.noticeGroupingUnavailable ??
        "Grouping is off — this source does not provide the full filtered set.",
    });
  }

  if (input.rowPinningRequested && input.nestedArmed) {
    notices.push({
      kind: "pin-nested",
      appearance: "off",
      message:
        labels.noticePinNested ??
        "Row pinning is off while grouping or a tree is on.",
    });
  }

  if (input.rowReorderRequested && input.nestedArmed) {
    notices.push({
      kind: "reorder-nested",
      appearance: "off",
      message:
        labels.noticeReorderNested ??
        "Row reorder is off while grouping or a tree is on.",
    });
  }

  if (
    exportAllFallsBackToPage(input.exportCsv, {
      allFilteredRows: input.allFilteredRows,
    })
  ) {
    notices.push({
      kind: "export-all-page",
      appearance: "one-page",
      message:
        labels.noticeExportAllPage ??
        "Export all is this page — the full filtered set is not available.",
    });
  }

  const editMissingWriter =
    (input.hasEditableColumn && input.onCellEdit === undefined) ||
    (input.rowEditing === true && input.onRowEdit === undefined) ||
    (input.batchEditing === true && input.onBatchEdit === undefined);
  if (editMissingWriter) {
    notices.push({
      kind: "edit-without-writer",
      appearance: "off",
      message:
        labels.noticeEditWithoutWriter ??
        "Editing is off — no write handler is wired.",
    });
  }

  return notices;
}
