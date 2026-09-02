import {
  type ColumnHeaderRenameSlotProps,
  type ColumnRenameEditorState,
  LiveRegion,
  useColumnRenameEditor,
} from "@adapttable/core/adapter";
import { Button, Flex, Input, theme } from "antd";
import type { ComponentRef, ReactElement } from "react";
import { useEffect, useRef } from "react";

function RenameForm({
  rename,
  labels,
}: Readonly<{
  rename: ColumnRenameEditorState;
  labels: ColumnHeaderRenameSlotProps["labels"];
}>) {
  const inputRef = useRef<ComponentRef<typeof Input>>(null);
  const { token } = theme.useToken();
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      data-adapttable-part="header-rename-form"
      style={{ minWidth: 180 }}
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <span
        data-adapttable-part="header-rename-label"
        style={{ display: "block", fontSize: 12, marginBottom: 4 }}
      >
        {labels.columnName}
      </span>
      <Input
        ref={inputRef}
        id={rename.inputId}
        size="small"
        value={rename.draft}
        aria-label={labels.columnName}
        aria-invalid={rename.error ? true : undefined}
        aria-describedby={rename.error ? rename.errorId : undefined}
        data-adapttable-part="header-rename-input"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => rename.setDraft(event.target.value)}
        onBlur={rename.blur}
        onKeyDown={(event) => {
          event.stopPropagation();
          rename.onKeyDown(event);
        }}
      />
      {rename.error ? (
        <div
          id={rename.errorId}
          role="alert"
          data-adapttable-part="header-rename-error"
          style={{ color: token.colorError, fontSize: 12, marginTop: 4 }}
        >
          {rename.error}
        </div>
      ) : null}
      <Flex gap={4} style={{ marginTop: 4 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="small"
          data-adapttable-part="header-rename-save"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {labels.saveColumnName}
        </Button>
        <Button
          htmlType="button"
          type="text"
          size="small"
          data-adapttable-part="header-rename-cancel"
          onClick={(event) => {
            event.stopPropagation();
            rename.cancel();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {labels.cancelColumnRename}
        </Button>
      </Flex>
    </form>
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {rename.editing ? (
        <RenameForm rename={rename} labels={labels} />
      ) : (
        children
      )}
      <Button
        type="text"
        size="small"
        aria-label={`${labels.renameColumn}: ${name}`}
        data-adapttable-part="header-rename-button"
        disabled={rename.editing}
        onClick={(event) => {
          event.stopPropagation();
          rename.begin();
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <span aria-hidden>✎</span>
      </Button>
      <LiveRegion part="header-rename-announcer" statusRole={false}>
        {rename.announcement}
      </LiveRegion>
    </span>
  );
}
