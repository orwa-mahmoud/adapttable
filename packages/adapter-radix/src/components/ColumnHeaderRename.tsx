import {
  type ColumnHeaderRenameSlotProps,
  LiveRegion,
  useColumnRenameEditor,
} from "@adapttable/core/adapter";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import type { ReactNode } from "react";

function focusRenameInput(input: HTMLInputElement | null): void {
  input?.focus();
}

/** Radix Themes direct-header column rename controls, loaded by `columnMenu()`. */
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
          <Text
            as="label"
            htmlFor={editor.inputId}
            size="1"
            data-adapttable-part="header-rename-label"
          >
            {labels.columnName}
          </Text>
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
            <Text
              id={editor.errorId}
              role="alert"
              size="1"
              color="red"
              data-adapttable-part="header-rename-error"
            >
              {editor.error}
            </Text>
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
