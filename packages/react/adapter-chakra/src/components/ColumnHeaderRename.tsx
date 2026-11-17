/** A column header's rename button and form, drawn with Chakra's controls. */
import {
  createColumnHeaderRename,
  type KitHeaderRenameLook,
  type KitRenameFieldProps,
} from "@adapttable/react/adapter";
import { Field, Input, Text as ChakraText } from "@chakra-ui/react";
import type { ReactElement } from "react";

import { EditRowIcon } from "../icons";
import { Button } from "./ColumnMenu";
import { IconButton, Text, TextInput } from "./kitPrimitives";

/** The header's field: label, input and error in one compact row. */
function RenameField({
  id,
  elementRef,
  label,
  value,
  error,
  errorId,
  parts,
  onValueChange,
  onBlur,
  onKeyDown,
}: Readonly<KitRenameFieldProps>): ReactElement {
  "use no memo";
  return (
    <Field.Root
      invalid={error !== undefined}
      display="inline-flex"
      flexDirection="row"
      alignItems="center"
      flexWrap="wrap"
      gap={1}
      width="auto"
    >
      <Field.Label
        htmlFor={id}
        data-adapttable-part={parts.label}
        fontSize="xs"
        mb={0}
      >
        {label}
      </Field.Label>
      <Input
        ref={elementRef}
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-adapttable-part={parts.input}
        size="xs"
        width="8rem"
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {error ? (
        <ChakraText
          id={errorId}
          role="alert"
          data-adapttable-part={parts.error}
          color="red.500"
          fontSize="xs"
        >
          {error}
        </ChakraText>
      ) : null}
    </Field.Root>
  );
}

/** Chakra's step of 4 px between the header's controls. */
const STEP = 4;

const ROW = {
  display: "inline-flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: STEP,
} as const;

const LOOK: KitHeaderRenameLook = {
  // The caption, the button and the announcer sit in the header's own row.
  root: { display: "contents" },
  form: ROW,
  actions: ROW,
};

const useLook = (): KitHeaderRenameLook => LOOK;

export const ColumnHeaderRename = /* @__PURE__ */ createColumnHeaderRename(
  {
    Button,
    IconButton,
    TextInput,
    Text,
    RenameField,
    editIcon: <EditRowIcon />,
  },
  useLook
);
