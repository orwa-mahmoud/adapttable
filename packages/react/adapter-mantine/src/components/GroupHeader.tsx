/** Group rows and cards, drawn by the binding with Mantine's elements. */
import {
  createGroupHeader,
  type KitGroupCardProps,
  type KitGroupLook,
  type KitGroupTextProps,
  type KitGroupToggleProps,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Card as MantineCard,
  Text as MantineText,
} from "@mantine/core";

import { ChevronRightIcon } from "../icons";
import { Cell, Checkbox, Row } from "./DesktopTable";
import { GroupMoreButton } from "./kitControls";

function Toggle({ expanded, label, onToggle }: Readonly<KitGroupToggleProps>) {
  "use no memo";
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="sm"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      onClick={onToggle}
    >
      <ChevronRightIcon
        size={14}
        style={{
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 150ms ease",
        }}
      />
    </ActionIcon>
  );
}

/** The label semibold, count and captions dimmed, subtotals at the end. */
function Text({ kind, style, ...rest }: Readonly<KitGroupTextProps>) {
  "use no memo";
  const muted = kind === "count" || kind === "caption";
  return (
    <MantineText
      component="span"
      fw={kind === "label" ? 600 : undefined}
      c={muted ? "dimmed" : undefined}
      fz={muted ? "sm" : undefined}
      ms={kind === "aggregate" ? "auto" : undefined}
      style={style}
      {...rest}
    />
  );
}

/** A group card: a bordered list item; its padding does not follow density. */
function Card({
  compact: _compact,
  head,
  aggregates,
  ...data
}: Readonly<KitGroupCardProps>) {
  "use no memo";
  return (
    <MantineCard
      {...data}
      role="listitem"
      withBorder
      radius="md"
      padding="md"
      fw={600}
    >
      {head}
      {aggregates}
    </MantineCard>
  );
}

const LINE = {
  display: "flex",
  alignItems: "center",
  flexWrap: "nowrap",
  gap: "var(--mantine-spacing-xs)",
} as const;

const LOOK: KitGroupLook = {
  row: { fontWeight: 600 },
  labelCell: {},
  head: LINE,
  cardHead: LINE,
  cardAggregate: { ...LINE, marginTop: "var(--mantine-spacing-xs)" },
};

export const { GroupHeaderRow, GroupHeaderCard } =
  /* @__PURE__ */ createGroupHeader({
    Row,
    Cell,
    Checkbox,
    Toggle,
    Text,
    Card,
    MoreButton: GroupMoreButton,
    useLook: () => LOOK,
  });
