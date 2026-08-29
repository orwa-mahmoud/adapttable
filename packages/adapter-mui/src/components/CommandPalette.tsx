import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "@adapttable/core/adapter";
import { Dialog, InputBase, ListItemButton, Typography } from "@mui/material";

/**
 * The kit's own dialog, holding core's combobox.
 *
 * The dialog is the kit's — its backdrop, its portal, its entrance — while
 * the input, the list and the highlight belong to core, because a palette
 * is a combobox over a listbox and no kit ships that shape. Splitting it
 * this way means the palette looks like the rest of the app and behaves the
 * same in all nine kits.
 */
function Surface({
  label,
  onClose,
  children,
  className,
}: CommandPaletteSurfaceProps) {
  return (
    <Dialog
      open
      onClose={onClose}
      // Core moves focus into the search box and owns the trap; MUI's own
      // autofocus and focus enforcement would take it straight back.
      disableAutoFocus
      disableEnforceFocus
      fullWidth
      maxWidth="sm"
      className={className}
      data-adapttable-part="command-palette"
      // The name goes on the PAPER, not on `Dialog`: MUI spreads unrecognised
      // props onto its Modal root, which it marks `role="presentation"`, and a
      // name there is discarded. `role="dialog"` is on the paper.
      slotProps={{ paper: { "aria-label": label, sx: { p: 1 } } }}
    >
      {children}
    </Dialog>
  );
}

function Input({ inputProps }: CommandPaletteInputProps) {
  const { onChange, ref, ...bind } = inputProps;
  return (
    <InputBase
      fullWidth
      sx={{ px: 1, py: 0.5 }}
      // The bindings go to the inner element, not to InputBase's wrapper:
      // MUI renders a div around the real input, and a part name or a key
      // handler left on the wrapper is on something that never has focus.
      inputRef={ref}
      slotProps={{ input: bind }}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

function Item({ command, active, itemProps }: CommandPaletteItemProps) {
  return (
    // `ListItemButton`, not `MenuItem`: the list is core's listbox, and a
    // MUI MenuItem requires a MenuList ancestor it will not find here.
    <ListItemButton
      {...itemProps}
      selected={active}
      disabled={command.disabled}
      dense
    >
      {command.label}
    </ListItemButton>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ p: 1 }}
      data-adapttable-part="command-empty"
    >
      {message}
    </Typography>
  );
}

const slots: CommandPaletteSlots = { Surface, Input, Item, Empty };

/** mui-owned command palette. */
export function CommandPalette(
  props: Readonly<Omit<CommandPaletteChromeProps, "slots">>
) {
  return <CommandPaletteChrome {...props} slots={slots} />;
}
