/**
 * Which control opens a row's form.
 *
 * Row-mode editing ships its own "Edit row" button, and an app with a pencil
 * already in its actions column does not want a second one beside it. An
 * action carrying `editsRow` claims that trigger. The rule lives in
 * `@adapttable/core` (`resolveRowEditTrigger`), as does the row's
 * incoming-change question (`rowEditConflict`).
 */
export { type RowEditTrigger } from "@adapttable/core";
export {
  resolveRowEditTrigger,
  rowEditConflict,
} from "@adapttable/core/editing";
