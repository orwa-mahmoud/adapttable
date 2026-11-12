/** A column header's rename button and form, drawn with MUI's primitives. */
import {
  createColumnHeaderRename,
  type KitHeaderRenameLook,
} from "@adapttable/react/adapter";

import { Button, IconButton, Text, TextInput } from "./primitives";

/** MUI's half spacing step between the header's controls. */
const STEP = 4;

const LOOK: KitHeaderRenameLook = {
  root: { display: "inline-flex", alignItems: "center", gap: STEP },
  form: { display: "inline-grid", gap: STEP, minWidth: 180 },
  actions: { display: "flex", gap: STEP },
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
