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

/** Which opted-in feature is inert. */
export type FeatureNoticeKind =
  | "virtualize-paged"
  | "pin-nested"
  | "reorder-nested"
  | "grouping-unavailable"
  | "export-all-page"
  | "edit-without-writer";

/** How the table already looks to the person sitting at it. */
export type FeatureNoticeAppearance = "off" | "disabled" | "one-page";

/** One inert feature, ready for a status slot or a root attribute. */
export interface FeatureNotice {
  readonly kind: FeatureNoticeKind;
  readonly appearance: FeatureNoticeAppearance;
  readonly message: string;
}

/** Inputs {@link collectFeatureNotices} needs. Host props + source facts. */
export interface CollectFeatureNoticesInput<TRow = unknown> {
  virtualize?: boolean;
  paginationMode?: TableSource<TRow>["paginationMode"];
  groupByKeys: readonly string[];
  allFilteredRows?: readonly TRow[];
  serverGroups?: unknown;
  rowPinningRequested: boolean;
  rowReorderRequested: boolean;
  /** Grouping is armed or a tree is on — pin and reorder stay off. */
  nestedArmed: boolean;
  hasEditableColumn: boolean;
  onCellEdit?: unknown;
  rowEditing?: boolean;
  onRowEdit?: unknown;
  batchEditing?: boolean;
  onBatchEdit?: unknown;
  exportCsv?: boolean | ExportCsvOptions<TRow>;
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
