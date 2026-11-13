/** A column header's rename button and form, drawn with antd's controls. */
import {
  createColumnHeaderRename,
  type KitButtonProps,
  type KitHeaderRenameLook,
  type KitIconButtonProps,
} from "@adapttable/react/adapter";
import type { SyntheticEvent } from "react";

import {
  Button as MenuButton,
  IconButton as MenuIconButton,
  renameFieldOf,
} from "./ColumnMenu";
import { Text, TextInput } from "./kitPrimitives";

/**
 * antd's table sorts on a click in its header cell and moves focus on its
 * keys, so a control in the cell keeps its events to itself.
 */
const contain = (event: SyntheticEvent): void => {
  event.stopPropagation();
};

function Button({ onClick, ...rest }: Readonly<KitButtonProps>) {
  "use no memo";
  return (
    <MenuButton
      {...rest}
      onClick={(event) => {
        contain(event);
        onClick?.(event);
      }}
      onKeyDown={contain}
    />
  );
}

function IconButton({ onClick, ...rest }: Readonly<KitIconButtonProps>) {
  "use no memo";
  return (
    <MenuIconButton
      {...rest}
      onClick={(event) => {
        contain(event);
        onClick?.(event);
      }}
      onKeyDown={contain}
    />
  );
}

const LOOK: KitHeaderRenameLook = {
  root: { display: "inline-flex", alignItems: "center", gap: 4 },
  form: { minWidth: 180 },
  actions: { display: "flex", gap: 4, marginTop: 4 },
};

const useLook = (): KitHeaderRenameLook => LOOK;

export const ColumnHeaderRename = /* @__PURE__ */ createColumnHeaderRename(
  {
    Button,
    IconButton,
    TextInput,
    Text,
    RenameField: renameFieldOf(true),
    editIcon: <span aria-hidden>✎</span>,
  },
  useLook
);
