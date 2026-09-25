import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "@adapttable/react/adapter";

import { Button } from "../ui";

/**
 * The kit's own dialog, holding core's combobox.
 *
 * The dialog is the kit's — its backdrop, its portal, its entrance — while
 * the input, the list and the highlight belong to core, because a palette
 * is a combobox over a listbox and no kit ships that shape. Splitting it
 * this way means the palette looks like the rest of the app and behaves the
 * same in all nine kits.
 */
function Surface({ label, children, className }: CommandPaletteSurfaceProps) {
  return (
    <div
      // No part name: four kits paint this with their own Dialog's
      // backdrop and could not tag it, so it is not contract.
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 1000,
      }}
      // A scrim, not a control: the dialog inside owns every interaction and
      // Escape closes from there. It carries no role at all — `presentation`
      // is ignored on an element with focusable descendants, so declaring it
      // over a dialog says something ARIA will not honour.
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={className}
        data-adapttable-part="command-palette"
        style={{ minWidth: 360, maxWidth: 520, width: "100%%" }}
      >
        {children}
      </div>
    </div>
  );
}

function Input_({ inputProps }: CommandPaletteInputProps) {
  const { onChange, ref, ...rest } = inputProps;
  return (
    <input
      {...rest}
      ref={ref}
      style={{ width: "100%%", padding: 8 }}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

function Item({ command, active, itemProps }: CommandPaletteItemProps) {
  return (
    <Button
      {...itemProps}
      variant={active ? "soft" : "ghost"}
      size="2"
      disabled={command.disabled}
    >
      {command.label}
    </Button>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  return (
    <p data-adapttable-part="command-empty" style={{ opacity: 0.7 }}>
      {message}
    </p>
  );
}

const slots: CommandPaletteSlots = { Surface, Input: Input_, Item, Empty };

/** base-ui-owned command palette. */
export function CommandPalette(
  props: Readonly<Omit<CommandPaletteChromeProps, "slots">>
) {
  return <CommandPaletteChrome {...props} slots={slots} />;
}
