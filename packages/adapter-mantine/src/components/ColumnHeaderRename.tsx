import {
  type ColumnHeaderRenameSlotProps,
  type ColumnRenameEditorState,
  LiveRegion,
  useColumnRenameEditor,
} from "@adapttable/core/adapter";
import { ActionIcon, Box, Button, Group, TextInput } from "@mantine/core";
import type { ReactElement } from "react";
import { useEffect, useRef } from "react";

function RenameForm({
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
    <Box
      component="form"
      data-adapttable-part="header-rename-form"
      miw={180}
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <TextInput
        ref={inputRef}
        id={rename.inputId}
        size="xs"
        label={labels.columnName}
        labelProps={{
          "data-adapttable-part": "header-rename-label",
        }}
        value={rename.draft}
        error={rename.error}
        errorProps={{
          id: rename.errorId,
          role: "alert",
          "data-adapttable-part": "header-rename-error",
        }}
        data-adapttable-part="header-rename-input"
        aria-invalid={rename.error ? "true" : undefined}
        aria-describedby={rename.error ? rename.errorId : undefined}
        onChange={(event) => rename.setDraft(event.currentTarget.value)}
        onBlur={rename.blur}
        onKeyDown={rename.onKeyDown}
      />
      <Group gap={4} mt={4}>
        <Button
          type="submit"
          size="xs"
          data-adapttable-part="header-rename-save"
        >
          {labels.saveColumnName}
        </Button>
        <Button
          type="button"
          variant="subtle"
          size="xs"
          data-adapttable-part="header-rename-cancel"
          onClick={rename.cancel}
        >
          {labels.cancelColumnRename}
        </Button>
      </Group>
    </Box>
  );
}

export function ColumnHeaderRename({
  columnKey,
  name,
  labels,
  onRenameColumn,
  children,
}: Readonly<ColumnHeaderRenameSlotProps>): ReactElement {
  const rename = useColumnRenameEditor({
    key: columnKey,
    name,
    onRename: onRenameColumn,
    requiredMessage: labels.columnNameRequired,
    renamedMessage: labels.columnRenamed,
  });
  return (
    <Group gap={4} wrap="nowrap" display="inline-flex">
      {rename.editing ? (
        <RenameForm rename={rename} labels={labels} />
      ) : (
        children
      )}
      <ActionIcon
        variant="subtle"
        size="xs"
        aria-label={`${labels.renameColumn}: ${name}`}
        data-adapttable-part="header-rename-button"
        disabled={rename.editing}
        onClick={rename.begin}
      >
        <span aria-hidden>✎</span>
      </ActionIcon>
      <LiveRegion part="header-rename-announcer" statusRole={false}>
        {rename.announcement}
      </LiveRegion>
    </Group>
  );
}
