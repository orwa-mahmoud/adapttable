/** A column header's rename button and form, drawn with Mantine's controls. */
import {
  createColumnHeaderRename,
  type KitHeaderRenameLook,
  type KitIconButtonProps,
} from "@adapttable/react/adapter";
import { ActionIcon } from "@mantine/core";

import { Button, RenameField } from "./ColumnMenu";
import { Text, TextInput } from "./primitives";

/** The rename button: quiet, small, in the theme colour. */
function IconButton({
  elementRef,
  variant: _variant,
  tone: _tone,
  fullWidth: _fullWidth,
  justify: _justify,
  busy: _busy,
  ...rest
}: Readonly<KitIconButtonProps>) {
  "use no memo";
  return (
    <ActionIcon
      ref={elementRef}
      type="button"
      size="xs"
      variant="subtle"
      {...rest}
    />
  );
}

const GAP = 4;

const LOOK: KitHeaderRenameLook = {
  root: {
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: GAP,
  },
  form: { minWidth: 180 },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: GAP,
    marginTop: GAP,
  },
};

const useLook = (): KitHeaderRenameLook => LOOK;

export const ColumnHeaderRename = /* @__PURE__ */ createColumnHeaderRename(
  {
    Button,
    IconButton,
    TextInput,
    Text,
    RenameField,
    editIcon: <span aria-hidden>✎</span>,
  },
  useLook
);
