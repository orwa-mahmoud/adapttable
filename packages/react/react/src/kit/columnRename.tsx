/**
 * Renaming a column, built once from a kit's primitives: the rename form the
 * Columns menu and the column header both open, and the header's own rename
 * button.
 *
 * Core's rename editor owns the draft, validation, Enter and Escape and the
 * announcement; this file lays the form out and names its parts.
 */
import type { ColumnMenuLabels } from "@adapttable/core";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useEffect,
  useRef,
} from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import {
  type ColumnRenameEditorState,
  useColumnRenameEditor,
} from "../columns/useColumnRenameEditor";
import type { ColumnHeaderRenameSlotProps } from "../features/slotKeys";
import type { KitPrimitivesOf } from "./primitives";

/**
 * The parts of a rename form's field.
 *
 * @public
 */
export interface KitRenameFieldParts {
  /** The visible label. */
  readonly label: string;
  /** The text input. */
  readonly input: string;
  /** The error message. */
  readonly error: string;
}

/**
 * A labelled text field that shows its own error: the rename form's field,
 * for a kit whose text input carries its label and error itself.
 *
 * @public
 */
export interface KitRenameFieldProps {
  /** The input's id, which the label names. */
  readonly id: string;
  /** The input element, focused when the form opens. */
  readonly elementRef: Ref<HTMLInputElement>;
  /** The visible label. */
  readonly label: string;
  /** The draft name. */
  readonly value: string;
  /** Why the draft is rejected; absent while it is valid. */
  readonly error: string | undefined;
  /** The error message's id, for `aria-describedby`. */
  readonly errorId: string;
  /** The parts the label, input and error carry. */
  readonly parts: KitRenameFieldParts;
  /** The draft changed. */
  readonly onValueChange: (value: string) => void;
  /** The input lost focus. */
  readonly onBlur: () => void;
  /** Enter saves and Escape cancels. */
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** What a rename form draws with. */
type RenameFormKit = KitPrimitivesOf<"Button" | "TextInput" | "Text"> & {
  /** The kit's own rename field; absent, the label, input and error are drawn apart. */
  readonly RenameField?: (props: KitRenameFieldProps) => ReactElement;
};

/** The parts of a rename form, by where it opens. */
const RENAME_PARTS = {
  menu: {
    form: "column-rename-form",
    label: "column-rename-label",
    input: "column-rename-input",
    error: "column-rename-error",
    save: "column-rename-save",
    cancel: "column-rename-cancel",
  },
  header: {
    form: "header-rename-form",
    label: "header-rename-label",
    input: "header-rename-input",
    error: "header-rename-error",
    save: "header-rename-save",
    cancel: "header-rename-cancel",
  },
} as const;

/** Where a rename form opens: the Columns menu or the column header. */
export type RenamePlace = keyof typeof RENAME_PARTS;

/**
 * The rename form: the field, then save and cancel.
 *
 * @internal
 */
export function RenameForm({
  kit,
  place,
  labels,
  rename,
  formStyle,
  actionsStyle,
}: Readonly<{
  kit: RenameFormKit;
  place: RenamePlace;
  labels: ColumnMenuLabels;
  rename: ColumnRenameEditorState;
  formStyle: CSSProperties;
  actionsStyle: CSSProperties;
}>): ReactElement {
  // Drawn fresh with its row: the compiler's cache would outweigh it.
  "use no memo";
  const { Button, TextInput, Text, RenameField } = kit;
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const invalid = rename.error !== undefined;
  const parts = RENAME_PARTS[place];
  // Enter saves from the field itself, so key handling around the form (a
  // header cell's, a grid's) cannot swallow the implicit submit.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    rename.onKeyDown(event);
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    rename.submit();
  };
  return (
    <form
      data-adapttable-part={parts.form}
      style={formStyle}
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      {RenameField ? (
        <RenameField
          id={rename.inputId}
          elementRef={inputRef}
          label={labels.columnName}
          value={rename.draft}
          error={rename.error}
          errorId={rename.errorId}
          parts={parts}
          onValueChange={rename.setDraft}
          onBlur={rename.blur}
          onKeyDown={onKeyDown}
        />
      ) : (
        <>
          <Text
            as="label"
            variant="caption"
            htmlFor={rename.inputId}
            data-adapttable-part={parts.label}
          >
            {labels.columnName}
          </Text>
          <TextInput
            id={rename.inputId}
            elementRef={inputRef}
            fullWidth
            aria-label={labels.columnName}
            value={rename.draft}
            invalid={invalid}
            data-adapttable-part={parts.input}
            aria-invalid={invalid ? "true" : undefined}
            aria-describedby={invalid ? rename.errorId : undefined}
            onValueChange={rename.setDraft}
            onBlur={rename.blur}
            onKeyDown={onKeyDown}
          />
          {invalid ? (
            <Text
              id={rename.errorId}
              variant="caption"
              tone="danger"
              role="alert"
              data-adapttable-part={parts.error}
            >
              {rename.error}
            </Text>
          ) : null}
        </>
      )}
      <div style={actionsStyle}>
        <Button
          type="submit"
          variant="filled"
          data-adapttable-part={parts.save}
        >
          {labels.saveColumnName}
        </Button>
        <Button data-adapttable-part={parts.cancel} onClick={rename.cancel}>
          {labels.cancelColumnRename}
        </Button>
      </div>
    </form>
  );
}

