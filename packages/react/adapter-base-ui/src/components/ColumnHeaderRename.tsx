import {
  type ColumnHeaderRenameSlotProps,
  LiveRegion,
  useColumnRenameEditor,
} from "@adapttable/react/adapter";
import type { ReactNode } from "react";

import { Button, Flex, TextField } from "../ui";

function focusRenameInput(input: HTMLInputElement | null): void {
  input?.focus();
}

/** Base UI direct-header column rename controls, loaded by `columnMenu()`. */
export function ColumnHeaderRename({
  columnKey,
  name,
  labels,
  onRenameColumn,
  children,
}: Readonly<ColumnHeaderRenameSlotProps & { children?: ReactNode }>) {
  const editor = useColumnRenameEditor({
    key: columnKey,
    name,
    onRename: onRenameColumn,
    requiredMessage: labels.columnNameRequired,
    renamedMessage: labels.columnRenamed,
  });
  return (
    <>
      <Button
        type="button"
        size="1"
        variant="ghost"
        color="gray"
        aria-label={`${labels.renameColumn}: ${name}`}
        data-adapttable-part="header-rename-button"
        disabled={editor.editing}
        onClick={editor.begin}
      >
        <span aria-hidden>✎</span>
      </Button>
      {editor.editing ? (
        <form
          data-adapttable-part="header-rename-form"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          onSubmit={(event) => {
            event.preventDefault();
            editor.submit();
          }}
        >
          <label
            htmlFor={editor.inputId}
            className="adapttable-text"
            data-size="1"
            data-adapttable-part="header-rename-label"
          >
            {labels.columnName}
          </label>
          <TextField.Root
            ref={focusRenameInput}
            id={editor.inputId}
            size="1"
            value={editor.draft}
            aria-invalid={editor.error ? true : undefined}
            aria-describedby={editor.error ? editor.errorId : undefined}
            data-adapttable-part="header-rename-input"
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
              className="adapttable-text"
              data-size="1"
              data-color="red"
              data-adapttable-part="header-rename-error"
            >
              {editor.error}
            </span>
          ) : null}
          <Flex gap="1">
            <Button
              type="submit"
              size="1"
              data-adapttable-part="header-rename-save"
            >
              {labels.saveColumnName}
            </Button>
            <Button
              type="button"
              size="1"
              variant="soft"
              color="gray"
              data-adapttable-part="header-rename-cancel"
              onClick={editor.cancel}
            >
              {labels.cancelColumnRename}
            </Button>
          </Flex>
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
