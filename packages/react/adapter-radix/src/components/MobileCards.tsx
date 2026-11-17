/** The card list, drawn by the binding with Radix Themes' cards. */
import {
  createMobileCards,
  type KitCardRegions,
  type KitCardSelectProps,
  type KitCardsLook,
  type KitCardTextProps,
  type KitMobileCardsProps,
  type KitSummaryField,
} from "@adapttable/react/adapter";
import { Box, Card, Flex, Text } from "@radix-ui/themes";
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  type ReactElement,
  useContext,
  useId,
} from "react";

import { Checkbox } from "./primitives";
import { RowActionButtons } from "./RowActionButtons";

/** The card class the host gave, for the summary card the binding draws. */
const CardClass = createContext<string | undefined>(undefined);

/** A card's regions, straight inside the card. */
function CardFrame({
  tree,
  select,
  expand,
  body,
  reorder,
  rowEdit,
  actions,
  detail,
}: Readonly<KitCardRegions>) {
  "use no memo";
  return (
    <>
      {tree}
      {select}
      {expand && <Box mb="2">{expand}</Box>}
      {body}
      {reorder}
      {detail}
      {rowEdit}
      {actions}
    </>
  );
}

function FieldLabel({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <Text as="div" size="1" color="gray" {...rest} />;
}

/** Cells are any React node, often block elements, so the value is a div. */
function FieldValue({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <Text as="div" size="2" {...rest} />;
}

const SELECT_TARGET: CSSProperties = {
  display: "inline-flex",
  minWidth: 44,
  minHeight: 44,
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

/** The row's checkbox inside a 44 px label, so the whole target toggles it. */
function Select({
  checked,
  onToggle,
  "aria-label": label,
}: Readonly<KitCardSelectProps>) {
  "use no memo";
  const id = useId();
  return (
    <Box mb="2">
      <label htmlFor={id} style={SELECT_TARGET}>
        <Checkbox
          id={id}
          aria-label={label}
          checked={checked}
          onToggle={onToggle}
        />
      </label>
    </Box>
  );
}

const UPPERCASE: CSSProperties = { textTransform: "uppercase" };

function SummaryCard({
  fields,
  compact,
}: Readonly<{ fields: readonly KitSummaryField[]; compact: boolean }>) {
  "use no memo";
  return (
    <Card
      data-adapttable-part="summary-card"
      size={compact ? "1" : "2"}
      role="listitem"
      className={useContext(CardClass)}
    >
      {fields.map(({ key, label, value }) => (
        <Box key={key} data-adapttable-part="card-row" mb={compact ? "1" : "2"}>
          {label && (
            <Text
              data-adapttable-part="card-label"
              as="div"
              size="1"
              color="gray"
              style={UPPERCASE}
            >
              {label}
            </Text>
          )}
          <Text as="div" size="2" weight="bold">
            {value}
          </Text>
        </Box>
      ))}
    </Card>
  );
}

const LOOK: KitCardsLook = {
  grid: () => ({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
    gap: "0.75rem",
    minWidth: 0,
  }),
  field: (labelled) => ({
    minWidth: 0,
    overflowWrap: "anywhere",
    gridColumn: labelled ? undefined : "1 / -1",
    background: labelled ? "var(--gray-a2)" : undefined,
    borderRadius: "var(--radius-2)",
    padding: labelled ? "var(--space-2)" : undefined,
  }),
  actions: {},
  detail: { paddingTop: "var(--space-1)" },
};

const useLook = (): KitCardsLook => LOOK;

/**
 * Stable list elements. A spacer stays a plain box, and a group card already
 * draws its own surface, so it is not wrapped again.
 */
function CardHost(
  props: ComponentProps<typeof Card> & {
    readonly "data-passthrough"?: string;
    readonly "data-adapttable-part"?: string;
  }
) {
  "use no memo";
  if (props["data-adapttable-part"] === "virtual-spacer") {
    return <Box aria-hidden style={{ height: props.style?.height }} />;
  }
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  return <Card {...props} />;
}

interface RadixCardsProps {
  readonly size: "1" | "2" | "3";
  /** Class hook for each card. */
  readonly className?: string;
}

const Cards = /* @__PURE__ */ createMobileCards<RadixCardsProps>({
  CardFrame,
  FieldLabel,
  FieldValue,
  Select,
  RowActions: RowActionButtons,
  SummaryCard,
  summaryPlacement: "after-list",
  useLook,
  compact: (props) => props.size === "1",
  cardProps: (entry, props) => ({
    size: props.size === "1" ? "1" : "2",
    className:
      [props.className, entry.rowClass].filter(Boolean).join(" ") || undefined,
  }),
  extraCell: (part, content) => (
    <Box data-adapttable-part={part}>{content}</Box>
  ),
  useChrome: (props, compact) => ({
    hosts: { List: Flex, Card: CardHost },
    listProps: {
      direction: "column",
      gap: compact ? "2" : "3",
      role: "list",
      "aria-label": props.table.getTableProps()["aria-label"],
    },
    listStyle: { margin: undefined, padding: undefined },
  }),
});

/** Mobile Radix Themes card list. */
export function MobileCards<TRow>(
  props: Readonly<KitMobileCardsProps<TRow, RadixCardsProps>>
): ReactElement {
  "use no memo";
  return (
    <CardClass.Provider value={props.className}>
      <Cards {...props} />
    </CardClass.Provider>
  );
}
