/** A column header's rename button and form, drawn with Base UI's controls. */
import {
  createColumnHeaderRename,
  type KitHeaderRenameLook,
  type KitIconButtonProps,
} from "@adapttable/react/adapter";

import { Button as UiButton } from "../ui";
import { Button } from "./ColumnMenu";
import { Text, TextInput } from "./kitPrimitives";

/** The rename button: a quiet grey compact button holding the glyph. */
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
    <UiButton
      ref={elementRef}
      type="button"
      size="1"
      variant="ghost"
      color="gray"
      {...rest}
    />
  );
}

const ROW = { display: "inline-flex", alignItems: "center", gap: 4 } as const;

const LOOK: KitHeaderRenameLook = {
  // The button, the caption and the announcer sit in the header's own flow,
  // the button first.
  root: { display: "contents" },
  form: ROW,
  actions: { display: "flex", gap: "0.25rem" },
  buttonFirst: true,
};

const useLook = (): KitHeaderRenameLook => LOOK;

export const ColumnHeaderRename = /* @__PURE__ */ createColumnHeaderRename(
  {
    Button,
    IconButton,
    TextInput,
    Text,
    editIcon: <span aria-hidden>✎</span>,
  },
  useLook
);
