import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "@adapttable/react/adapter";
import { Input, Typography } from "antd";

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
    <Input
      {...rest}
      // antd's Input exposes an `InputRef`, not the element, so the ref
      // core hands down is attached to the DOM node underneath it.
      ref={(instance) => {
        ref(instance?.input ?? null);
      }}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

function Item({ command, active, itemProps }: CommandPaletteItemProps) {
  return (
    <div
      {...itemProps}
      style={{
        padding: "6px 8px",
        borderRadius: 6,
        cursor: "pointer",
        background: active ? "rgba(0,0,0,0.06)" : undefined,
        opacity: command.disabled === true ? 0.5 : undefined,
      }}
    >
      {command.label}
    </div>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  return (
    <Typography.Text type="secondary" data-adapttable-part="command-empty">
      {message}
    </Typography.Text>
  );
}

const slots: CommandPaletteSlots = { Surface, Input: Input_, Item, Empty };

/** antd-owned command palette. */
export function CommandPalette(
  props: Readonly<Omit<CommandPaletteChromeProps, "slots">>
) {
  return <CommandPaletteChrome {...props} slots={slots} />;
}
