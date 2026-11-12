/** Group rows and cards, drawn by the binding with Base UI's elements. */
import {
  createGroupHeader,
  ExpandChevron,
  type KitGroupCardProps,
  type KitGroupLook,
  type KitGroupTextProps,
  type KitGroupToggleProps,
} from "@adapttable/react/adapter";

import { Card as UiCard, IconButton, Text as UiText } from "../ui";
import { Cell, Row } from "./DesktopTable";
import { GroupMoreButton } from "./kitControls";
import { Checkbox } from "./kitPrimitives";

function Toggle({ expanded, label, onToggle }: Readonly<KitGroupToggleProps>) {
  "use no memo";
  return (
    <IconButton
      size="1"
      variant="ghost"
      color="gray"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      onClick={onToggle}
    >
      <ExpandChevron open={expanded} />
    </IconButton>
  );
}

const AT_END = { marginInlineStart: "auto" } as const;

/** Inline text; the count and a subtotal's caption are muted. */
function Text({ kind, style, ...rest }: Readonly<KitGroupTextProps>) {
  "use no memo";
  if (kind === "count" || kind === "caption")
    return <UiText as="span" color="gray" size="2" style={style} {...rest} />;
  return (
    <UiText
      as="span"
      style={kind === "aggregate" ? { ...AT_END, ...style } : style}
      {...rest}
    />
  );
}

const SEMIBOLD = { fontWeight: 600 } as const;

function Card({
  compact: _compact,
  head,
  aggregates,
  ...data
}: Readonly<KitGroupCardProps>) {
  "use no memo";
  return (
    <UiCard {...data} style={SEMIBOLD}>
      {head}
      {aggregates}
    </UiCard>
  );
}

const LINE = { display: "flex", alignItems: "center", gap: "0.5rem" } as const;

const LOOK: KitGroupLook = {
  row: SEMIBOLD,
  labelCell: {},
  head: { ...LINE, width: "100%" },
  cardHead: LINE,
  cardAggregate: { display: "flex", gap: "0.5rem" },
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
