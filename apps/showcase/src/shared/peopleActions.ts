/**
 * The people table's row and bulk actions, written once for React, Vue and
 * Angular: Edit opens the row's own fields, Delete asks first and removes
 * the row, and the selection toolbar offers Export and Archive. A framework
 * adds its icons; every action reports what it did as a demo notice.
 */
import type { BulkAction, RowAction } from "@adapttable/core";

import { type Person, strings } from "../people";
import { notifyDemo } from "./demoNotice";

/** What the row actions change: the host owns the rows. */
export interface PeopleRowHandlers {
  /** Remove the row from the data. */
  readonly onDelete: (row: Person) => void;
}

/** What the bulk actions change: the host owns the rows. */
export interface PeopleBulkHandlers {
  /** Mark the rows with these ids as archived. */
  readonly onArchive: (ids: readonly string[]) => void;
}

/** How many ids a notice names before it counts the rest. */
const NOTICE_ID_LIMIT = 10;

/**
 * The ids an action received, as a notice names them.
 *
 * @param ids - The selected row ids, in selection order.
 * @returns `"501, 503"`, or the first ten and `"+N"` for the rest.
 */
export function noticeIds(ids: readonly string[]): string {
  const named = ids.slice(0, NOTICE_ID_LIMIT).join(", ");
  const rest = ids.length - NOTICE_ID_LIMIT;
  return rest > 0 ? `${named} +${String(rest)}` : named;
}

/**
 * The rows with these ids marked archived; every other row is returned as is.
 *
 * @param rows - The host's rows.
 * @param ids - The ids to archive.
 * @returns The next rows.
 */
export function archivePeople<Row extends Person>(
  rows: readonly Row[],
  ids: readonly string[]
): Row[] {
  const archived = new Set(ids);
  return rows.map((row) =>
    archived.has(row.id) ? { ...row, status: "Archived" } : row
  );
}

/**
 * Edit and Delete, the actions on every row of the pages that show them.
 *
 * @param dataLocale - The language of the labels and the confirm copy.
 * @param handlers - The host's writes; without them Delete only reports.
 * @returns The row actions, without icons.
 */
export function peopleRowActions(
  dataLocale: "ar" | "en",
  handlers?: PeopleRowHandlers
): RowAction<Person>[] {
  const s = strings(dataLocale);
  return [
    {
      key: "edit",
      label: s.edit,
      // The pencil opens the row's own fields rather than writing anything of
      // its own, so the table's built-in "Edit row" control stands down and
      // save and cancel come from the open row. Where a table has no row form
      // the action does not render at all.
      editsRow: true,
    },
    {
      key: "delete",
      label: s.remove,
      color: "red",
      confirm: {
        title: s.confirmTitle,
        message: (row) => s.confirmMessage(row.name),
        confirmLabel: s.remove,
        danger: true,
      },
      onClick: (row) => {
        handlers?.onDelete(row);
        notifyDemo({ message: `${s.remove}: ${row.name}`, tone: "danger" });
      },
      ai: { approval: { policy: "required" } },
    },
  ];
}

const BULK_TEXT = {
  en: { export: "Export", archive: "Archive" },
  ar: { export: "تصدير", archive: "أرشفة" },
} as const;

/**
 * Export and Archive over the selected rows; passing them turns on row
 * selection and the bulk bar.
 *
 * @param dataLocale - The language of the labels.
 * @param handlers - The host's writes; without them Archive only reports.
 * @returns The bulk actions; each notice names the ids it received.
 */
export function peopleBulkActions(
  dataLocale: "ar" | "en",
  handlers?: PeopleBulkHandlers
): BulkAction[] {
  const t = BULK_TEXT[dataLocale];
  return [
    {
      key: "export",
      label: t.export,
      onClick: (ids) =>
        notifyDemo({ message: `${t.export}: ${noticeIds(ids)}` }),
    },
    {
      key: "archive",
      label: t.archive,
      onClick: (ids) => {
        handlers?.onArchive(ids);
        notifyDemo({
          message: `${t.archive}: ${noticeIds(ids)}`,
          tone: "danger",
        });
      },
    },
  ];
}
