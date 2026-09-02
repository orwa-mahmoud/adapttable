import {
  type ColumnHeaderRenameSlotProps,
  type ColumnRenameEditorState,
  LiveRegion,
  useColumnRenameEditor,
} from "@adapttable/core/adapter";
import { Button, Field, Input, Text } from "@chakra-ui/react";
import { type PropsWithChildren, useEffect, useRef } from "react";

function HeaderRenameForm({
  rename,
  labels,
}: Readonly<{
  rename: ColumnRenameEditorState;
  labels: ColumnHeaderRenameSlotProps["labels"];
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      data-adapttable-part="header-rename-form"
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <Field.Root
        invalid={Boolean(rename.error)}
        display="inline-flex"
        flexDirection="row"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Field.Label
          htmlFor={rename.inputId}
          data-adapttable-part="header-rename-label"
          fontSize="xs"
          mb={0}
        >
          {labels.columnName}
        </Field.Label>
        <Input
          ref={inputRef}
          id={rename.inputId}
          value={rename.draft}
          aria-invalid={rename.error ? true : undefined}
          aria-describedby={rename.error ? rename.errorId : undefined}
          data-adapttable-part="header-rename-input"
          size="xs"
          width="8rem"
          onChange={(event) => rename.setDraft(event.target.value)}
          onBlur={rename.blur}
          onKeyDown={rename.onKeyDown}
        />
        {rename.error ? (
          <Text
            id={rename.errorId}
            role="alert"
            data-adapttable-part="header-rename-error"
            color="red.500"
            fontSize="xs"
          >
            {rename.error}
          </Text>
        ) : null}
        <Button
          type="submit"
          size="xs"
          colorPalette="teal"
          data-adapttable-part="header-rename-save"
        >
          {labels.saveColumnName}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          data-adapttable-part="header-rename-cancel"
          onClick={rename.cancel}
        >
          {labels.cancelColumnRename}
        </Button>
      </Field.Root>
    </form>
  );
}

export function ColumnHeaderRename({
  columnKey,
  name,
  labels,
  onRenameColumn,
  children,
}: Readonly<PropsWithChildren<ColumnHeaderRenameSlotProps>>) {
  const rename = useColumnRenameEditor({
    key: columnKey,
    name,
    onRename: onRenameColumn,
    requiredMessage: labels.columnNameRequired,
    renamedMessage: labels.columnRenamed,
  });
  return (
    <>
      {rename.editing ? (
        <HeaderRenameForm rename={rename} labels={labels} />
      ) : (
        children
      )}
      <Button
        type="button"
        size="xs"
        variant="ghost"
        aria-label={`${labels.renameColumn}: ${name}`}
        data-adapttable-part="header-rename-button"
        disabled={rename.editing}
        onClick={rename.begin}
      >
        {labels.renameColumn}
      </Button>
      <LiveRegion part="header-rename-announcer" statusRole={false}>
        {rename.announcement}
      </LiveRegion>
    </>
  );
}
