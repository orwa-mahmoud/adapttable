/** The bulk action bar, decided by the binding and drawn with Chakra. */
import {
  createBulkBar,
  type KitBulkBarFrameProps,
  type KitBulkButtonProps,
  type KitBulkTextProps,
} from "@adapttable/react/adapter";
import {
  Button as ChakraButton,
  HStack,
  Text as ChakraText,
} from "@chakra-ui/react";
import { isValidElement } from "react";

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
    <HStack gap={2} justify="space-between" flexWrap="wrap" {...rest}>
      {scope ? (
        <HStack gap={2} flexWrap="wrap" {...scope.attributes}>
          {scope.text}
          {scope.button}
        </HStack>
      ) : (
        count
      )}
      <HStack gap={2} flexWrap="wrap">
        {clear}
        {actions}
        {error}
      </HStack>
    </HStack>
  );
}

function Text({ kind, ...rest }: Readonly<KitBulkTextProps>) {
  "use no memo";
  return (
    <ChakraText
      fontSize="sm"
      color={kind === "error" ? "red.500" : undefined}
      {...rest}
    />
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
      <ChakraButton
        size="xs"
        variant={kind === "clear" ? "ghost" : "plain"}
        {...rest}
      >
        {children}
      </ChakraButton>
    );
  }
  return (
    <Tooltip label={reason ?? ""} disabled={!reason}>
      <ChakraButton size="xs" colorPalette={color} {...rest}>
        {isValidElement(icon) ? icon : null}
        {children}
      </ChakraButton>
    </Tooltip>
  );
}

/** The bulk action bar, with Chakra's text and buttons. */
export const BulkBar = /* @__PURE__ */ createBulkBar({ Frame, Text, Button });
