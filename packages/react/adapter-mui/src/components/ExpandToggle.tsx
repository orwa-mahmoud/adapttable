import { Box, IconButton } from "@mui/material";

/** Inline chevron pointing at the reading end; rotates down when open. */
export function ExpandChevron({
  expanded,
  dir,
}: Readonly<{ expanded: boolean; dir?: "ltr" | "rtl" }>) {
  let transform: string | undefined;
  if (expanded) transform = "rotate(90deg)";
  else if (dir === "rtl") transform = "rotate(180deg)";
  return (
    <Box
      component="span"
      aria-hidden
      sx={{ display: "inline-flex", transition: "transform 150ms", transform }}
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

/** The per-row expand/collapse chevron button (desktop cell + mobile card). */
export function ExpandToggle({
  id,
  expanded,
  onToggle,
  dir,
  expandLabel,
  collapseLabel,
}: Readonly<{
  id: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  dir?: "ltr" | "rtl";
  expandLabel: string;
  collapseLabel: string;
}>) {
  return (
    <IconButton
      size="small"
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={() => onToggle(id)}
    >
      <ExpandChevron expanded={expanded} dir={dir} />
    </IconButton>
  );
}
