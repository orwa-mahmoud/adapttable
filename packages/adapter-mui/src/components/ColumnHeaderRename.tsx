import {
  type ColumnHeaderRenameSlotProps,
  type ColumnRenameEditorState,
  LiveRegion,
  useColumnRenameEditor,
} from "@adapttable/react/adapter";
import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
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
      sx={{ display: "inline-grid", gap: 0.5, minWidth: 180 }}
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <Typography
        component="label"
        htmlFor={rename.inputId}
        variant="caption"
        data-adapttable-part="header-rename-label"
      >
        {labels.columnName}
      </Typography>
      <TextField
        id={rename.inputId}
        inputRef={inputRef}
        size="small"
        value={rename.draft}
        error={rename.error !== undefined}
        slotProps={{
          htmlInput: {
            "data-adapttable-part": "header-rename-input",
            "aria-invalid": rename.error ? "true" : undefined,
            "aria-describedby": rename.error ? rename.errorId : undefined,
          },
        }}
        onChange={(event) => rename.setDraft(event.target.value)}
        onBlur={rename.blur}
        onKeyDown={rename.onKeyDown}
      />
      {rename.error ? (
        <Typography
          id={rename.errorId}
          variant="caption"
          color="error"
          role="alert"
          data-adapttable-part="header-rename-error"
        >
          {rename.error}
        </Typography>
      ) : null}
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Button
          type="submit"
          size="small"
          variant="contained"
          data-adapttable-part="header-rename-save"
        >
          {labels.saveColumnName}
        </Button>
        <Button
          type="button"
          size="small"
          data-adapttable-part="header-rename-cancel"
          onClick={rename.cancel}
        >
          {labels.cancelColumnRename}
        </Button>
      </Box>
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
    <Box
      component="div"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
    >
      {rename.editing ? (
        <RenameForm rename={rename} labels={labels} />
      ) : (
        children
      )}
      <IconButton
        size="small"
        aria-label={`${labels.renameColumn}: ${name}`}
        data-adapttable-part="header-rename-button"
        disabled={rename.editing}
        onClick={rename.begin}
      >
        <span aria-hidden>✎</span>
      </IconButton>
      <LiveRegion part="header-rename-announcer" statusRole={false}>
        {rename.announcement}
      </LiveRegion>
    </Box>
  );
}
