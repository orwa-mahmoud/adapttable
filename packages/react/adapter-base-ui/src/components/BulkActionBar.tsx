/** The bulk action bar, decided by the binding and drawn with Base UI. */
import {
  createBulkBar,
  type KitBulkBarFrameProps,
  type KitBulkButtonProps,
  type KitBulkTextProps,
} from "@adapttable/react/adapter";
import { isValidElement } from "react";

import { Button as UiButton, Flex, Text as UiText } from "../ui";
import { Tooltip } from "./primitives";

function Frame({
  count,
  scope,
  clear,
  actions,
  error,
  ...rest
}: Readonly<KitBulkBarFrameProps>) {
  "use no memo";
  return (
    <Flex gap="2" justify="between" wrap="wrap" align="center" {...rest}>
      {scope ? (
        <Flex gap="2" wrap="wrap" align="center" {...scope.attributes}>
          {scope.text}
          {scope.button}
        </Flex>
      ) : (
        count
      )}
      <Flex gap="2" wrap="wrap" align="center">
        {clear}
        {actions}
        {error}
      </Flex>
    </Flex>
  );
}

function Text({ kind, ...rest }: Readonly<KitBulkTextProps>) {
  "use no memo";
  return (
    <UiText size="2" color={kind === "error" ? "red" : undefined} {...rest} />
  );
}

function Button({
  kind,
  busy: _busy,
  icon,
  color,
  reason,
  children,
  ...rest
}: Readonly<KitBulkButtonProps>) {
  "use no memo";
  if (kind !== "action") {
    return (
      <UiButton
        size="1"
        variant="ghost"
        color={kind === "clear" ? "gray" : undefined}
        {...rest}
      >
        {children}
      </UiButton>
    );
  }
  return (
    <Tooltip label={reason ?? ""} disabled={!reason}>
      <UiButton size="1" color={color} {...rest}>
        {isValidElement(icon) ? icon : null}
        {children}
      </UiButton>
    </Tooltip>
  );
}

/** The bulk action bar, with Base UI's text and buttons. */
export const BulkBar = /* @__PURE__ */ createBulkBar({ Frame, Text, Button });
