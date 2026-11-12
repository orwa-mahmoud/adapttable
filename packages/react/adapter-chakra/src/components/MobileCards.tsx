/** The card list, drawn by the binding with Chakra's cards. */
import {
  createMobileCards,
  type KitCardRegions,
  type KitCardSelectProps,
  type KitCardsLook,
  type KitCardTextProps,
  type KitMobileCardsProps,
  type KitSummaryField,
} from "@adapttable/react/adapter";
import { Box, Card, Stack, Text } from "@chakra-ui/react";
import {
  createContext,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";

import { subtleText } from "../styles";
import { Checkbox } from "./primitives";
import { RowActionButtons } from "./RowActionButtons";

/** The card class the host gave, for the summary card the binding draws. */
const CardClass = createContext<string | undefined>(undefined);

/** A card's content: its controls, fields, detail, editor and actions. */
function CardFrame({
  tree,
  select,
  expand,
  body,
  reorder,
  rowEdit,
  actions,
  detail,
  compact,
}: Readonly<KitCardRegions>) {
  "use no memo";
  return (
    <Card.Body p={compact ? 3 : 4}>
      {tree}
      {select}
      {expand && <Box mb={2}>{expand}</Box>}
      {body}
      {reorder}
      {detail}
      {rowEdit}
      {actions}
    </Card.Body>
  );
}

function FieldLabel({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <Text fontSize="xs" {...subtleText} {...rest} />;
}

/** Cells are any React node, often block elements, so the value is a div. */
function FieldValue({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <Text as="div" fontSize="sm" {...rest} />;
}

function Select({
  checked,
  onToggle,
  "aria-label": label,
}: Readonly<KitCardSelectProps>) {
  "use no memo";
  return (
    <Checkbox aria-label={label} checked={checked} onToggle={onToggle} mb={2} />
  );
}

function SummaryCard({
  fields,
  compact,
}: Readonly<{ fields: readonly KitSummaryField[]; compact: boolean }>) {
  "use no memo";
  return (
    <Card.Root
      data-adapttable-part="summary-card"
      variant="outline"
      role="listitem"
      className={useContext(CardClass)}
    >
      <Card.Body p={compact ? 3 : 4}>
        {fields.map(({ key, label, value }) => (
          <Box key={key} data-adapttable-part="card-row" mb={compact ? 1 : 2}>
            {label && (
              <Text
                data-adapttable-part="card-label"
                fontSize="xs"
                {...subtleText}
                textTransform="uppercase"
              >
                {label}
              </Text>
            )}
            <Text fontSize="sm" fontWeight="semibold">
              {value}
            </Text>
          </Box>
        ))}
      </Card.Body>
    </Card.Root>
  );
}

const LOOK: KitCardsLook = {
  grid: (compact) => ({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
    gap: compact ? "0.5rem" : "0.75rem",
    minWidth: 0,
  }),
  field: (labelled, compact) => ({
    minWidth: 0,
    overflowWrap: "anywhere",
    gridColumn: labelled ? undefined : "1 / -1",
    background: labelled ? "var(--chakra-colors-bg-muted)" : undefined,
    borderRadius: "var(--chakra-radii-md)",
    ...(labelled ? { padding: compact ? "0.375rem" : "0.5rem" } : undefined),
  }),
  actions: {},
  detail: { paddingTop: "0.25rem" },
};

const useLook = (): KitCardsLook => LOOK;

/**
 * Stable list elements. A spacer stays a plain box, and a group card already
 * draws its own surface, so it is not wrapped again.
 */
function CardHost(props: {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  readonly "data-passthrough"?: string;
  readonly "data-adapttable-part"?: string;
}) {
  "use no memo";
  if (props["data-adapttable-part"] === "virtual-spacer") {
    const height = props.style?.height;
    return <Box aria-hidden h={height == null ? undefined : `${height}px`} />;
  }
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  return <Card.Root {...props} />;
}

interface ChakraCardsProps {
  readonly size: "sm" | "md" | "lg";
  /** Class hook for each card. */
  readonly className?: string;
}

const Cards = /* @__PURE__ */ createMobileCards<ChakraCardsProps>({
  CardFrame,
  FieldLabel,
  FieldValue,
  Select,
  RowActions: RowActionButtons,
  SummaryCard,
  summaryPlacement: "after-list",
  useLook,
  compact: (props) => props.size === "sm",
  cardProps: (entry, props) => ({
    variant: "outline",
    className:
      [props.className, entry.rowClass].filter(Boolean).join(" ") || undefined,
  }),
  extraCell: (part, content) => (
    <Card.Body data-adapttable-part={part}>{content}</Card.Body>
  ),
  useChrome: (props, compact) => ({
    hosts: { List: Stack, Card: CardHost },
    listProps: {
      gap: compact ? 2 : 3,
      role: "list",
      "aria-label": props.table.getTableProps()["aria-label"],
    },
    listStyle: { margin: undefined, padding: undefined },
  }),
});

/** Mobile Chakra card list. */
export function MobileCards<TRow>(
  props: Readonly<KitMobileCardsProps<TRow, ChakraCardsProps>>
): ReactElement {
  "use no memo";
  return (
    <CardClass.Provider value={props.className}>
      <Cards {...props} />
    </CardClass.Provider>
  );
}
