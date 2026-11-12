/** The mobile card list, drawn by the binding with MUI's cards. */
import {
  createMobileCards,
  type KitCardRegions,
  type KitCardSelectProps,
  type KitCardsLook,
  type KitCardTextProps,
  type KitSummaryField,
} from "@adapttable/react/adapter";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import type { CSSProperties, ReactNode } from "react";

import { RowActionButtons } from "./RowActionButtons";

const COMPACT_CONTENT = { p: 1.25, "&:last-child": { pb: 1.25 } } as const;

/** A card's content: its controls, fields and actions one after another. */
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
    <CardContent sx={compact ? COMPACT_CONTENT : undefined}>
      {tree}
      {select}
      {expand}
      {body}
      {reorder}
      {rowEdit}
      {actions}
      {detail}
    </CardContent>
  );
}

function FieldLabel({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "block" }}
      {...rest}
    />
  );
}

/** Cells are any React node, often block elements, so the value is a div. */
function FieldValue({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <Typography component="div" variant="body2" {...rest} />;
}

const SELECT_TARGET: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  alignItems: "center",
};

function Select({
  checked,
  onToggle,
  "aria-label": label,
}: Readonly<KitCardSelectProps>) {
  "use no memo";
  return (
    <Checkbox
      style={SELECT_TARGET}
      slotProps={{ input: { "aria-label": label } }}
      checked={checked}
      onChange={onToggle}
    />
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
      variant="outlined"
      role="listitem"
    >
      <CardContent sx={compact ? COMPACT_CONTENT : undefined}>
        {fields.map(({ key, label, value }) => (
          <Box
            key={key}
            data-adapttable-part="card-row"
            sx={{ mb: compact ? 0.5 : 1 }}
          >
            {label && (
              <Typography
                data-adapttable-part="card-label"
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                {label}
              </Typography>
            )}
            <Typography component="div" variant="body2">
              {value}
            </Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
  gap: "0.75rem",
  minWidth: 0,
};

function useLook(): KitCardsLook {
  const theme = useTheme();
  const hover = (theme.vars ?? theme).palette.action.hover;
  const radius = theme.shape.borderRadius;
  return {
    grid: () => GRID,
    field: (labelled) => ({
      minWidth: 0,
      overflowWrap: "anywhere",
      gridColumn: labelled ? undefined : "1 / -1",
      backgroundColor: labelled ? hover : undefined,
      borderRadius: radius,
      padding: labelled ? theme.spacing(1) : 0,
    }),
    actions: {},
    detail: { marginTop: theme.spacing(1) },
  };
}

function CardHost(props: {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  readonly "data-passthrough"?: string;
  readonly "data-adapttable-part"?: string;
}) {
  "use no memo";
  if (props["data-adapttable-part"] === "virtual-spacer") {
    return <Box aria-hidden sx={{ height: props.style?.height }} />;
  }
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  return <Card {...props} />;
}

/** Mobile rendering: one MUI Card per row with labelled fields. */
export const MobileCards = /* @__PURE__ */ createMobileCards<{
  readonly size: "small" | "medium";
  readonly cardClassName?: string;
}>({
  CardFrame,
  FieldLabel,
  FieldValue,
  Select,
  RowActions: RowActionButtons,
  SummaryCard,
  summaryPlacement: "last-card",
  useLook,
  compact: (props) => props.size === "small",
  cardProps: (entry, props) => ({
    variant: "outlined",
    className:
      [props.cardClassName, entry.rowClass].filter(Boolean).join(" ") ||
      undefined,
  }),
  extraCell: (part, content) => (
    <CardContent data-adapttable-part={part}>{content}</CardContent>
  ),
  useChrome: (props, compact) => ({
    hosts: { List: Stack, Card: CardHost },
    listProps: {
      spacing: compact ? 1 : 1.5,
      role: "list",
      "aria-label": props.table.getTableProps()["aria-label"],
    },
    listStyle: { margin: undefined, padding: undefined },
  }),
});
