import {
  type ColumnHeaderRenameSlotProps,
  LiveRegion,
  useColumnRenameEditor,
} from "@adapttable/core/adapter";

import { useClassNames } from "./classNamesContext";

function focusRenameInput(input: HTMLInputElement | null): void {
  input?.focus();
}

/** Native direct-header column rename controls, loaded by `columnMenu()`. */
export function ColumnHeaderRename({
  columnKey,
  name,
  labels,
  onRenameColumn,
  children,
}: Readonly<ColumnHeaderRenameSlotProps>) {
  const classNames = useClassNames();
  const editor = useColumnRenameEditor({
    key: columnKey,
    name,
    onRename: onRenameColumn,
    requiredMessage: labels.columnNameRequired,
    renamedMessage: labels.columnRenamed,
  });
  return (
    <>
      <button
        type="button"
        aria-label={`${labels.renameColumn}: ${name}`}
        data-adapttable-part="header-rename-button"
        className={classNames.headerRenameButton}
        disabled={editor.editing}
        onClick={editor.begin}
      >
        <span aria-hidden>✎</span>
      </button>
      {editor.editing ? (
        <form
          data-adapttable-part="header-rename-form"
          className={classNames.headerRenameForm}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          onSubmit={(event) => {
            event.preventDefault();
            editor.submit();
          }}
        >
          <label
            htmlFor={editor.inputId}
            data-adapttable-part="header-rename-label"
            className={classNames.headerRenameLabel}
          >
            {labels.columnName}
          </label>
          <input
            ref={focusRenameInput}
            id={editor.inputId}
            value={editor.draft}
            aria-invalid={editor.error ? true : undefined}
            aria-describedby={editor.error ? editor.errorId : undefined}
            data-adapttable-part="header-rename-input"
            className={classNames.headerRenameInput}
            onChange={(event) => editor.setDraft(event.currentTarget.value)}
            onBlur={editor.blur}
            onKeyDown={(event) => {
              editor.onKeyDown(event);
              if (event.key === "Enter") {
                event.preventDefault();
                editor.submit();
              }
            }}
          />
          {editor.error ? (
            <span
              id={editor.errorId}
              role="alert"
              data-adapttable-part="header-rename-error"
              className={classNames.headerRenameError}
            >
              {editor.error}
            </span>
          ) : null}
          <button
            type="submit"
            data-adapttable-part="header-rename-save"
            className={classNames.headerRenameSave}
          >
            {labels.saveColumnName}
          </button>
          <button
            type="button"
            data-adapttable-part="header-rename-cancel"
            className={classNames.headerRenameCancel}
            onClick={editor.cancel}
          >
            {labels.cancelColumnRename}
          </button>
        </form>
      ) : (
        children
      )}
      <LiveRegion part="header-rename-announcer" statusRole={false}>
        {editor.announcement}
      </LiveRegion>
    </>
  );
}
