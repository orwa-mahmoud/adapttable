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
 * @returns The bulk actions.
 */
export function peopleBulkActions(dataLocale: "ar" | "en"): BulkAction[] {
  const t = BULK_TEXT[dataLocale];
  return [
    {
      key: "export",
      label: t.export,
      onClick: (ids) =>
        notifyDemo({ message: `${t.export}: ${String(ids.length)}` }),
    },
    {
      key: "archive",
      label: t.archive,
      onClick: (ids) =>
        notifyDemo({
          message: `${t.archive}: ${String(ids.length)}`,
          tone: "danger",
        }),
    },
  ];
}
