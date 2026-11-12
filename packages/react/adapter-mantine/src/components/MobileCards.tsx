/** The mobile card list, drawn by the binding with Mantine's cards. */
import {
  createMobileCards,
  type KitCardRegions,
  type KitCardSelectProps,
  type KitCardsLook,
  type KitCardTextProps,
  type KitSummaryField,
} from "@adapttable/react/adapter";
import { Card, Checkbox, Group, Stack, Text } from "@mantine/core";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useId,
} from "react";

import type { Density } from "../density";
import { RowActionButtons } from "./RowActionButtons";

/** The space between a card's regions, and between its fields. */
const gapOf = (compact: boolean): number | "xs" => (compact ? 4 : "xs");

const cssGap = (gap: number | "xs"): string | number =>
  typeof gap === "number" ? gap : `var(--mantine-spacing-${gap})`;

/**
 * A card: its tree, select and expand controls in a header row, then the
 * fields, reordering, the detail, the row editor and the actions.
 */
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
    <Stack gap={gapOf(compact)}>
      {(tree ?? select ?? expand) && (
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs">
            {tree}
            {select}
          </Group>
          {expand}
        </Group>
      )}
      {body}
      {reorder}
      {detail}
      {rowEdit}
      {actions}
    </Stack>
  );
}

function FieldLabel({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <Text fz="xs" c="var(--mantine-color-text)" fw={500} {...rest} />;
}

/** Cells are any React node, often block elements, so the value is a div. */
function FieldValue({ labelled, ...rest }: Readonly<KitCardTextProps>) {
  "use no memo";
  return (
    <Text
      component="div"
      fz={labelled ? "sm" : "md"}
      fw={labelled ? undefined : 600}
      {...rest}
    />
  );
}

const SELECT_TARGET: CSSProperties = {
  display: "inline-flex",
  minWidth: 44,
  minHeight: 44,
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

/** The checkbox inside a whole 44 px label, so a thumb finds it. */
function Select({
  checked,
  onToggle,
  "aria-label": label,
}: Readonly<KitCardSelectProps>) {
  "use no memo";
  const id = useId();
  return (
    <label htmlFor={id} style={SELECT_TARGET}>
      <Checkbox
        id={id}
        aria-label={label}
        checked={checked}
        onChange={onToggle}
        styles={{
          body: { minHeight: 44, alignItems: "center" },
          input: { cursor: "pointer" },
        }}
      />
    </label>
  );
}

function SummaryCard({
  fields,
  compact,
}: Readonly<{ fields: readonly KitSummaryField[]; compact: boolean }>) {
  "use no memo";
  return (
    <Card
      data-adapttable-part="summary-card"
      withBorder
      radius="md"
      padding={compact ? "sm" : "md"}
      role="listitem"
    >
      <Stack gap={gapOf(compact)}>
        {fields.map(({ key, label, value }) => (
          <div key={key} data-adapttable-part="card-row">
            {label && (
              <Text
                data-adapttable-part="card-label"
                fz="xs"
                c="dimmed"
                tt="uppercase"
                fw={500}
              >
                {label}
              </Text>
            )}
            <Text component="div" fz="sm" fw={600}>
              {value}
            </Text>
          </div>
        ))}
      </Stack>
    </Card>
  );
}

const LOOK: KitCardsLook = {
  grid: (compact) => ({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
    gap: cssGap(gapOf(compact)),
  }),
  field: (labelled) => ({
    minWidth: 0,
    overflowWrap: "anywhere",
    gridColumn: labelled ? undefined : "1 / -1",
    borderRadius: "var(--mantine-radius-sm)",
    padding: labelled ? "var(--mantine-spacing-xs)" : 0,
    background: labelled ? "var(--mantine-color-default-hover)" : undefined,
  }),
  actions: {
    paddingTop: "var(--mantine-spacing-sm)",
    borderTop: "1px solid var(--mantine-color-default-border)",
  },
  detail: {},
};

const useLook = (): KitCardsLook => LOOK;

function CardHost(props: {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  readonly "data-passthrough"?: string;
  readonly "data-adapttable-part"?: string;
}) {
  "use no memo";
  if (props["data-adapttable-part"] === "virtual-spacer") {
    return <div aria-hidden style={{ height: props.style?.height }} />;
  }
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  return <Card {...props} />;
}

/** Mobile rendering: one Mantine Card per row with labelled key/value rows. */
export const MobileCards = /* @__PURE__ */ createMobileCards<{
  readonly bodyRef: RefObject<HTMLDivElement | null>;
  readonly className?: string;
  readonly density?: Density;
}>({
  CardFrame,
  FieldLabel,
  FieldValue,
  Select,
  RowActions: RowActionButtons,
  SummaryCard,
  summaryPlacement: "after-list",
  useLook,
  compact: (props) => props.density === "compact",
  cardProps: (entry, props) => ({
    style: {
      borderColor: entry.selected
        ? "var(--mantine-primary-color-filled)"
        : undefined,
      ...entry.itemProps.style,
    },
    className: entry.rowClass,
    withBorder: true,
    radius: "md",
    padding: props.density === "compact" ? "sm" : "md",
  }),
  extraCell: (part, content) => (
    <div data-adapttable-part={part}>{content}</div>
  ),
  useChrome: (props, compact) => ({
    classNames: { cards: props.className },
    hosts: { List: Stack, Card: CardHost },
    listProps: {
      gap: compact ? "xs" : "sm",
      ref: props.bodyRef,
      ...props.table.getTableProps({ role: "list" }),
    },
    listStyle: { margin: undefined, padding: undefined },
  }),
});
