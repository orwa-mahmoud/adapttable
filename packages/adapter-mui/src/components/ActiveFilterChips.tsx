/** Removable chips for the active filters. */
import { type ActiveFilterChip, type TableLabels } from "@adapttable/core";
import {
  alpha,
  Button,
  Chip,
  IconButton,
  Stack,
  type SxProps,
  type Theme,
} from "@mui/material";

/**
 * Reproduces `MuiChip-deleteIcon` at `size="small"` — the glyph size, the 4px
 * gaps either side and the hover tint — on a control that is a real button.
 * MUI's own `deleteIcon` is decoration cloned into a chip root that already
 * carries `role="button"`, so it cannot be one.
 */
const removeButtonSx: SxProps<Theme> = {
  p: 0,
  ml: "4px",
  mr: "-4px",
  fontSize: 16,
  color: (theme) => alpha(theme.palette.text.primary, 0.26),
  "&:hover": {
    backgroundColor: "transparent",
    color: (theme) => alpha(theme.palette.text.primary, 0.4),
  },
};

/** Removable MUI chips. */
export function Chips({
  chips,
  onClearAll,
  labels,
}: Readonly<{
  chips: readonly ActiveFilterChip[];
  onClearAll: () => void;
  labels: Required<TableLabels>;
}>) {
  if (chips.length === 0) return null;
  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      component="ul"
      aria-label={labels.filters}
      sx={{ listStyle: "none", p: 0, m: 0, flexWrap: "wrap" }}
    >
      {chips.map((chip) => (
        <li key={chip.key}>
          <Chip
            size="small"
            label={
              <>
                {chip.label}
                <IconButton
                  disableRipple
                  aria-label={`${labels.clearAll}: ${chip.label}`}
                  onClick={chip.onRemove}
                  sx={removeButtonSx}
                >
                  ×
                </IconButton>
              </>
            }
          />
        </li>
      ))}
      <li>
        <Button size="small" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </li>
    </Stack>
  );
}
