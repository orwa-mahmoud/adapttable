import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "@adapttable/react/adapter";
import { Dialog, Text, TextField } from "@radix-ui/themes";

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
}: Readonly<CommandPaletteSurfaceProps>) {
  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Content
        aria-label={label}
        className={className}
        data-adapttable-part="command-palette"
        maxWidth="480px"
      >
        <Dialog.Title>{label}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
}

function Input_({ inputProps }: CommandPaletteInputProps) {
  const { onChange, ref, ...rest } = inputProps;
  return (
    <TextField.Root
      {...rest}
      ref={ref}
      mb="2"
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

function Item({ command, active, itemProps }: CommandPaletteItemProps) {
  return (
    <Text
      as="div"
      {...itemProps}
      size="2"
      style={{
        padding: "6px 8px",
        borderRadius: 6,
        cursor: "pointer",
        background: active ? "var(--gray-a3)" : undefined,
        opacity: command.disabled === true ? 0.5 : undefined,
      }}
    >
      {command.label}
    </Text>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  return (
    <Text as="p" size="2" color="gray" data-adapttable-part="command-empty">
      {message}
    </Text>
  );
}

const slots: CommandPaletteSlots = { Surface, Input: Input_, Item, Empty };

/** radix-owned command palette. */
export function CommandPalette(
  props: Readonly<Omit<CommandPaletteChromeProps, "slots">>
) {
  return <CommandPaletteChrome {...props} slots={slots} />;
}
