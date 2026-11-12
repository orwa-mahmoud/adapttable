/** Group rows and cards, drawn by the binding with Chakra's elements. */
import {
  createGroupHeader,
  ExpandChevron,
  type KitGroupCardProps,
  type KitGroupLook,
  type KitGroupTextProps,
  type KitGroupToggleProps,
} from "@adapttable/react/adapter";
import {
  Card as ChakraCard,
  IconButton,
  Text as ChakraText,
} from "@chakra-ui/react";

import { subtleText } from "../styles";
import { Cell, Row } from "./DesktopTable";
import { GroupMoreButton } from "./kitControls";
import { Checkbox } from "./kitPrimitives";

function Toggle({ expanded, label, onToggle }: Readonly<KitGroupToggleProps>) {
  "use no memo";
  return (
    <IconButton
      size="xs"
      variant="ghost"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      onClick={onToggle}
    >
      <ExpandChevron open={expanded} />
    </IconButton>
  );
}

/** The props each group text adds: a muted count and caption, a subtotal at the end. */
const TEXT_PROPS = {
  label: undefined,
  count: subtleText,
  caption: subtleText,
  aggregate: { ms: "auto" },
} as const;

/** Inline text in the kit's type. */
function Text({ kind, ...rest }: Readonly<KitGroupTextProps>) {
  "use no memo";
  return <ChakraText as="span" {...TEXT_PROPS[kind]} {...rest} />;
}

function Card({
  compact: _compact,
  head,
  aggregates,
  ...data
}: Readonly<KitGroupCardProps>) {
  "use no memo";
  return (
    <ChakraCard.Root {...data} variant="outline" fontWeight="semibold">
      <ChakraCard.Body>
        {head}
        {aggregates}
      </ChakraCard.Body>
    </ChakraCard.Root>
  );
}

const LINE = { display: "flex", alignItems: "center", gap: "0.5rem" } as const;

const LOOK: KitGroupLook = {
  row: { fontWeight: 600 },
  labelCell: {},
  head: { ...LINE, width: "100%" },
  cardHead: LINE,
  cardAggregate: { ...LINE, marginTop: "0.25rem" },
};

const useLook = (): KitGroupLook => LOOK;

export const { GroupHeaderRow, GroupHeaderCard } =
  /* @__PURE__ */ createGroupHeader({
    Row,
    Cell,
    Checkbox,
    Toggle,
    Text,
    Card,
    MoreButton: GroupMoreButton,
    useLook,
  });
