/** A column header's rename button and form, drawn with native controls. */
import {
  createColumnHeaderRename,
  type KitHeaderRenameLook,
} from "@adapttable/react/adapter";

import { usePartClass } from "./classNamesContext";
import {
  Button,
  IconButton,
  RenameField,
  Text,
  TextInput,
} from "./partPrimitives";

const LOOK: KitHeaderRenameLook = {
  // The button, the caption and the announcer sit in the header's own flow,
  // the button first.
  root: { display: "contents" },
  form: { display: "inline-flex", alignItems: "center", gap: 4 },
  actions: { display: "contents" },
  buttonFirst: true,
};

const useLook = (): KitHeaderRenameLook => LOOK;

/** Native direct-header column rename controls, loaded by `columnMenu()`. */
export const ColumnHeaderRename = /* @__PURE__ */ createColumnHeaderRename(
  {
    Button,
    IconButton,
    TextInput,
    Text,
    RenameField,
    usePartClass,
    editIcon: <span aria-hidden>✎</span>,
  },
  useLook
);
