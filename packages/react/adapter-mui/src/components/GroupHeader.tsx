/** Group rows and cards, drawn by the binding with MUI's elements. */
import {
  createGroupHeader,
  type KitGroupCardProps,
  type KitGroupLook,
  type KitGroupTextProps,
  type KitGroupToggleProps,
} from "@adapttable/react/adapter";
import {
  Box,
  Card as MuiCard,
  CardContent,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";

import { Cell, Checkbox, Row } from "./DesktopTable";
import { GroupMoreButton } from "./kitControls";

function GroupChevron({ expanded }: Readonly<{ expanded: boolean }>) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        transition: "transform 150ms",
        transform: expanded ? "rotate(90deg)" : undefined,
      }}
    >
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Box>
  );
}

function Toggle({ expanded, label, onToggle }: Readonly<KitGroupToggleProps>) {
  "use no memo";
  return (
    <IconButton
      size="small"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      onClick={onToggle}
    >
      <GroupChevron expanded={expanded} />
    </IconButton>
  );
}

const SEMIBOLD = { fontWeight: 600 } as const;
const AT_END = { marginInlineStart: "auto" } as const;

/** The type each group text adds over body2. */
const TEXT_SX = { label: SEMIBOLD, aggregate: AT_END } as const;

/** Body type throughout; the label semibold, the count and captions muted. */
function Text({ kind, style, ...rest }: Readonly<KitGroupTextProps>) {
  "use no memo";
  if (kind === "aggregate" && style)
    return <Box component="span" style={style} {...rest} />;
  return (
    <Typography
      component="span"
      variant="body2"
      color={
        kind === "count" || kind === "caption" ? "text.secondary" : undefined
      }
      sx={kind === "label" || kind === "aggregate" ? TEXT_SX[kind] : undefined}
      style={style}
      {...rest}
    />
  );
}

const COMPACT_CONTENT = { p: 1.25, "&:last-child": { pb: 1.25 } } as const;

function Card({
  compact,
  head,
  aggregates,
  ...data
}: Readonly<KitGroupCardProps>) {
  "use no memo";
  return (
    <MuiCard {...data} variant="outlined">
      <CardContent sx={compact ? COMPACT_CONTENT : undefined}>
        {head}
        {aggregates}
      </CardContent>
    </MuiCard>
  );
}

function useLook(): KitGroupLook {
  const theme = useTheme();
  const gap = theme.spacing(1);
  return {
    row: {},
    labelCell: SEMIBOLD,
    head: { display: "inline-flex", alignItems: "center", gap, width: "100%" },
    cardHead: {
      display: "inline-flex",
      alignItems: "center",
      gap,
      fontWeight: 600,
    },
    cardAggregate: { display: "flex", gap, marginTop: theme.spacing(0.5) },
  };
}

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
