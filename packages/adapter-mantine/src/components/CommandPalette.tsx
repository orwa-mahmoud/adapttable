import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "@adapttable/react/adapter";
import { Modal, Text, TextInput, UnstyledButton } from "@mantine/core";

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
    // The compound API, not the shorthand: `Modal` puts every prop on its
    // ROOT, which is a zero-size wrapper. The part name has to land on the
    // element a user sees, as it does in every other kit.
    <Modal.Root
      opened
      onClose={onClose}
      // Core owns the focus trap and moves focus into the search box;
      // Mantine's own trap would take it straight back to the surface.
      trapFocus={false}
    >
      <Modal.Overlay />
      <Modal.Content
        aria-label={label}
        className={className}
        data-adapttable-part="command-palette"
      >
        <Modal.Header>
          <Modal.Title>{label}</Modal.Title>
          <Modal.CloseButton />
        </Modal.Header>
        <Modal.Body>{children}</Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}

function Input({ inputProps }: CommandPaletteInputProps) {
  const { onChange, ref, ...rest } = inputProps;
  return (
    <TextInput
      {...rest}
      ref={ref}
      mb="xs"
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
    />
  );
}

function Item({ command, active, itemProps }: CommandPaletteItemProps) {
  return (
    <UnstyledButton
      {...itemProps}
      display="block"
      w="100%"
      p="xs"
      bg={active ? "var(--mantine-color-default-hover)" : undefined}
      opacity={command.disabled === true ? 0.5 : undefined}
    >
      {command.label}
    </UnstyledButton>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  return (
    <Text size="sm" c="dimmed" p="xs" data-adapttable-part="command-empty">
      {message}
    </Text>
  );
}

const slots: CommandPaletteSlots = { Surface, Input, Item, Empty };

/** mantine-owned command palette. */
export function CommandPalette(
  props: Readonly<Omit<CommandPaletteChromeProps, "slots">>
) {
  return <CommandPaletteChrome {...props} slots={slots} />;
}