/**
 * The spacing of a column header's rename control.
 *
 * @public
 */
export interface KitHeaderRenameLook {
  /** What holds the caption (or the form), the button and the announcer. */
  readonly root: CSSProperties;
  /** The rename form. */
  readonly form: CSSProperties;
  /** The form's save and cancel buttons. */
  readonly actions: CSSProperties;
  /** Whether the rename button comes before the caption. Absent, after it. */
  readonly buttonFirst?: boolean;
}

/**
 * Build a column header's rename control: a button beside the caption that
 * swaps the caption for the rename form, and the announcer that says the
 * column was renamed.
 *
 * @param kit - The kit's primitives, its own `RenameField` where its text
 *   input draws the label and the error itself, and the button's icon.
 * @param useLook - The kit's spacing; called as a hook.
 * @returns The header rename control.
 *
 * @public
 */
export function createColumnHeaderRename(
  kit: KitPrimitivesOf<"Button" | "IconButton" | "TextInput" | "Text"> & {
    /** The kit's own rename field; absent, the label, input and error are drawn apart. */
    readonly RenameField?: (props: KitRenameFieldProps) => ReactElement;
    /** The rename button's glyph. */
    readonly editIcon: ReactNode;
  },
  useLook: () => KitHeaderRenameLook
): (props: Readonly<ColumnHeaderRenameSlotProps>) => ReactElement {
  const { IconButton } = kit;
  return function ColumnHeaderRename({
    columnKey,
    name,
    labels,
    onRenameColumn,
    children,
  }: Readonly<ColumnHeaderRenameSlotProps>): ReactElement {
    const look = useLook();
    const rename = useColumnRenameEditor({
      key: columnKey,
      name,
      onRename: onRenameColumn,
      requiredMessage: labels.columnNameRequired,
      renamedMessage: labels.columnRenamed,
    });
    const button = (
      <IconButton
        aria-label={`${labels.renameColumn}: ${name}`}
        data-adapttable-part="header-rename-button"
        disabled={rename.editing}
        onClick={rename.begin}
      >
        {kit.editIcon}
      </IconButton>
    );
    return (
      <div style={look.root}>
        {look.buttonFirst ? button : null}
        {rename.editing ? (
          <RenameForm
            kit={kit}
            place="header"
            labels={labels}
            rename={rename}
            formStyle={look.form}
            actionsStyle={look.actions}
          />
        ) : (
          children
        )}
        {look.buttonFirst ? null : button}
        <LiveRegion part="header-rename-announcer" statusRole={false}>
          {rename.announcement}
        </LiveRegion>
      </div>
    );
  };
}
